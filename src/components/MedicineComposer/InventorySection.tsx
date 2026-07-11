import { Picker, Text, View } from '@tarojs/components';
import { Input, Switch } from '@taroify/core';

import type { InventoryEstimateMode } from '@/types';
import { today } from '@/utils/dateUtils';
import type { MedicineComposerValues } from './formUtils';
import type { DatePickerEvent, InputEvent } from './useMedicineComposerForm';

interface InventorySectionProps {
  automaticAllowed: boolean;
  doseEffectiveDate: string;
  inventoryQuantityInput: string;
  inventoryUnitChanged: boolean;
  showDoseEffectiveDate: boolean;
  values: MedicineComposerValues;
  onDoseEffectiveDateChange: (date: string) => void;
  onModeChange: (mode: InventoryEstimateMode) => void;
  onQuantityChange: (event: InputEvent) => void;
  onTrackingChange: (enabled: boolean) => void;
  onBaseDateChange: (date: string) => void;
}

const MODE_OPTIONS: { value: InventoryEstimateMode; label: string }[] = [
  { value: 'automatic', label: '自动估算' },
  { value: 'manual', label: '手动维护' }
];

export default function InventorySection({
  automaticAllowed,
  doseEffectiveDate,
  inventoryQuantityInput,
  inventoryUnitChanged,
  showDoseEffectiveDate,
  values,
  onDoseEffectiveDateChange,
  onModeChange,
  onQuantityChange,
  onTrackingChange,
  onBaseDateChange
}: InventorySectionProps) {
  return (
    <View className="medicine-composer__section">
      <View className="medicine-composer__switch-row">
        <View className="medicine-composer__switch-copy">
          <Text className="medicine-composer__switch-title">库存与余量</Text>
          <Text className="medicine-composer__switch-desc">
            独立于开药提醒，按盘点基准估算当前余量
          </Text>
        </View>
        <Switch
          className="medicine-composer__switch-control"
          checked={values.inventoryTrackingEnabled}
          size={28}
          onChange={onTrackingChange}
        />
      </View>

      {values.inventoryTrackingEnabled ? (
        <View className="medicine-composer__inventory-fields">
          <View className="medicine-composer__mode-options">
            {MODE_OPTIONS.map((option) => {
              const disabled = option.value === 'automatic' && !automaticAllowed;
              const active = values.inventoryEstimateMode === option.value;
              return (
                <View
                  key={option.value}
                  className={`medicine-composer__mode-option${active ? ' medicine-composer__mode-option--active' : ''}${disabled ? ' medicine-composer__mode-option--disabled' : ''}`}
                  role="button"
                  aria-label={option.label}
                  aria-disabled={disabled}
                  onClick={() => onModeChange(option.value)}
                >
                  <Text>{option.label}</Text>
                </View>
              );
            })}
          </View>

          <Text
            className={
              automaticAllowed
                ? 'medicine-composer__inventory-tip'
                : 'medicine-composer__inventory-warning'
            }
          >
            {automaticAllowed
              ? '自动估算按自然日计算，盘点当天不重复扣减；结果仅代表当前计划。'
              : '当前用量不固定，需手动更新余量，不展示预计可用天数。'}
          </Text>

          {inventoryUnitChanged ? (
            <Text className="medicine-composer__inventory-warning">
              用量单位已变化，请按新单位重新填写当前实际总量，旧库存基准不会沿用。
            </Text>
          ) : null}

          <View className="medicine-composer__grid">
            <View className="medicine-composer__field">
              <Text className="medicine-composer__label">
                当前实际总量
                <Text className="medicine-composer__required">*</Text>
              </Text>
              <View className="medicine-composer__input-row">
                <Input
                  className="medicine-composer__input"
                  value={inventoryQuantityInput}
                  type="digit"
                  placeholder="可填写 0"
                  onChange={onQuantityChange}
                />
                <Text className="medicine-composer__suffix">
                  {values.dosageUnit}
                </Text>
              </View>
            </View>

            <View className="medicine-composer__field">
              <Text className="medicine-composer__label">
                盘点日期
                <Text className="medicine-composer__required">*</Text>
              </Text>
              <Picker
                mode="date"
                end={today()}
                value={values.inventoryBaseDate || today()}
                onChange={(event: DatePickerEvent) =>
                  onBaseDateChange(event.detail.value)
                }
              >
                <View className="medicine-composer__picker">
                  <Text className="medicine-composer__picker-text">
                    {values.inventoryBaseDate || today()}
                  </Text>
                </View>
              </Picker>
            </View>
          </View>

          {showDoseEffectiveDate ? (
            <View className="medicine-composer__field">
              <Text className="medicine-composer__label">
                新剂量生效日期
                <Text className="medicine-composer__required">*</Text>
              </Text>
              <Picker
                mode="date"
                start={values.inventoryBaseDate}
                end={today()}
                value={doseEffectiveDate}
                onChange={(event: DatePickerEvent) =>
                  onDoseEffectiveDateChange(event.detail.value)
                }
              >
                <View className="medicine-composer__picker">
                  <Text className="medicine-composer__picker-text">
                    {doseEffectiveDate}
                  </Text>
                </View>
              </Picker>
              <Text className="medicine-composer__inventory-tip">
                保存时先按旧剂量结算到该日期，再从新基准按新剂量估算。
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
