import { Text, View } from '@tarojs/components';

import { MEDICINE_FORM_OPTIONS } from '@/constants';
import type { DerivedMedicine } from '@/types';
import { formatDosage, formatQuantity } from '@/utils/medicineInventory';

import './index.scss';

interface MedicineInventoryCardProps {
  medicine: DerivedMedicine;
  onClick?: () => void;
  onInventoryClick?: () => void;
}

function getInventoryPresentation(medicine: DerivedMedicine) {
  const quantity = medicine.estimatedRemainingQuantity;
  const quantityText =
    quantity === null
      ? ''
      : `${formatQuantity(quantity)}${medicine.dosageUnit}`;

  switch (medicine.inventoryDisplayStatus) {
    case 'needs_calibration':
      return {
        tone: 'calibration',
        title: '已开药，待重新盘点',
        desc: '旧的预计余量已暂停展示'
      };
    case 'manual':
      return {
        tone: 'manual',
        title: `当前记录 ${quantityText}`,
        desc: '手动维护，不计算预计可用天数'
      };
    case 'depleted':
      return {
        tone: 'depleted',
        title: '预计余量已用尽',
        desc: '按当前剂量估算，请尽快盘点'
      };
    case 'low':
      return {
        tone: 'low',
        title: `预计剩余 ${quantityText} · 约可用 ${medicine.estimatedAvailableDays} 天`,
        desc: '余量不足 · 按当前剂量估算'
      };
    case 'automatic':
      return {
        tone: 'automatic',
        title: `预计剩余 ${quantityText} · 约可用 ${medicine.estimatedAvailableDays} 天`,
        desc: '按当前剂量估算'
      };
    default:
      return null;
  }
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
  onClick,
  onInventoryClick
}: MedicineInventoryCardProps) {
  const name = medicine.name || '未命名药品';
  const formLabel = FORM_LABEL_MAP[medicine.form] || '剂型未填';
  const expiryLabel = medicine.expiryDate
    ? `过期 ${medicine.expiryDate}`
    : '未填过期时间';
  const statusClass = medicine.reminderEnabled ? 'enabled' : 'disabled';
  const statusText = medicine.reminderEnabled ? '提醒已启用' : '未启用提醒';
  const statusDesc = medicine.reminderEnabled ? '已进入提醒列表' : '仅药箱备忘';
  const inventory = getInventoryPresentation(medicine);

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
            每次 {formatDosage(medicine.dosagePerUse, medicine.dosageUnit)}
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

        {inventory ? (
          <View
            className={`medicine-inventory-card__inventory medicine-inventory-card__inventory--${inventory.tone}`}
          >
            <View className="medicine-inventory-card__inventory-copy">
              <Text className="medicine-inventory-card__inventory-title">
                {inventory.title}
              </Text>
              <Text className="medicine-inventory-card__inventory-desc">
                {inventory.desc}
              </Text>
            </View>
            <View
              className="medicine-inventory-card__inventory-action"
              role="button"
              aria-label={`更新${name}库存`}
              onClick={(event) => {
                event.stopPropagation();
                onInventoryClick?.();
              }}
            >
              <Text>更新库存</Text>
            </View>
          </View>
        ) : null}
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
