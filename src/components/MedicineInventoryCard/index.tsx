import { Text, View } from '@tarojs/components';

import { MEDICINE_FORM_OPTIONS } from '@/constants';
import type { DerivedMedicine } from '@/types';

import './index.scss';

interface MedicineInventoryCardProps {
  medicine: DerivedMedicine;
  onClick?: () => void;
}

const FORM_LABEL_MAP = MEDICINE_FORM_OPTIONS.reduce<Record<string, string>>(
  (map, option) => {
    map[option.value] = option.label;
    return map;
  },
  {}
);

function getScheduleLabel(medicine: DerivedMedicine) {
  if (medicine.scheduleLabel) {
    return medicine.scheduleLabel;
  }

  if (medicine.scheduleTiming === '固定时间') {
    return `固定时间 ${medicine.scheduleTime || '08:00'}`;
  }

  return medicine.scheduleTiming || '服用时机未填';
}

export default function MedicineInventoryCard({
  medicine,
  onClick
}: MedicineInventoryCardProps) {
  const name = medicine.name || '未命名药品';
  const formLabel = FORM_LABEL_MAP[medicine.form] || '剂型未填';
  const expiryLabel = medicine.expiryDate
    ? `过期 ${medicine.expiryDate}`
    : '未填过期时间';
  const statusClass = medicine.reminderEnabled ? 'enabled' : 'disabled';
  const statusText = medicine.reminderEnabled ? '提醒已启用' : '未启用提醒';
  const statusDesc = medicine.reminderEnabled ? '已进入提醒列表' : '仅药箱备忘';

  return (
    <View
      className={`medicine-inventory-card medicine-inventory-card--${statusClass}`}
      role="button"
      aria-label={`编辑${name}`}
      onClick={onClick}
    >
      <View className="medicine-inventory-card__main">
        <View className="medicine-inventory-card__head">
          <Text className="medicine-inventory-card__name">{name}</Text>
          <View className="medicine-inventory-card__head-actions">
            <Text
              className={`medicine-inventory-card__status medicine-inventory-card__status--${statusClass}`}
            >
              {statusText}
            </Text>
          </View>
        </View>
        <Text className="medicine-inventory-card__meta">
          {medicine.spec || '未填写规格'} · {formLabel} · {expiryLabel}
        </Text>

        <View className="medicine-inventory-card__pills">
          <Text className="medicine-inventory-card__pill">
            每次 {medicine.dosagePerUse || '-'}
            {medicine.dosageUnit || ''}
          </Text>
          {medicine.timesPerDay ? (
            <Text className="medicine-inventory-card__pill">
              每日 {medicine.timesPerDay || '-'} 次
            </Text>
          ) : null}
          <Text className="medicine-inventory-card__pill">
            {getScheduleLabel(medicine)}
          </Text>
        </View>
      </View>

      <View className="medicine-inventory-card__footnote">
        <Text className="medicine-inventory-card__footnote-text">
          {statusDesc}
        </Text>
        <Text className="medicine-inventory-card__footnote-action">
          点击编辑
        </Text>
      </View>
    </View>
  );
}
