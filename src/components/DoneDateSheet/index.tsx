import { useEffect, useState } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import type { BaseEventOrig, PickerDateProps } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Button from '@taroify/core/button';

import BottomSheet from '@/components/BottomSheet';
import { useReminderActions } from '@/hooks/useReminders';
import type { DerivedReminder } from '@/types';
import { today } from '@/utils/dateUtils';

import './index.scss';

interface DoneDateSheetProps {
  open: boolean;
  item: DerivedReminder | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;

export default function DoneDateSheet({
  open,
  item,
  onClose,
  onSuccess
}: DoneDateSheetProps) {
  const { markDone } = useReminderActions();
  const [selectedDate, setSelectedDate] = useState(today());

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setSelectedDate(today());
  }, [item, open]);

  if (!item) {
    return null;
  }

  const endDate = today();

  const handleConfirm = async () => {
    if (selectedDate < item.nextPrescriptionDate) {
      Taro.showToast({
        title: '实际日期不能早于计划开药日',
        icon: 'none',
        duration: 1800
      });
      return;
    }

    try {
      await markDone(item.id, selectedDate);
      Taro.showToast({
        title: `${item.medicineName} 已按实际日期更新`,
        icon: 'success',
        duration: 1500
      });
      onClose();
      onSuccess?.();
    } catch {
      Taro.showToast({
        title: '更新失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    }
  };

  return (
    <BottomSheet open={open} title="记录实际开药日期" onClose={onClose}>
      <View className="done-date-sheet">
        <View className="done-date-sheet__notice">
          <Text className="done-date-sheet__notice-title">
            当前已逾期 {Math.abs(item.daysLeft)} 天
          </Text>
          <Text className="done-date-sheet__notice-desc">
            「{item.medicineName}
            」不能直接按计划日期进入下一周期，请确认这次实际开药日期。
          </Text>
        </View>

        <View className="done-date-sheet__summary">
          <View className="done-date-sheet__summary-item">
            <Text className="done-date-sheet__summary-label">计划开药日期</Text>
            <Text className="done-date-sheet__summary-value">
              {item.nextPrescriptionDate}
            </Text>
          </View>
          <View className="done-date-sheet__summary-item">
            <Text className="done-date-sheet__summary-label">默认记录日期</Text>
            <Text className="done-date-sheet__summary-value">今天</Text>
          </View>
        </View>

        <View className="done-date-sheet__field">
          <Text className="done-date-sheet__label">实际开药日期</Text>
          <Picker
            mode="date"
            start={item.nextPrescriptionDate}
            end={endDate}
            value={selectedDate}
            onChange={(event: DatePickerEvent) =>
              setSelectedDate(event.detail.value)
            }
          >
            <View className="done-date-sheet__picker">
              <Text className="done-date-sheet__picker-text">
                {selectedDate}
              </Text>
              <Text className="done-date-sheet__picker-hint">点击调整</Text>
            </View>
          </Picker>
        </View>

        <Text className="done-date-sheet__tip">
          确认后，系统会以这个日期作为最近一盒开始时间，重新推算下一次提醒。
        </Text>

        <View className="done-date-sheet__actions">
          <Button
            className="done-date-sheet__btn done-date-sheet__btn--ghost"
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            className="done-date-sheet__btn done-date-sheet__btn--primary"
            onClick={handleConfirm}
          >
            按此日期记录
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
