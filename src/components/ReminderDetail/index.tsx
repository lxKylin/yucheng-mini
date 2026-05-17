import { useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import Button from "@taroify/core/button";

import { REMINDER_LEVEL, REMINDER_STATUS } from "@/constants";
import DoneDateSheet from "@/components/DoneDateSheet";
import ProgressBar from "@/components/ProgressBar";
import StatusTag from "@/components/StatusTag";
import { useDerivedById, useReminderActions } from "@/hooks/useReminders";

import "./index.scss";

interface ReminderDetailProps {
  reminderId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export default function ReminderDetail({
  reminderId,
  onClose,
  onEdit,
}: ReminderDetailProps) {
  const [doneSheetOpen, setDoneSheetOpen] = useState(false);
  const item = useDerivedById(reminderId);
  const { markDone, togglePause, deleteReminder } = useReminderActions();

  if (!item) return null;

  const daysNumber = Math.abs(item.daysLeft);
  const daysText =
    item.daysLeft < 0
      ? "天 · 已逾期"
      : item.daysLeft === 0
        ? "今日需要开药"
        : "天后预计需要重新开药";
  const doneBtnMod =
    item.level === REMINDER_LEVEL.DANGER
      ? "danger"
      : item.level === REMINDER_LEVEL.WARNING
        ? "warning"
        : "success";

  const handleDone = () => {
    if (item.status === REMINDER_STATUS.PAUSED) {
      return;
    }

    if (item.daysLeft < 0) {
      setDoneSheetOpen(true);
      return;
    }

    Taro.showModal({
      title: "确认本次已开药",
      content: `确认已完成「${item.medicineName}」本次开药吗？系统会更新最近一盒日期并推算下一次提醒。`,
      confirmText: "确认",
      cancelText: "取消",
      confirmColor: "#157a66",
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          await markDone(item.id);
          Taro.showToast({
            title: `${item.medicineName} 已进入下一轮周期`,
            icon: "success",
            duration: 1500,
          });
          onClose();
        } catch {
          Taro.showToast({
            title: "更新失败，请稍后重试",
            icon: "none",
            duration: 1800,
          });
        }
      },
    });
  };

  const handleTogglePause = () => {
    if (item.status === REMINDER_STATUS.PAUSED) {
      Taro.showModal({
        title: "重新启用提醒",
        content: `确定重新启用「${item.medicineName}」的提醒吗？恢复后会继续按照当前周期推送提醒。`,
        confirmText: "启用",
        cancelText: "取消",
        confirmColor: "#157a66",
        success: async (res) => {
          if (!res.confirm) {
            return;
          }

          try {
            await togglePause(item.id);
            Taro.showToast({
              title: "提醒已重新启用",
              icon: "none",
              duration: 1500,
            });
            onClose();
          } catch {
            Taro.showToast({
              title: "操作失败，请稍后重试",
              icon: "none",
              duration: 1800,
            });
          }
        },
      });
      return;
    }

    Taro.showModal({
      title: "暂停提醒",
      content: `确定暂停「${item.medicineName}」的提醒吗？暂停后将不会继续提示，直到你重新启用。`,
      confirmText: "暂停",
      cancelText: "取消",
      confirmColor: "#b86c1e",
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          await togglePause(item.id);
          Taro.showToast({
            title: "提醒已暂停",
            icon: "none",
            duration: 1500,
          });
          onClose();
        } catch {
          Taro.showToast({
            title: "操作失败，请稍后重试",
            icon: "none",
            duration: 1800,
          });
        }
      },
    });
  };

  const handleDelete = () => {
    Taro.showModal({
      title: "删除提醒",
      content: `确定要删除「${item.medicineName}」的开药提醒吗？此操作不可撤销。`,
      confirmText: "删除",
      cancelText: "取消",
      confirmColor: "#ca4e41",
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteReminder(item.id);
            Taro.showToast({
              title: `${item.medicineName} 已删除`,
              icon: "none",
              duration: 1500,
            });
            onClose();
          } catch {
            Taro.showToast({
              title: "删除失败，请稍后重试",
              icon: "none",
              duration: 1800,
            });
          }
        }
      },
    });
  };

  return (
    <View className="reminder-detail">
      <View className="reminder-detail__header">
        <View className="reminder-detail__header-main">
          <Text className="reminder-detail__name">{item.medicineName}</Text>
          {item.medicineSpec ? (
            <Text className="reminder-detail__spec">{item.medicineSpec}</Text>
          ) : null}
          {item.note ? (
            <Text className="reminder-detail__note">{item.note}</Text>
          ) : null}
        </View>
        <StatusTag level={item.level} label={item.levelLabel} />
      </View>

      {item.status !== REMINDER_STATUS.PAUSED ? (
        <View className="reminder-detail__days">
          <Text
            className={`reminder-detail__days-number reminder-detail__days-number--${item.level}`}
          >
            {item.daysLeft === 0 ? "" : daysNumber}
          </Text>
          <Text className="reminder-detail__days-text">{daysText}</Text>
        </View>
      ) : (
        <View className="reminder-detail__paused-notice">
          <Text className="reminder-detail__paused-text">
            提醒已暂停，点击下方「重新启用」恢复跟踪。
          </Text>
        </View>
      )}

      <View className="reminder-detail__progress">
        <ProgressBar progress={item.progress} level={item.level} />
      </View>

      <View className="reminder-detail__actions">
        <Button
          className={`reminder-detail__btn reminder-detail__btn--done reminder-detail__btn--${doneBtnMod}`}
          disabled={item.status === REMINDER_STATUS.PAUSED}
          onClick={handleDone}
        >
          本次已开药
        </Button>
        <Button
          className="reminder-detail__btn reminder-detail__btn--pause"
          onClick={handleTogglePause}
        >
          {item.status === REMINDER_STATUS.PAUSED ? "重新启用" : "暂停提醒"}
        </Button>
      </View>

      <View className="reminder-detail__info-grid">
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">最近开药日期</Text>
          <Text className="reminder-detail__info-value">
            {item.currentPrescriptionDate}
          </Text>
        </View>
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">开药间隔</Text>
          <Text className="reminder-detail__info-value">
            {item.intervalDays} 天
          </Text>
        </View>
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">下次开药日期</Text>
          <Text className="reminder-detail__info-value">
            {item.nextPrescriptionDate}
          </Text>
        </View>
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">提醒设置</Text>
          <Text className="reminder-detail__info-value">
            提前 {item.remindAdvanceDays} 天 {item.remindTime}
          </Text>
        </View>
      </View>

      <View className="reminder-detail__notice">
        <Text className="reminder-detail__notice-title">推荐操作</Text>
        <Text className="reminder-detail__notice-desc">
          如果今天已经完成挂号或续方，点击「本次已开药」，系统会更新最近开药日期并推算下一次提醒。
        </Text>
      </View>

      <View className="reminder-detail__footer">
        <Button
          className="reminder-detail__btn reminder-detail__btn--edit"
          onClick={() => onEdit(item.id)}
        >
          编辑提醒
        </Button>
        <Button
          className="reminder-detail__btn reminder-detail__btn--delete"
          onClick={handleDelete}
        >
          删除提醒
        </Button>
      </View>

      {item.prescriptionHistory.length > 0 ? (
        <View className="reminder-detail__history">
          <View className="reminder-detail__history-head">
            <Text className="reminder-detail__history-title">开药历史记录</Text>
            <Text className="reminder-detail__history-count">
              最近 {item.prescriptionHistory.length} 次
            </Text>
          </View>
          {item.prescriptionHistory.map((date, idx) => (
            <View key={`hist-${idx}`} className="reminder-detail__history-item">
              <Text className="reminder-detail__history-date">{date}</Text>
              <Text className="reminder-detail__history-desc">
                周期 {item.intervalDays} 天 · 提前 {item.remindAdvanceDays}{" "}
                天提醒
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <DoneDateSheet
        open={doneSheetOpen}
        item={item}
        onClose={() => setDoneSheetOpen(false)}
        onSuccess={onClose}
      />
    </View>
  );
}
