import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Button from '@taroify/core/button';

import { REMINDER_LEVEL, REMINDER_STATUS } from '@/constants';
import DoneDateSheet from '@/components/DoneDateSheet';
import ProgressBar from '@/components/ProgressBar';
import StatusTag from '@/components/StatusTag';
import { useDerivedById, useReminderActions } from '@/hooks/useReminders';

import './index.scss';

interface ReminderDetailProps {
  reminderId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export default function ReminderDetail({
  reminderId,
  onClose,
  onEdit
}: ReminderDetailProps) {
  const [doneSheetOpen, setDoneSheetOpen] = useState(false);
  const item = useDerivedById(reminderId);
  const [displayItem, setDisplayItem] = useState(item);
  const { markDone, togglePause, updateReminder } = useReminderActions();

  useEffect(() => {
    if (item) {
      setDisplayItem(item);
    }
  }, [item]);

  if (!displayItem) return null;

  const daysNumber = Math.abs(displayItem.daysLeft);
  const daysText =
    displayItem.daysLeft < 0
      ? '天 · 已逾期'
      : displayItem.daysLeft === 0
        ? '今日需要开药'
        : '天后预计需要重新开药';
  const doneBtnMod =
    displayItem.level === REMINDER_LEVEL.DANGER
      ? 'danger'
      : displayItem.level === REMINDER_LEVEL.WARNING
        ? 'warning'
        : 'success';

  const handleDone = () => {
    if (displayItem.status === REMINDER_STATUS.PAUSED) {
      return;
    }

    if (displayItem.daysLeft < 0) {
      setDoneSheetOpen(true);
      return;
    }

    Taro.showModal({
      title: '确认本次已开药',
      content: `确认已完成「${displayItem.name}」本次开药吗？系统会更新最近一盒日期并推算下一次提醒。`,
      confirmText: '确认',
      cancelText: '取消',
      confirmColor: '#157a66',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          await markDone(displayItem.id);
          Taro.showToast({
            title: `${displayItem.name} 已进入下一轮周期`,
            icon: 'success',
            duration: 1500
          });
          onClose();
        } catch {
          Taro.showToast({
            title: '更新失败，请稍后重试',
            icon: 'none',
            duration: 1800
          });
        }
      }
    });
  };

  const handleTogglePause = () => {
    if (displayItem.status === REMINDER_STATUS.PAUSED) {
      Taro.showModal({
        title: '重新启用提醒',
        content: `确定重新启用「${displayItem.name}」的提醒吗？恢复后会继续按照当前周期推送提醒。`,
        confirmText: '启用',
        cancelText: '取消',
        confirmColor: '#157a66',
        success: async (res) => {
          if (!res.confirm) {
            return;
          }

          try {
            await togglePause(displayItem.id);
            Taro.showToast({
              title: '提醒已重新启用',
              icon: 'none',
              duration: 1500
            });
            onClose();
          } catch {
            Taro.showToast({
              title: '操作失败，请稍后重试',
              icon: 'none',
              duration: 1800
            });
          }
        }
      });
      return;
    }

    Taro.showModal({
      title: '暂停提醒',
      content: `确定暂停「${displayItem.name}」的提醒吗？暂停后将不会继续提示，直到你重新启用。`,
      confirmText: '暂停',
      cancelText: '取消',
      confirmColor: '#b86c1e',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          await togglePause(displayItem.id);
          Taro.showToast({
            title: '提醒已暂停',
            icon: 'none',
            duration: 1500
          });
          onClose();
        } catch {
          Taro.showToast({
            title: '操作失败，请稍后重试',
            icon: 'none',
            duration: 1800
          });
        }
      }
    });
  };

  const handleDelete = () => {
    Taro.showModal({
      title: '删除提醒',
      content: `确定要关闭「${displayItem.name}」的开药提醒吗？药品资料仍会保留在药箱。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ca4e41',
      success: async (res) => {
        if (res.confirm) {
          try {
            await updateReminder(displayItem.id, {
              reminderEnabled: false,
              status: REMINDER_STATUS.ACTIVE
            });
            Taro.showToast({
              title: `${displayItem.name} 已移出提醒列表`,
              icon: 'none',
              duration: 1500
            });
            onClose();
          } catch {
            Taro.showToast({
              title: '删除失败，请稍后重试',
              icon: 'none',
              duration: 1800
            });
          }
        }
      }
    });
  };

  return (
    <View className="reminder-detail">
      <View className="reminder-detail__header">
        <View className="reminder-detail__header-main">
          <Text className="reminder-detail__name">
            {displayItem.name}
          </Text>
          {displayItem.spec ? (
            <Text className="reminder-detail__spec">
              {displayItem.spec}
            </Text>
          ) : null}
          {displayItem.note ? (
            <Text className="reminder-detail__note">{displayItem.note}</Text>
          ) : null}
        </View>
        <StatusTag level={displayItem.level} label={displayItem.levelLabel} />
      </View>

      {displayItem.status !== REMINDER_STATUS.PAUSED ? (
        <View className="reminder-detail__days">
          <Text
            className={`reminder-detail__days-number reminder-detail__days-number--${displayItem.level}`}
          >
            {displayItem.daysLeft === 0 ? '' : daysNumber}
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
        <ProgressBar
          progress={displayItem.progress}
          level={displayItem.level}
        />
      </View>

      <View className="reminder-detail__actions">
        <Button
          className={`reminder-detail__btn reminder-detail__btn--done reminder-detail__btn--${doneBtnMod}`}
          disabled={displayItem.status === REMINDER_STATUS.PAUSED}
          onClick={handleDone}
        >
          本次已开药
        </Button>
        <Button
          className="reminder-detail__btn reminder-detail__btn--pause"
          onClick={handleTogglePause}
        >
          {displayItem.status === REMINDER_STATUS.PAUSED
            ? '重新启用'
            : '暂停提醒'}
        </Button>
      </View>

      <View className="reminder-detail__info-grid">
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">最近开药日期</Text>
          <Text className="reminder-detail__info-value">
            {displayItem.currentPrescriptionDate}
          </Text>
        </View>
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">开药间隔</Text>
          <Text className="reminder-detail__info-value">
            {displayItem.intervalDays} 天
          </Text>
        </View>
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">下次开药日期</Text>
          <Text className="reminder-detail__info-value">
            {displayItem.nextPrescriptionDate}
          </Text>
        </View>
        <View className="reminder-detail__info">
          <Text className="reminder-detail__info-label">提醒设置</Text>
          <Text className="reminder-detail__info-value">
            提前 {displayItem.remindAdvanceDays} 天 {displayItem.remindTime}
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
          onClick={() => onEdit(displayItem.id)}
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

      {displayItem.prescriptionHistory.length > 0 ? (
        <View className="reminder-detail__history">
          <View className="reminder-detail__history-head">
            <Text className="reminder-detail__history-title">开药历史记录</Text>
            <Text className="reminder-detail__history-count">
              最近 {displayItem.prescriptionHistory.length} 次
            </Text>
          </View>
          {displayItem.prescriptionHistory.map((date, idx) => (
            <View key={`hist-${idx}`} className="reminder-detail__history-item">
              <Text className="reminder-detail__history-date">{date}</Text>
              <Text className="reminder-detail__history-desc">
                周期 {displayItem.intervalDays} 天 · 提前{' '}
                {displayItem.remindAdvanceDays} 天提醒
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <DoneDateSheet
        open={doneSheetOpen}
        item={displayItem}
        onClose={() => setDoneSheetOpen(false)}
        onSuccess={onClose}
      />
    </View>
  );
}
