import { useEffect, useMemo, useState } from 'react';
import type {
  BaseEventOrig,
  PickerDateProps,
  PickerSelectorProps,
  PickerTimeProps
} from '@tarojs/components';
import Taro from '@tarojs/taro';

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
import { useSubmissionGuard } from '@/hooks/useSubmissionGuard';
import type {
  DosageUnit,
  Medicine,
  MedicineForm,
  MedicineSchedule
} from '@/types';
import { calcNextDate, calcRemindDate, today } from '@/utils/dateUtils';
import { loadSettings } from '@/utils/storage';

export interface MedicineComposerFormOptions {
  medicineId?: string;
  defaultReminderEnabled: boolean;
  onSuccess: (medicine?: Medicine) => void;
  onCancel: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
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

export type InputEvent = BaseEventOrig<{ value: string }>;
export type TextareaEvent = BaseEventOrig<{ value: string }>;
export type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
export type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
export type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;

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

export function useMedicineComposerForm({
  medicineId,
  defaultReminderEnabled,
  onSuccess,
  onCancel,
  onSubmittingChange
}: MedicineComposerFormOptions) {
  const isEdit = Boolean(medicineId);
  const existingItem = useDerivedById(medicineId ?? '');
  const { addReminder, updateReminder } = useReminderActions();
  const { submitting, runSubmission, isSubmitting } =
    useSubmissionGuard(onSubmittingChange);
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
    if (isSubmitting()) return;

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
      await runSubmission(async () => {
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
            title: values.reminderEnabled
              ? '开药提醒已创建'
              : '药品已保存到药箱',
            icon: 'success',
            duration: 1500
          });
        }

        onSuccess();
      });
    } catch {
      Taro.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    }
  };

  const handleCancel = () => {
    if (!isSubmitting()) {
      onCancel();
    }
  };

  return {
    beforeIndex,
    calcText,
    dosageIndex,
    formIndex,
    handleCancel,
    handleDosageChange,
    handleIntervalChange,
    handleScheduleChange,
    handleSubmit,
    handleTimesChange,
    intervalInput,
    isEdit,
    scheduleIndex,
    setField,
    submitting,
    values
  };
}
