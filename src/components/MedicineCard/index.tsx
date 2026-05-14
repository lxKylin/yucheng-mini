import { EyeOutlined, Success } from "@taroify/icons";
import { Text, View } from "@tarojs/components";

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
  const doneColor =
    item.level === "danger"
      ? "danger"
      : item.level === "warning"
        ? "warning"
        : "success";

  return (
    <View
      className={`medicine-card${item.status === "paused" ? " medicine-card--paused" : ""}`}
    >
      <View className="medicine-card__header">
        <Text className="medicine-card__name">{item.name}</Text>
        <StatusTag level={item.level} label={item.levelLabel} />
      </View>
      <Text className="medicine-card__meta">规格 {item.spec}</Text>
      <Text className="medicine-card__meta">
        最近开药 {item.lastDate} · 周期 {item.interval} 天 · 提前 {item.before}{" "}
        天 {item.time}提醒
      </Text>

      <View className="medicine-card__progress">
        <ProgressBar progress={item.progress} level={item.level} />
      </View>

      {showActions ? (
        <View className="medicine-card__actions">
          <View
            className={`medicine-card__btn medicine-card__btn--${doneColor}`}
            onClick={onDone}
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
