import { useEffect, useMemo, useState } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import type {
  BaseEventOrig,
  PickerDateProps,
  PickerSelectorProps,
  PickerTimeProps
} from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Input, Textarea } from '@taroify/core';

import {
  CHECKUP_BEFORE_OPTIONS,
  CHECKUP_STATUS,
  CHECKUP_TYPE_OPTIONS,
  DEFAULT_BEFORE,
  DEFAULT_REMIND_TIME
} from '@/constants';
import { useCheckupActions, useDerivedCheckupById } from '@/hooks/useCheckups';
import { useAllDerivedMedicines } from '@/hooks/useReminders';
import type { CheckupReminder, CheckupType } from '@/types';
import { calcCheckupRemindDate } from '@/utils/checkupUtils';
import { today } from '@/utils/dateUtils';

import './index.scss';

interface CheckupComposerProps {
  checkupId?: string;
  onSuccess: (checkup?: CheckupReminder) => void;
  onCancel: () => void;
}

interface FormValues {
  title: string;
  type: CheckupType;
  targetDate: string;
  remindAdvanceDays: number;
  remindTime: string;
  relatedMedicineIds: string[];
  hospital: string;
  note: string;
}

type InputEvent = BaseEventOrig<{ value: string }>;
type TextareaEvent = BaseEventOrig<{ value: string }>;
type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;

const TYPE_LABELS = CHECKUP_TYPE_OPTIONS.map((option) => option.label);
const BEFORE_LABELS = CHECKUP_BEFORE_OPTIONS.map((value) =>
  value === 0 ? '当天提醒' : `${value} 天前`
);

function makeDefaults(): FormValues {
  return {
    title: '',
    type: 'follow_up',
    targetDate: today(),
    remindAdvanceDays: DEFAULT_BEFORE,
    remindTime: DEFAULT_REMIND_TIME,
    relatedMedicineIds: [],
    hospital: '',
    note: ''
  };
}

function findIndexOrZero<T extends readonly unknown[]>(
  options: T,
  value: unknown
) {
  const index = options.findIndex((option) => option === value);
  return index >= 0 ? index : 0;
}

export default function CheckupComposer({
  checkupId,
  onSuccess,
  onCancel
}: CheckupComposerProps) {
  const isEdit = Boolean(checkupId);
  const existingItem = useDerivedCheckupById(checkupId ?? '');
  const medicines = useAllDerivedMedicines();
  const { addCheckup, updateCheckup } = useCheckupActions();
  const [values, setValues] = useState<FormValues>(() => makeDefaults());

  useEffect(() => {
    if (isEdit && existingItem) {
      setValues({
        title: existingItem.title,
        type: existingItem.type,
        targetDate: existingItem.targetDate,
        remindAdvanceDays: existingItem.remindAdvanceDays,
        remindTime: existingItem.remindTime,
        relatedMedicineIds: existingItem.relatedMedicineIds,
        hospital: existingItem.hospital,
        note: existingItem.note
      });
      return;
    }

    if (!isEdit) {
      setValues(makeDefaults());
    }
  }, [existingItem, isEdit]);

  const typeIndex = useMemo(
    () =>
      Math.max(
        0,
        CHECKUP_TYPE_OPTIONS.findIndex((option) => option.value === values.type)
      ),
    [values.type]
  );
  const beforeIndex = useMemo(
    () => findIndexOrZero(CHECKUP_BEFORE_OPTIONS, values.remindAdvanceDays),
    [values.remindAdvanceDays]
  );
  const calcText = useMemo(() => {
    const remindDate = calcCheckupRemindDate(
      values.targetDate,
      values.remindAdvanceDays
    );
    return `将在 ${remindDate} ${values.remindTime} 提醒，目标检查日为 ${values.targetDate}`;
  }, [values.remindAdvanceDays, values.remindTime, values.targetDate]);

  const setField = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMedicine = (id: string) => {
    setValues((prev) => ({
      ...prev,
      relatedMedicineIds: prev.relatedMedicineIds.includes(id)
        ? prev.relatedMedicineIds.filter((item) => item !== id)
        : [...prev.relatedMedicineIds, id]
    }));
  };

  const handleSubmit = async () => {
    if (!values.title.trim()) {
      Taro.showToast({
        title: '请填写检查事项',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    if (!values.targetDate) {
      Taro.showToast({
        title: '请选择目标日期',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    if (!values.remindTime) {
      Taro.showToast({
        title: '请选择提醒时间',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    const payload = {
      title: values.title.trim(),
      type: values.type,
      targetDate: values.targetDate,
      remindAdvanceDays: values.remindAdvanceDays,
      remindTime: values.remindTime,
      relatedMedicineIds: values.relatedMedicineIds,
      hospital: values.hospital.trim(),
      note: values.note.trim()
    };

    try {
      if (isEdit && checkupId) {
        await updateCheckup(checkupId, payload);
        Taro.showToast({ title: '检查提醒已更新', icon: 'success' });
      } else {
        await addCheckup({
          ...payload,
          status: CHECKUP_STATUS.ACTIVE,
          completionHistory: [],
          lastWechatReminderDate: '',
          lastWechatReminderAt: ''
        });
        Taro.showToast({ title: '检查提醒已创建', icon: 'success' });
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
    <View className="checkup-composer">
      <View className="checkup-composer__notice">
        <Text className="checkup-composer__notice-title">
          复诊和检查独立管理
        </Text>
        <Text className="checkup-composer__notice-desc">
          可关联药品，也可以只作为复诊、化验或影像检查的单独提醒。
        </Text>
      </View>

      <View className="checkup-composer__section">
        <Text className="checkup-composer__section-title">检查事项</Text>

        <View className="checkup-composer__field">
          <Text className="checkup-composer__label">
            事项名称
            <Text className="checkup-composer__required">*</Text>
          </Text>
          <View className="checkup-composer__input-row">
            <Input
              className="checkup-composer__input"
              value={values.title}
              placeholder="例如：心内科复诊"
              clearable
              onChange={(e: InputEvent) => setField('title', e.detail.value)}
            />
          </View>
        </View>

        <View className="checkup-composer__grid">
          <View className="checkup-composer__field">
            <Text className="checkup-composer__label">类型</Text>
            <Picker
              mode="selector"
              range={TYPE_LABELS}
              value={typeIndex}
              onChange={(e: SelectorPickerEvent) => {
                const option = CHECKUP_TYPE_OPTIONS[Number(e.detail.value)];
                setField('type', option.value);
              }}
            >
              <View className="checkup-composer__picker">
                <Text className="checkup-composer__picker-text">
                  {CHECKUP_TYPE_OPTIONS[typeIndex].label}
                </Text>
              </View>
            </Picker>
          </View>

          <View className="checkup-composer__field">
            <Text className="checkup-composer__label">医院/科室</Text>
            <View className="checkup-composer__input-row">
              <Input
                className="checkup-composer__input"
                value={values.hospital}
                placeholder="例如：瑞金医院"
                clearable
                onChange={(e: InputEvent) =>
                  setField('hospital', e.detail.value)
                }
              />
            </View>
          </View>
        </View>
      </View>

      <View className="checkup-composer__section">
        <Text className="checkup-composer__section-title">提醒计划</Text>

        <View className="checkup-composer__grid">
          <View className="checkup-composer__field">
            <Text className="checkup-composer__label">
              目标日期
              <Text className="checkup-composer__required">*</Text>
            </Text>
            <Picker
              mode="date"
              value={values.targetDate}
              onChange={(e: DatePickerEvent) =>
                setField('targetDate', e.detail.value)
              }
            >
              <View className="checkup-composer__picker">
                <Text className="checkup-composer__picker-text">
                  {values.targetDate}
                </Text>
              </View>
            </Picker>
          </View>

          <View className="checkup-composer__field">
            <Text className="checkup-composer__label">提前提醒</Text>
            <Picker
              mode="selector"
              range={BEFORE_LABELS}
              value={beforeIndex}
              onChange={(e: SelectorPickerEvent) =>
                setField(
                  'remindAdvanceDays',
                  CHECKUP_BEFORE_OPTIONS[Number(e.detail.value)]
                )
              }
            >
              <View className="checkup-composer__picker">
                <Text className="checkup-composer__picker-text">
                  {BEFORE_LABELS[beforeIndex]}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className="checkup-composer__field">
          <Text className="checkup-composer__label">
            提醒时间
            <Text className="checkup-composer__required">*</Text>
          </Text>
          <Picker
            mode="time"
            value={values.remindTime}
            onChange={(e: TimePickerEvent) =>
              setField('remindTime', e.detail.value)
            }
          >
            <View className="checkup-composer__picker">
              <Text className="checkup-composer__picker-text">
                {values.remindTime}
              </Text>
            </View>
          </Picker>
        </View>

        <View className="checkup-composer__calc">
          <Text>{calcText}</Text>
        </View>
      </View>

      <View className="checkup-composer__section">
        <Text className="checkup-composer__section-title">关联药品</Text>
        <Text className="checkup-composer__helper">
          可选。用于标记“用药后复查肝功能”这类与药品相关的检查。
        </Text>
        {medicines.length > 0 ? (
          <View className="checkup-composer__chips">
            {medicines.map((medicine) => {
              const selected = values.relatedMedicineIds.includes(medicine.id);
              return (
                <View
                  key={medicine.id}
                  className={`checkup-composer__chip${selected ? ' checkup-composer__chip--active' : ''}`}
                  role="button"
                  aria-label={`${selected ? '取消关联' : '关联'}${medicine.name}`}
                  onClick={() => toggleMedicine(medicine.id)}
                >
                  <Text className="checkup-composer__chip-text">
                    {medicine.name}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="checkup-composer__empty-related">
            当前药箱暂无药品，可先保存独立检查提醒。
          </Text>
        )}
      </View>

      <View className="checkup-composer__field">
        <Text className="checkup-composer__label">备注</Text>
        <View className="checkup-composer__textarea">
          <Textarea
            className="checkup-composer__textarea-inner"
            value={values.note}
            placeholder="医生要求、检查前注意事项、空腹等"
            limit={120}
            onChange={(e: TextareaEvent) => setField('note', e.detail.value)}
          />
        </View>
      </View>

      <View className="checkup-composer__actions">
        <Button className="checkup-composer__cancel" onClick={onCancel}>
          取消
        </Button>
        <Button
          className="checkup-composer__submit"
          color="primary"
          onClick={handleSubmit}
        >
          {isEdit ? '保存修改' : '保存提醒'}
        </Button>
      </View>
    </View>
  );
}
