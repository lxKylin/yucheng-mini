import { useEffect, useMemo, useState } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import type {
  BaseEventOrig,
  PickerDateProps,
  PickerSelectorProps,
  PickerTimeProps
} from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button } from '@taroify/core';

import BottomSheet from '@/components/BottomSheet';
import {
  CHECKUP_BEFORE_OPTIONS,
  CHECKUP_STATUS,
  DEFAULT_BEFORE,
  DEFAULT_REMIND_TIME
} from '@/constants';
import { useCheckupActions } from '@/hooks/useCheckups';
import type { DerivedCheckupReminder } from '@/types';
import { calcCheckupRemindDate } from '@/utils/checkupUtils';
import { addDays, today } from '@/utils/dateUtils';

import './index.scss';

interface CheckupRestartSheetProps {
  open: boolean;
  item: DerivedCheckupReminder | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;

const BEFORE_LABELS = CHECKUP_BEFORE_OPTIONS.map((value) =>
  value === 0 ? '当天提醒' : `${value} 天前`
);

function findBeforeIndex(value: number) {
  const index = CHECKUP_BEFORE_OPTIONS.findIndex((option) => option === value);
  return index >= 0 ? index : 0;
}

function buildDefaultTargetDate(item: DerivedCheckupReminder) {
  const todayStr = today();

  if (item.targetDate >= todayStr && item.status !== CHECKUP_STATUS.DONE) {
    return item.targetDate;
  }

  return addDays(todayStr, 30);
}

export default function CheckupRestartSheet({
  open,
  item,
  onClose,
  onSuccess
}: CheckupRestartSheetProps) {
  const { updateCheckup } = useCheckupActions();
  const [targetDate, setTargetDate] = useState(addDays(today(), 30));
  const [remindAdvanceDays, setRemindAdvanceDays] =
    useState<number>(DEFAULT_BEFORE);
  const [remindTime, setRemindTime] = useState(DEFAULT_REMIND_TIME);

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setTargetDate(buildDefaultTargetDate(item));
    setRemindAdvanceDays(item.remindAdvanceDays ?? DEFAULT_BEFORE);
    setRemindTime(item.remindTime || DEFAULT_REMIND_TIME);
  }, [item, open]);

  const beforeIndex = useMemo(
    () => findBeforeIndex(remindAdvanceDays),
    [remindAdvanceDays]
  );
  const remindDate = useMemo(
    () => calcCheckupRemindDate(targetDate, remindAdvanceDays),
    [remindAdvanceDays, targetDate]
  );

  if (!item) {
    return null;
  }

  const handleSubmit = async () => {
    if (targetDate < today()) {
      Taro.showToast({
        title: '下次检查日期不能早于今天',
        icon: 'none',
        duration: 1800
      });
      return;
    }

    if (!remindTime) {
      Taro.showToast({
        title: '请选择提醒时间',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    try {
      await updateCheckup(item.id, {
        status: CHECKUP_STATUS.ACTIVE,
        targetDate,
        remindAdvanceDays,
        remindTime,
        lastWechatReminderDate: '',
        lastWechatReminderAt: ''
      });
      Taro.showToast({
        title: '已重新安排检查',
        icon: 'success',
        duration: 1500
      });
      onClose();
      onSuccess?.();
    } catch {
      Taro.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    }
  };

  return (
    <BottomSheet open={open} title="重新安排检查" onClose={onClose}>
      <View className="checkup-restart-sheet">
        <View className="checkup-restart-sheet__notice">
          <Text className="checkup-restart-sheet__notice-title">
            为「{item.title}」安排下一次提醒
          </Text>
          <Text className="checkup-restart-sheet__notice-desc">
            已完成记录会继续保留；恢复后，这条检查会重新进入检查列表和首页风险待办。
          </Text>
        </View>

        <View className="checkup-restart-sheet__field">
          <Text className="checkup-restart-sheet__label">下一次检查日期</Text>
          <Picker
            mode="date"
            start={today()}
            value={targetDate}
            onChange={(event: DatePickerEvent) =>
              setTargetDate(event.detail.value)
            }
          >
            <View className="checkup-restart-sheet__picker">
              <Text className="checkup-restart-sheet__picker-text">
                {targetDate}
              </Text>
              <Text className="checkup-restart-sheet__picker-hint">
                点击调整
              </Text>
            </View>
          </Picker>
        </View>

        <View className="checkup-restart-sheet__grid">
          <View className="checkup-restart-sheet__field">
            <Text className="checkup-restart-sheet__label">提前提醒</Text>
            <Picker
              mode="selector"
              range={BEFORE_LABELS}
              value={beforeIndex}
              onChange={(event: SelectorPickerEvent) => {
                const nextValue =
                  CHECKUP_BEFORE_OPTIONS[Number(event.detail.value)] ??
                  DEFAULT_BEFORE;
                setRemindAdvanceDays(nextValue);
              }}
            >
              <View className="checkup-restart-sheet__picker">
                <Text className="checkup-restart-sheet__picker-text">
                  {BEFORE_LABELS[beforeIndex]}
                </Text>
              </View>
            </Picker>
          </View>

          <View className="checkup-restart-sheet__field">
            <Text className="checkup-restart-sheet__label">提醒时间</Text>
            <Picker
              mode="time"
              value={remindTime}
              onChange={(event: TimePickerEvent) =>
                setRemindTime(event.detail.value)
              }
            >
              <View className="checkup-restart-sheet__picker">
                <Text className="checkup-restart-sheet__picker-text">
                  {remindTime}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        <Text className="checkup-restart-sheet__calc">
          将在 {remindDate} {remindTime} 提醒，目标检查日为 {targetDate}。
        </Text>

        <View className="checkup-restart-sheet__actions">
          <Button
            className="checkup-restart-sheet__btn checkup-restart-sheet__btn--ghost"
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            className="checkup-restart-sheet__btn checkup-restart-sheet__btn--primary"
            onClick={handleSubmit}
          >
            恢复提醒
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
