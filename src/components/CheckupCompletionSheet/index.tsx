import { useEffect, useMemo, useState } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import type { BaseEventOrig, PickerDateProps } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Textarea } from '@taroify/core';

import BottomSheet from '@/components/BottomSheet';
import { useCheckupActions } from '@/hooks/useCheckups';
import type { DerivedCheckupReminder } from '@/types';
import { addDays, today } from '@/utils/dateUtils';

import './index.scss';

interface CheckupCompletionSheetProps {
  open: boolean;
  item: DerivedCheckupReminder | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
type TextareaEvent = BaseEventOrig<{ value: string }>;

function minDate(a: string, b: string) {
  return a < b ? a : b;
}

function buildInitialNextDate(item: DerivedCheckupReminder) {
  const todayStr = today();

  if (item.targetDate > todayStr) {
    return item.targetDate;
  }

  return addDays(todayStr, 30);
}

export default function CheckupCompletionSheet({
  open,
  item,
  onClose,
  onSuccess
}: CheckupCompletionSheetProps) {
  const { completeCheckup } = useCheckupActions();
  const [doneDate, setDoneDate] = useState(today());
  const [nextTargetDate, setNextTargetDate] = useState(addDays(today(), 30));
  const [doneNote, setDoneNote] = useState('');

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setDoneDate(today());
    setNextTargetDate(buildInitialNextDate(item));
    setDoneNote('');
  }, [item, open]);

  const doneStartDate = useMemo(() => {
    if (!item) {
      return today();
    }

    return minDate(addDays(item.targetDate, -365), today());
  }, [item]);

  if (!item) {
    return null;
  }

  const todayStr = today();
  const overdue = item.daysLeft < 0;

  const validateDoneDate = () => {
    if (doneDate > todayStr) {
      Taro.showToast({
        title: '实际完成日期不能晚于今天',
        icon: 'none',
        duration: 1800
      });
      return false;
    }

    return true;
  };

  const handleComplete = async (withNextDate: boolean) => {
    if (!validateDoneDate()) {
      return;
    }

    if (withNextDate && nextTargetDate <= doneDate) {
      Taro.showToast({
        title: '下次检查日期需晚于完成日期',
        icon: 'none',
        duration: 1800
      });
      return;
    }

    try {
      await completeCheckup(item.id, {
        doneDate,
        nextTargetDate: withNextDate ? nextTargetDate : undefined,
        note: doneNote.trim()
      });
      Taro.showToast({
        title: withNextDate ? '已安排下一次检查' : '检查已完成',
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
    <BottomSheet open={open} title="完成检查" onClose={onClose}>
      <View className="checkup-completion-sheet">
        <View
          className={`checkup-completion-sheet__notice${overdue ? ' checkup-completion-sheet__notice--danger' : ''}`}
        >
          <Text className="checkup-completion-sheet__notice-title">
            {overdue
              ? `当前已逾期 ${Math.abs(item.daysLeft)} 天`
              : item.daysLeft === 0
                ? '今天需要完成检查'
                : '记录本次检查结果'}
          </Text>
          <Text className="checkup-completion-sheet__notice-desc">
            请确认「{item.title}」的实际完成日期；如需要继续跟踪，可同时设置下一次检查日期。
          </Text>
        </View>

        <View className="checkup-completion-sheet__summary">
          <View className="checkup-completion-sheet__summary-item">
            <Text className="checkup-completion-sheet__summary-label">
              计划检查日期
            </Text>
            <Text className="checkup-completion-sheet__summary-value">
              {item.targetDate}
            </Text>
          </View>
          <View className="checkup-completion-sheet__summary-item">
            <Text className="checkup-completion-sheet__summary-label">
              默认记录日期
            </Text>
            <Text className="checkup-completion-sheet__summary-value">
              今天
            </Text>
          </View>
        </View>

        <View className="checkup-completion-sheet__field">
          <Text className="checkup-completion-sheet__label">实际完成日期</Text>
          <Picker
            mode="date"
            start={doneStartDate}
            end={todayStr}
            value={doneDate}
            onChange={(event: DatePickerEvent) =>
              setDoneDate(event.detail.value)
            }
          >
            <View className="checkup-completion-sheet__picker">
              <Text className="checkup-completion-sheet__picker-text">
                {doneDate}
              </Text>
              <Text className="checkup-completion-sheet__picker-hint">
                点击调整
              </Text>
            </View>
          </Picker>
        </View>

        <View className="checkup-completion-sheet__field">
          <Text className="checkup-completion-sheet__label">结果备注</Text>
          <View className="checkup-completion-sheet__textarea">
            <Textarea
              className="checkup-completion-sheet__textarea-inner"
              value={doneNote}
              placeholder="可记录结果摘要或医生建议"
              limit={80}
              onChange={(event: TextareaEvent) =>
                setDoneNote(event.detail.value)
              }
            />
          </View>
        </View>

        <View className="checkup-completion-sheet__field">
          <Text className="checkup-completion-sheet__label">下一次检查日期</Text>
          <Picker
            mode="date"
            start={addDays(doneDate, 1)}
            value={nextTargetDate}
            onChange={(event: DatePickerEvent) =>
              setNextTargetDate(event.detail.value)
            }
          >
            <View className="checkup-completion-sheet__picker">
              <Text className="checkup-completion-sheet__picker-text">
                {nextTargetDate}
              </Text>
              <Text className="checkup-completion-sheet__picker-hint">
                点击调整
              </Text>
            </View>
          </Picker>
        </View>

        <Text className="checkup-completion-sheet__tip">
          选择「完成并设下次」后，这条提醒会继续保持有效，并按新的检查日期重新计算提醒时间。
        </Text>

        <View className="checkup-completion-sheet__actions">
          <Button
            className="checkup-completion-sheet__btn checkup-completion-sheet__btn--ghost"
            onClick={() => handleComplete(false)}
          >
            完成不设下次
          </Button>
          <Button
            className="checkup-completion-sheet__btn checkup-completion-sheet__btn--primary"
            onClick={() => handleComplete(true)}
          >
            完成并设下次
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
