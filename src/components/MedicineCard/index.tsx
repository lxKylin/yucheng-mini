import { EyeOutlined, Success } from "@taroify/icons";
import { Text, View } from "@tarojs/components";

import { REMINDER_LEVEL, REMINDER_STATUS } from "@/constants";
import ProgressBar from "@/components/ProgressBar";
import StatusTag from "@/components/StatusTag";
import type { DerivedReminder } from "@/types";

import "./index.scss";

interface MedicineCardProps {
  item: DerivedReminder;
  showActions?: boolean;
  onDone?: () => void;
  onDetail?: () => void;
}

export default function MedicineCard({
  item,
  showActions = true,
  onDone,
  onDetail,
}: MedicineCardProps) {
  const doneDisabled = item.status === REMINDER_STATUS.PAUSED;
  const accentColor = doneDisabled
    ? "disabled"
    : item.level === REMINDER_LEVEL.DANGER
      ? "danger"
      : item.level === REMINDER_LEVEL.WARNING
        ? "warning"
        : "success";
  const doneColor =
    item.level === REMINDER_LEVEL.DANGER
      ? "danger"
      : item.level === REMINDER_LEVEL.WARNING
        ? "warning"
        : "success";

  return (
    <View
      className={`medicine-card medicine-card--${accentColor}${item.status === REMINDER_STATUS.PAUSED ? " medicine-card--paused" : ""}`}
    >
      <View className="medicine-card__header">
        <Text className="medicine-card__name">{item.medicineName}</Text>
        <StatusTag level={item.level} label={item.levelLabel} />
      </View>
      <Text className="medicine-card__meta">
        规格: {item.medicineSpec || "-"} · 周期: {item.intervalDays} 天
      </Text>
      <Text className="medicine-card__meta">
        最近一盒开始时间: {item.currentPrescriptionDate}
      </Text>
      <Text
        className={`medicine-card__meta medicine-card__meta--accent medicine-card__meta--${accentColor}`}
      >
        下一盒开始时间: {item.nextPrescriptionDate}
      </Text>
      <Text
        className={`medicine-card__meta medicine-card__meta--accent medicine-card__meta--${accentColor}`}
      >
        提醒时间: {item.nextRemindDate} {item.remindTime}
      </Text>

      <View className="medicine-card__progress">
        <ProgressBar progress={item.progress} level={item.level} />
      </View>

      {showActions ? (
        <View className="medicine-card__actions">
          <View
            className={`medicine-card__btn medicine-card__btn--${doneColor}${doneDisabled ? " medicine-card__btn--disabled" : ""}`}
            onClick={doneDisabled ? undefined : onDone}
          >
            <Success className="medicine-card__btn-icon" />
            <Text className="medicine-card__btn-text">已开药</Text>
          </View>
          <View
            className="medicine-card__btn medicine-card__btn--ghost"
            onClick={onDetail}
          >
            <EyeOutlined className="medicine-card__btn-icon" />
            <Text className="medicine-card__btn-text">查看详情</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
