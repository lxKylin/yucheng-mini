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
  InventoryEstimateMode,
  Medicine
} from '@/types';
import { calcNextDate, calcRemindDate, today } from '@/utils/dateUtils';
import { formatQuantity, settleInventoryForDosageChange } from '@/utils/medicineInventory';
import {
  DOSAGE_PATTERN,
  findIndexOrZero,
  makeDefaults,
  type MedicineComposerValues,
  normalizeRange,
  QUANTITY_PATTERN,
  sanitizeDecimalInput
} from './formUtils';

export interface MedicineComposerFormOptions {
  medicineId?: string;
  defaultReminderEnabled: boolean;
  onSuccess: (medicine?: Medicine) => void;
  onCancel: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

export type InputEvent = BaseEventOrig<{ value: string }>;
export type TextareaEvent = BaseEventOrig<{ value: string }>;
export type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
export type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
export type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;

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
  const [values, setValues] = useState<MedicineComposerValues>(() =>
    makeDefaults(defaultReminderEnabled)
  );
  const [dosageInput, setDosageInput] = useState('1');
  const [inventoryQuantityInput, setInventoryQuantityInput] = useState('');
  const [doseEffectiveDate, setDoseEffectiveDate] = useState(today());
  const [inventoryUnitChanged, setInventoryUnitChanged] = useState(false);
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
        dosageUnit: existingItem.dosageUnit,
        timesPerDay: existingItem.timesPerDay,
        scheduleTiming: existingItem.scheduleTiming,
        scheduleTime: existingItem.scheduleTime || '08:00',
        inventoryTrackingEnabled: existingItem.inventoryTrackingEnabled,
        inventoryEstimateMode:
          existingItem.timesPerDay > 0 &&
          existingItem.scheduleTiming !== '按医嘱'
            ? existingItem.inventoryEstimateMode
            : 'manual',
        inventoryBaseDate: existingItem.inventoryBaseDate || today(),
        reminderEnabled: existingItem.reminderEnabled,
        currentPrescriptionDate: existingItem.currentPrescriptionDate,
        intervalDays: existingItem.intervalDays,
        remindAdvanceDays: existingItem.remindAdvanceDays,
        remindTime: existingItem.remindTime
      });
      setDosageInput(formatQuantity(existingItem.dosagePerUse));
      setInventoryQuantityInput(
        formatQuantity(existingItem.inventoryBaseQuantity)
      );
      setDoseEffectiveDate(today());
      setInventoryUnitChanged(false);
      setIntervalInput(String(existingItem.intervalDays));
      return;
    }

    if (!isEdit) {
      const defaults = makeDefaults(defaultReminderEnabled);
      setValues(defaults);
      setDosageInput('1');
      setInventoryQuantityInput('');
      setDoseEffectiveDate(today());
      setInventoryUnitChanged(false);
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
  const automaticInventoryAllowed =
    values.timesPerDay > 0 && values.scheduleTiming !== '按医嘱';
  const parsedDosage = Number(dosageInput);
  const dosageChanged = Boolean(
    existingItem &&
      Number.isFinite(parsedDosage) &&
      (parsedDosage !== existingItem.dosagePerUse ||
        values.timesPerDay !== existingItem.timesPerDay)
  );
  const showDoseEffectiveDate = Boolean(
    existingItem?.inventoryTrackingEnabled &&
      existingItem.inventoryEstimateMode === 'automatic' &&
      !existingItem.inventoryNeedsCalibration &&
      values.inventoryTrackingEnabled &&
      values.inventoryEstimateMode === 'automatic' &&
      dosageChanged &&
      !inventoryUnitChanged
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

  const setField = <K extends keyof MedicineComposerValues>(
    field: K,
    value: MedicineComposerValues[K]
  ) => setValues((previous) => ({ ...previous, [field]: value }));

  const handleScheduleChange = (event: SelectorPickerEvent) => {
    const scheduleTiming = SCHEDULE_OPTIONS[Number(event.detail.value)];
    setValues((previous) => ({
      ...previous,
      scheduleTiming,
      scheduleTime:
        scheduleTiming === '固定时间' && !previous.scheduleTime
          ? '08:00'
          : previous.scheduleTime,
      inventoryEstimateMode:
        previous.inventoryTrackingEnabled && scheduleTiming === '按医嘱'
          ? 'manual'
          : previous.inventoryEstimateMode
    }));
  };

  const handleIntervalChange = (event: InputEvent) => {
    const nextValue = event.detail.value.replace(/\D/g, '');
    setIntervalInput(nextValue);
    setField('intervalDays', nextValue ? Number(nextValue) : 0);
  };

  const handleDosageChange = (event: InputEvent) => {
    setDosageInput(sanitizeDecimalInput(event.detail.value));
  };

  const handleTimesChange = (event: InputEvent) => {
    const nextValue = event.detail.value.replace(/\D/g, '');
    const timesPerDay = nextValue ? Number(nextValue) : 0;
    setValues((previous) => ({
      ...previous,
      timesPerDay,
      inventoryEstimateMode:
        previous.inventoryTrackingEnabled && timesPerDay === 0
          ? 'manual'
          : previous.inventoryEstimateMode
    }));
  };

  const handleDosageUnitChange = (dosageUnit: DosageUnit) => {
    if (
      existingItem?.inventoryTrackingEnabled &&
      dosageUnit !== existingItem.dosageUnit
    ) {
      setInventoryUnitChanged(true);
      setInventoryQuantityInput('');
      setField('inventoryBaseDate', today());
    } else {
      setInventoryUnitChanged(false);
      if (existingItem) {
        setInventoryQuantityInput(
          formatQuantity(existingItem.inventoryBaseQuantity)
        );
        setField(
          'inventoryBaseDate',
          existingItem.inventoryBaseDate || today()
        );
      }
    }
    setField('dosageUnit', dosageUnit);
  };

  const handleInventoryTrackingChange = (enabled: boolean) => {
    setValues((previous) => ({
      ...previous,
      inventoryTrackingEnabled: enabled,
      inventoryEstimateMode: automaticInventoryAllowed
        ? previous.inventoryEstimateMode
        : 'manual',
      inventoryBaseDate: previous.inventoryBaseDate || today()
    }));
  };

  const handleInventoryModeChange = (mode: InventoryEstimateMode) => {
    if (mode === 'automatic' && !automaticInventoryAllowed) {
      Taro.showToast({
        title: '用量不固定，只能手动维护余量',
        icon: 'none',
        duration: 1800
      });
      return;
    }

    if (mode === values.inventoryEstimateMode) return;

    if (mode === 'automatic') {
      setInventoryQuantityInput('');
      setField('inventoryBaseDate', today());
    } else if (existingItem?.estimatedRemainingQuantity != null) {
      setInventoryQuantityInput(
        formatQuantity(existingItem?.estimatedRemainingQuantity ?? 0)
      );
      setField('inventoryBaseDate', today());
    }

    setField('inventoryEstimateMode', mode);
  };

  const handleInventoryQuantityChange = (event: InputEvent) => {
    setInventoryQuantityInput(sanitizeDecimalInput(event.detail.value));
  };

  const handleSubmit = async () => {
    if (isSubmitting()) return;

    if (!values.name.trim()) {
      Taro.showToast({ title: '请填写药品名称', icon: 'none', duration: 1500 });
      return;
    }

    if (!DOSAGE_PATTERN.test(dosageInput) || parsedDosage <= 0) {
      Taro.showToast({
        title: '每次用量需大于 0，且最多两位小数',
        icon: 'none',
        duration: 1800
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

    const inventoryQuantity = Number(inventoryQuantityInput);
    if (values.inventoryTrackingEnabled) {
      if (
        !QUANTITY_PATTERN.test(inventoryQuantityInput) ||
        !Number.isFinite(inventoryQuantity) ||
        inventoryQuantity < 0
      ) {
        Taro.showToast({
          title: '当前总量需不小于 0，且最多两位小数',
          icon: 'none',
          duration: 1800
        });
        return;
      }
      if (!values.inventoryBaseDate || values.inventoryBaseDate > today()) {
        Taro.showToast({
          title: '盘点日期不能晚于今天',
          icon: 'none',
          duration: 1800
        });
        return;
      }
    }

    if (showDoseEffectiveDate) {
      const baseDate = existingItem?.inventoryBaseDate || today();
      if (
        !doseEffectiveDate ||
        doseEffectiveDate < baseDate ||
        doseEffectiveDate > today()
      ) {
        Taro.showToast({
          title: `剂量生效日期需在 ${baseDate} 至今天之间`,
          icon: 'none',
          duration: 2000
        });
        return;
      }
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
      if (!values.currentPrescriptionDate || !values.remindTime) {
        Taro.showToast({
          title: '请完善最近开药日期和提醒时刻',
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
    const scheduleTime =
      values.scheduleTiming === '固定时间'
        ? values.scheduleTime || '08:00'
        : '';
    const inventoryEstimateMode = automaticInventoryAllowed
      ? values.inventoryEstimateMode
      : 'manual';
    let inventoryBaseQuantity = values.inventoryTrackingEnabled
      ? inventoryQuantity
      : existingItem?.inventoryBaseQuantity ?? 0;
    let inventoryBaseDate = values.inventoryTrackingEnabled
      ? values.inventoryBaseDate
      : existingItem?.inventoryBaseDate ?? '';

    if (showDoseEffectiveDate && existingItem) {
      const settlement = settleInventoryForDosageChange(
        existingItem,
        doseEffectiveDate
      );
      inventoryBaseQuantity = settlement.inventoryBaseQuantity;
      inventoryBaseDate = settlement.inventoryBaseDate;
    }

    const payload = {
      name: values.name.trim(),
      spec: values.spec.trim(),
      form: values.form,
      expiryDate: values.expiryDate,
      note: values.note.trim(),
      dosagePerUse: parsedDosage,
      dosageUnit: values.dosageUnit,
      timesPerDay: values.timesPerDay,
      scheduleTiming: values.scheduleTiming,
      scheduleTime,
      inventoryTrackingEnabled: values.inventoryTrackingEnabled,
      inventoryEstimateMode,
      inventoryBaseQuantity,
      inventoryBaseDate,
      inventoryNeedsCalibration: false,
      inventoryUpdatedAt: values.inventoryTrackingEnabled
        ? new Date().toISOString()
        : existingItem?.inventoryUpdatedAt ?? '',
      reminderEnabled: values.reminderEnabled,
      currentPrescriptionDate,
      intervalDays,
      remindAdvanceDays: normalizeRange(
        values.remindAdvanceDays,
        DEFAULT_BEFORE,
        0,
        365
      ),
      remindTime: values.remindTime || DEFAULT_REMIND_TIME
    };

    try {
      await runSubmission(async () => {
        if (isEdit && medicineId) {
          await updateReminder(medicineId, payload);
          Taro.showToast({ title: '药品已更新', icon: 'success', duration: 1500 });
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
    if (!isSubmitting()) onCancel();
  };

  return {
    automaticInventoryAllowed,
    beforeIndex,
    calcText,
    dosageIndex,
    dosageInput,
    doseEffectiveDate,
    formIndex,
    handleCancel,
    handleDosageChange,
    handleDosageUnitChange,
    handleIntervalChange,
    handleInventoryModeChange,
    handleInventoryQuantityChange,
    handleInventoryTrackingChange,
    handleScheduleChange,
    handleSubmit,
    handleTimesChange,
    intervalInput,
    inventoryEstimatedRemainingQuantity:
      existingItem?.estimatedRemainingQuantity ?? null,
    inventoryQuantityInput,
    inventoryUnitChanged,
    isEdit,
    scheduleIndex,
    setDosageInput,
    setDoseEffectiveDate,
    setField,
    showDoseEffectiveDate,
    submitting,
    values
  };
}
