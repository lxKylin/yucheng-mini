import type { ReactNode } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import { Button, Input, Switch, Textarea } from '@taroify/core';

import {
  BEFORE_OPTIONS,
  DOSAGE_UNIT_OPTIONS,
  MEDICINE_FORM_OPTIONS,
  SCHEDULE_OPTIONS
} from '@/constants';
import type { Medicine } from '@/types';
import { today } from '@/utils/dateUtils';
import InventorySection from './InventorySection';
import {
  type DatePickerEvent,
  type InputEvent,
  type SelectorPickerEvent,
  type TextareaEvent,
  type TimePickerEvent,
  useMedicineComposerForm
} from './useMedicineComposerForm';

import './index.scss';

interface MedicineComposerProps {
  medicineId?: string;
  defaultReminderEnabled?: boolean;
  footerExtra?: ReactNode;
  onSuccess: (medicine?: Medicine) => void;
  onCancel: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

const FORM_LABELS = MEDICINE_FORM_OPTIONS.map((option) => option.label);
const DOSAGE_LABELS = DOSAGE_UNIT_OPTIONS.map((option) => option);
const SCHEDULE_LABELS = SCHEDULE_OPTIONS.map((option) => option);
const BEFORE_LABELS = BEFORE_OPTIONS.map((value) => `${value} 天`);
const DOSAGE_SHORTCUTS = [
  { value: '0.25', label: '1/4' },
  { value: '0.5', label: '1/2' },
  { value: '1', label: '1' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2' }
];

export default function MedicineComposer({
  medicineId,
  defaultReminderEnabled = false,
  footerExtra,
  onSuccess,
  onCancel,
  onSubmittingChange
}: MedicineComposerProps) {
  const {
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
  } = useMedicineComposerForm({
    medicineId,
    defaultReminderEnabled,
    onSuccess,
    onCancel,
    onSubmittingChange
  });

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
                value={dosageInput}
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
                handleDosageUnitChange(
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

        {values.dosageUnit === '片' || values.dosageUnit === '粒' ? (
          <View className="medicine-composer__dose-shortcuts">
            {DOSAGE_SHORTCUTS.map((option) => (
              <View
                key={option.value}
                className={`medicine-composer__dose-shortcut${dosageInput === option.value ? ' medicine-composer__dose-shortcut--active' : ''}`}
                role="button"
                aria-label={`每次${option.label}${values.dosageUnit}`}
                onClick={() => setDosageInput(option.value)}
              >
                <Text>
                  {option.label} {values.dosageUnit}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

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

      <InventorySection
        automaticAllowed={automaticInventoryAllowed}
        doseEffectiveDate={doseEffectiveDate}
        inventoryQuantityInput={inventoryQuantityInput}
        inventoryUnitChanged={inventoryUnitChanged}
        showDoseEffectiveDate={showDoseEffectiveDate}
        values={values}
        onDoseEffectiveDateChange={setDoseEffectiveDate}
        onModeChange={handleInventoryModeChange}
        onQuantityChange={handleInventoryQuantityChange}
        onTrackingChange={handleInventoryTrackingChange}
        onBaseDateChange={(date) => setField('inventoryBaseDate', date)}
      />

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
        <Button
          className="medicine-composer__cancel"
          disabled={submitting}
          onClick={handleCancel}
        >
          取消
        </Button>
        <Button
          className="medicine-composer__submit"
          color="primary"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting
            ? '保存中...'
            : isEdit
              ? '保存修改'
              : values.reminderEnabled
                ? '保存并开启提醒'
                : '保存到药箱'}
        </Button>
      </View>
    </View>
  );
}
