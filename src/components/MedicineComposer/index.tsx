import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import type {
  BaseEventOrig,
  PickerDateProps,
  PickerSelectorProps,
  PickerTimeProps
} from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Input, Switch, Textarea } from '@taroify/core';

import {
  BEFORE_OPTIONS,
  DEFAULT_BEFORE,
  DEFAULT_INTERVAL,
  DEFAULT_REMIND_TIME,
  DOSAGE_UNIT_OPTIONS,
  MEDICINE_FORM_OPTIONS,
  REMINDER_STATUS,
  SCHEDULE_OPTIONS
} from '@/constants';
import { useDerivedById, useReminderActions } from '@/hooks/useReminders';
import type {
  DosageUnit,
  Medicine,
  MedicineForm,
  MedicineSchedule
} from '@/types';
import { calcNextDate, calcRemindDate, today } from '@/utils/dateUtils';
import { loadSettings } from '@/utils/storage';

import './index.scss';

interface MedicineComposerProps {
  medicineId?: string;
  defaultReminderEnabled?: boolean;
  footerExtra?: ReactNode;
  onSuccess: (medicine?: Medicine) => void;
  onCancel: () => void;
}

interface FormValues {
  name: string;
  spec: string;
  form: MedicineForm;
  expiryDate: string;
  note: string;
  dosagePerUse: number;
  dosageUnit: DosageUnit;
  timesPerDay: number;
  scheduleTiming: MedicineSchedule;
  scheduleTime: string;
  reminderEnabled: boolean;
  currentPrescriptionDate: string;
  intervalDays: number;
  remindAdvanceDays: number;
  remindTime: string;
}

type InputEvent = BaseEventOrig<{ value: string }>;
type TextareaEvent = BaseEventOrig<{ value: string }>;
type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;

const FORM_LABELS = MEDICINE_FORM_OPTIONS.map((option) => option.label);
const DOSAGE_LABELS = DOSAGE_UNIT_OPTIONS.map((option) => option);
const SCHEDULE_LABELS = SCHEDULE_OPTIONS.map((option) => option);
const BEFORE_LABELS = BEFORE_OPTIONS.map((value) => `${value} 天`);

function makeDefaults(defaultReminderEnabled = false): FormValues {
  const settings = loadSettings();

  return {
    name: '',
    spec: '',
    form: 'tablet',
    expiryDate: '',
    note: '',
    dosagePerUse: 1,
    dosageUnit: '片',
    timesPerDay: 1,
    scheduleTiming: '饭后',
    scheduleTime: '08:00',
    reminderEnabled: defaultReminderEnabled,
    currentPrescriptionDate: today(),
    intervalDays: DEFAULT_INTERVAL,
    remindAdvanceDays: settings.defaultBefore || DEFAULT_BEFORE,
    remindTime: settings.defaultTime || DEFAULT_REMIND_TIME
  };
}

function findIndexOrZero<T extends readonly unknown[]>(
  options: T,
  value: unknown
) {
  const index = options.findIndex((option) => option === value);
  return index >= 0 ? index : 0;
}

function normalizeRange(
  value: number,
  fallback: number,
  min: number,
  max: number
) {
  if (!Number.isFinite(value) || value < min || value > max) {
    return fallback;
  }

  return value;
}

export default function MedicineComposer({
  medicineId,
  defaultReminderEnabled = false,
  footerExtra,
  onSuccess,
  onCancel
}: MedicineComposerProps) {
  const isEdit = Boolean(medicineId);
  const existingItem = useDerivedById(medicineId ?? '');
  const { addReminder, updateReminder } = useReminderActions();

  const [values, setValues] = useState<FormValues>(() =>
    makeDefaults(defaultReminderEnabled)
  );
  const [intervalInput, setIntervalInput] = useState(() =>
    String(DEFAULT_INTERVAL)
  );

  useEffect(() => {
    if (isEdit && existingItem) {
      setValues({
        name: existingItem.name,
        spec: existingItem.spec,
        form: existingItem.form,
        expiryDate: existingItem.expiryDate,
        note: existingItem.note,
        dosagePerUse: existingItem.dosagePerUse,
        dosageUnit: existingItem.dosageUnit,
        timesPerDay: existingItem.timesPerDay,
        scheduleTiming: existingItem.scheduleTiming,
        scheduleTime: existingItem.scheduleTime || '08:00',
        reminderEnabled: existingItem.reminderEnabled,
        currentPrescriptionDate: existingItem.currentPrescriptionDate,
        intervalDays: existingItem.intervalDays,
        remindAdvanceDays: existingItem.remindAdvanceDays,
        remindTime: existingItem.remindTime
      });
      setIntervalInput(String(existingItem.intervalDays));
      return;
    }

    if (!isEdit) {
      const defaults = makeDefaults(defaultReminderEnabled);
      setValues(defaults);
      setIntervalInput(String(defaults.intervalDays));
    }
  }, [defaultReminderEnabled, existingItem, isEdit]);

  const formIndex = useMemo(
    () =>
      Math.max(
        0,
        MEDICINE_FORM_OPTIONS.findIndex(
          (option) => option.value === values.form
        )
      ),
    [values.form]
  );
  const dosageIndex = useMemo(
    () => findIndexOrZero(DOSAGE_UNIT_OPTIONS, values.dosageUnit),
    [values.dosageUnit]
  );
  const scheduleIndex = useMemo(
    () => findIndexOrZero(SCHEDULE_OPTIONS, values.scheduleTiming),
    [values.scheduleTiming]
  );
  const beforeIndex = useMemo(
    () => findIndexOrZero(BEFORE_OPTIONS, values.remindAdvanceDays),
    [values.remindAdvanceDays]
  );

  const calcText = useMemo(() => {
    if (values.intervalDays < 1 || values.intervalDays > 365) {
      return '请输入 1-365 之间的开药间隔';
    }

    const nextDate = calcNextDate(
      values.currentPrescriptionDate,
      values.intervalDays
    );
    const remindDate = calcRemindDate(nextDate, values.remindAdvanceDays);
    return `预计下次开药日期：${nextDate} · 提醒日：${remindDate.slice(5)} ${values.remindTime}`;
  }, [
    values.currentPrescriptionDate,
    values.intervalDays,
    values.remindAdvanceDays,
    values.remindTime
  ]);

  const setField = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (e: SelectorPickerEvent) => {
    const schedule = SCHEDULE_OPTIONS[Number(e.detail.value)];
    setValues((prev) => ({
      ...prev,
      scheduleTiming: schedule,
      scheduleTime:
        schedule === '固定时间' && !prev.scheduleTime
          ? '08:00'
          : prev.scheduleTime
    }));
  };

  const handleIntervalChange = (e: InputEvent) => {
    const nextValue = e.detail.value.replace(/\D/g, '');
    setIntervalInput(nextValue);
    setField('intervalDays', nextValue ? Number(nextValue) : 0);
  };

  const handleDosageChange = (e: InputEvent) => {
    const nextValue = e.detail.value.replace(/[^\d.]/g, '');
    setField('dosagePerUse', nextValue ? Number(nextValue) : 0);
  };

  const handleTimesChange = (e: InputEvent) => {
    const nextValue = e.detail.value.replace(/\D/g, '');
    setField('timesPerDay', nextValue ? Number(nextValue) : 0);
  };

  const handleSubmit = async () => {
    if (!values.name.trim()) {
      Taro.showToast({ title: '请填写药品名称', icon: 'none', duration: 1500 });
      return;
    }

    if (values.dosagePerUse <= 0) {
      Taro.showToast({
        title: '每次用量需大于 0',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    if (values.timesPerDay < 0 || values.timesPerDay > 6) {
      Taro.showToast({
        title: '每日次数需在 0-6 次之间',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    if (values.reminderEnabled) {
      if (values.intervalDays < 1 || values.intervalDays > 365) {
        Taro.showToast({
          title: '间隔天数需在 1-365 之间',
          icon: 'none',
          duration: 1500
        });
        return;
      }

      if (!values.currentPrescriptionDate) {
        Taro.showToast({
          title: '请选择最近开药日期',
          icon: 'none',
          duration: 1500
        });
        return;
      }

      if (!values.remindTime) {
        Taro.showToast({
          title: '请选择提醒时刻',
          icon: 'none',
          duration: 1500
        });
        return;
      }
    }

    const currentPrescriptionDate = values.currentPrescriptionDate || today();
    const intervalDays = values.reminderEnabled
      ? values.intervalDays
      : normalizeRange(values.intervalDays, DEFAULT_INTERVAL, 1, 365);
    const remindAdvanceDays = normalizeRange(
      values.remindAdvanceDays,
      DEFAULT_BEFORE,
      0,
      365
    );
    const remindTime = values.remindTime || DEFAULT_REMIND_TIME;
    const scheduleTime =
      values.scheduleTiming === '固定时间'
        ? values.scheduleTime || '08:00'
        : '';

    const payload = {
      name: values.name.trim(),
      spec: values.spec.trim(),
      form: values.form,
      expiryDate: values.expiryDate,
      note: values.note.trim(),
      dosagePerUse: values.dosagePerUse,
      dosageUnit: values.dosageUnit,
      timesPerDay: values.timesPerDay,
      scheduleTiming: values.scheduleTiming,
      scheduleTime,
      reminderEnabled: values.reminderEnabled,
      currentPrescriptionDate,
      intervalDays,
      remindAdvanceDays,
      remindTime
    };

    try {
      if (isEdit && medicineId) {
        await updateReminder(medicineId, payload);
        Taro.showToast({
          title: '药品已更新',
          icon: 'success',
          duration: 1500
        });
      } else {
        await addReminder({
          ...payload,
          status: REMINDER_STATUS.ACTIVE,
          prescriptionHistory: values.reminderEnabled
            ? [currentPrescriptionDate]
            : [],
          lastWechatReminderDate: '',
          lastWechatReminderAt: ''
        });
        Taro.showToast({
          title: values.reminderEnabled ? '开药提醒已创建' : '药品已保存到药箱',
          icon: 'success',
          duration: 1500
        });
      }

      onSuccess();
    } catch {
      Taro.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    }
  };

  return (
    <View className="medicine-composer">
      <View className="medicine-composer__notice">
        <Text className="medicine-composer__notice-desc">
          药品基础信息始终保存；开启开药提醒后，才进入首页风险中心和提醒列表。
        </Text>
      </View>

      <View className="medicine-composer__section">
        <Text className="medicine-composer__section-title">基础信息</Text>

        <View className="medicine-composer__field">
          <Text className="medicine-composer__label">
            药品名称
            <Text className="medicine-composer__required">*</Text>
          </Text>
          <View className="medicine-composer__input-row">
            <Input
              className="medicine-composer__input"
              value={values.name}
              placeholder="例如：洛拉替尼"
              clearable
              onChange={(e: InputEvent) => setField('name', e.detail.value)}
            />
          </View>
        </View>

        <View className="medicine-composer__grid">
          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">规格</Text>
            <View className="medicine-composer__input-row">
              <Input
                className="medicine-composer__input"
                value={values.spec}
                placeholder="例如：100mg"
                clearable
                onChange={(e: InputEvent) => setField('spec', e.detail.value)}
              />
            </View>
          </View>

          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">剂型</Text>
            <Picker
              mode="selector"
              range={FORM_LABELS}
              value={formIndex}
              onChange={(e: SelectorPickerEvent) => {
                const option = MEDICINE_FORM_OPTIONS[Number(e.detail.value)];
                setField('form', option.value);
              }}
            >
              <View className="medicine-composer__picker">
                <Text className="medicine-composer__picker-text">
                  {MEDICINE_FORM_OPTIONS[formIndex].label}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className="medicine-composer__field">
          <Text className="medicine-composer__label">过期时间</Text>
          <Picker
            mode="date"
            value={values.expiryDate || today()}
            onChange={(e: DatePickerEvent) =>
              setField('expiryDate', e.detail.value)
            }
          >
            <View className="medicine-composer__picker">
              <Text
                className={`medicine-composer__picker-text${
                  values.expiryDate
                    ? ''
                    : ' medicine-composer__picker-placeholder'
                }`}
              >
                {values.expiryDate || '未设置'}
              </Text>
            </View>
          </Picker>
        </View>
      </View>

      <View className="medicine-composer__section">
        <Text className="medicine-composer__section-title">用药信息</Text>

        <View className="medicine-composer__grid">
          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">每次用量</Text>
            <View className="medicine-composer__input-row">
              <Input
                className="medicine-composer__input"
                value={String(values.dosagePerUse || '')}
                type="digit"
                placeholder="例如：1"
                onChange={handleDosageChange}
              />
            </View>
          </View>

          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">单位</Text>
            <Picker
              mode="selector"
              range={DOSAGE_LABELS}
              value={dosageIndex}
              onChange={(e: SelectorPickerEvent) =>
                setField(
                  'dosageUnit',
                  DOSAGE_UNIT_OPTIONS[Number(e.detail.value)]
                )
              }
            >
              <View className="medicine-composer__picker">
                <Text className="medicine-composer__picker-text">
                  {values.dosageUnit}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className="medicine-composer__grid">
          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">每日次数</Text>
            <View className="medicine-composer__input-row">
              <Input
                className="medicine-composer__input"
                value={String(values.timesPerDay ?? '')}
                type="number"
                placeholder="0-6"
                onChange={handleTimesChange}
              />
            </View>
          </View>

          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">用药时机</Text>
            <Picker
              mode="selector"
              range={SCHEDULE_LABELS}
              value={scheduleIndex}
              onChange={handleScheduleChange}
            >
              <View className="medicine-composer__picker">
                <Text className="medicine-composer__picker-text">
                  {values.scheduleTiming}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        {values.scheduleTiming === '固定时间' ? (
          <View className="medicine-composer__field">
            <Text className="medicine-composer__label">具体时间点</Text>
            <Picker
              mode="time"
              value={values.scheduleTime || '08:00'}
              onChange={(e: TimePickerEvent) =>
                setField('scheduleTime', e.detail.value)
              }
            >
              <View className="medicine-composer__picker">
                <Text className="medicine-composer__picker-text">
                  {values.scheduleTime || '08:00'}
                </Text>
              </View>
            </Picker>
          </View>
        ) : null}
      </View>

      <View className="medicine-composer__section">
        <View className="medicine-composer__switch-row">
          <View className="medicine-composer__switch-copy">
            <Text className="medicine-composer__switch-title">开药提醒</Text>
            <Text className="medicine-composer__switch-desc">
              开启后会进入首页风险中心和提醒列表
            </Text>
          </View>
          <Switch
            className="medicine-composer__switch-control"
            checked={values.reminderEnabled}
            size={28}
            onChange={(checked) => setField('reminderEnabled', checked)}
          />
        </View>

        {values.reminderEnabled ? (
          <View className="medicine-composer__reminder-fields">
            <View className="medicine-composer__grid">
              <View className="medicine-composer__field">
                <Text className="medicine-composer__label">
                  最近开药日期
                  <Text className="medicine-composer__required">*</Text>
                </Text>
                <Picker
                  mode="date"
                  value={values.currentPrescriptionDate}
                  onChange={(e: DatePickerEvent) =>
                    setField('currentPrescriptionDate', e.detail.value)
                  }
                >
                  <View className="medicine-composer__picker">
                    <Text className="medicine-composer__picker-text">
                      {values.currentPrescriptionDate}
                    </Text>
                  </View>
                </Picker>
              </View>

              <View className="medicine-composer__field">
                <Text className="medicine-composer__label">
                  开药间隔
                  <Text className="medicine-composer__required">*</Text>
                </Text>
                <View className="medicine-composer__input-row">
                  <Input
                    className="medicine-composer__input"
                    value={intervalInput}
                    type="number"
                    placeholder="30"
                    onChange={handleIntervalChange}
                  />
                  <Text className="medicine-composer__suffix">天</Text>
                </View>
              </View>
            </View>

            <View className="medicine-composer__grid">
              <View className="medicine-composer__field">
                <Text className="medicine-composer__label">提前提醒天数</Text>
                <Picker
                  mode="selector"
                  range={BEFORE_LABELS}
                  value={beforeIndex}
                  onChange={(e: SelectorPickerEvent) =>
                    setField(
                      'remindAdvanceDays',
                      BEFORE_OPTIONS[Number(e.detail.value)]
                    )
                  }
                >
                  <View className="medicine-composer__picker">
                    <Text className="medicine-composer__picker-text">
                      {values.remindAdvanceDays} 天
                    </Text>
                  </View>
                </Picker>
              </View>

              <View className="medicine-composer__field">
                <Text className="medicine-composer__label">
                  提醒时刻
                  <Text className="medicine-composer__required">*</Text>
                </Text>
                <Picker
                  mode="time"
                  value={values.remindTime}
                  onChange={(e: TimePickerEvent) =>
                    setField('remindTime', e.detail.value)
                  }
                >
                  <View className="medicine-composer__picker">
                    <Text className="medicine-composer__picker-text">
                      {values.remindTime}
                    </Text>
                  </View>
                </Picker>
              </View>
            </View>

            <View className="medicine-composer__calc">
              <Text>{calcText}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View className="medicine-composer__field">
        <Text className="medicine-composer__label">备注</Text>
        <View className="medicine-composer__textarea">
          <Textarea
            className="medicine-composer__textarea-inner"
            value={values.note}
            placeholder="医院、复诊事项、注意事项"
            limit={100}
            onChange={(e: TextareaEvent) => setField('note', e.detail.value)}
          />
        </View>
      </View>

      {footerExtra ? (
        <View className="medicine-composer__footer-extra">{footerExtra}</View>
      ) : null}

      <View className="medicine-composer__actions">
        <Button className="medicine-composer__cancel" onClick={onCancel}>
          取消
        </Button>
        <Button
          className="medicine-composer__submit"
          color="primary"
          onClick={handleSubmit}
        >
          {isEdit
            ? '保存修改'
            : values.reminderEnabled
              ? '保存并开启提醒'
              : '保存到药箱'}
        </Button>
      </View>
    </View>
  );
}
