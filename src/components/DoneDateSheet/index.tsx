import { useEffect, useState } from 'react';
import { Picker, Text, View } from '@tarojs/components';
import type { BaseEventOrig, PickerDateProps } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Input } from '@taroify/core';

import BottomSheet from '@/components/BottomSheet';
import { useReminderActions } from '@/hooks/useReminders';
import { useSubmissionGuard } from '@/hooks/useSubmissionGuard';
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
const QUANTITY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function sanitizeQuantity(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex < 0) return cleaned;
  return `${cleaned.slice(0, dotIndex + 1)}${cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, '')}`;
}

export default function DoneDateSheet({
  open,
  item,
  onClose,
  onSuccess
}: DoneDateSheetProps) {
  const { markDone } = useReminderActions();
  const { submitting, runSubmission, isSubmitting } = useSubmissionGuard();
  const [selectedDate, setSelectedDate] = useState(today());
  const [inventoryQuantity, setInventoryQuantity] = useState('');
  const [inventoryLater, setInventoryLater] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setSelectedDate(today());
    setInventoryQuantity('');
    setInventoryLater(false);
  }, [item, open]);

  if (!item) return null;

  const startDate = item.currentPrescriptionDate || item.nextPrescriptionDate;
  const endDate = today();

  const handleConfirm = async () => {
    if (isSubmitting()) return;
    if (selectedDate > endDate) {
      Taro.showToast({
        title: '实际日期不能晚于今天',
        icon: 'none',
        duration: 1800
      });
      return;
    }

    const parsedQuantity = Number(inventoryQuantity);
    if (
      item.inventoryTrackingEnabled &&
      !inventoryLater &&
      (!QUANTITY_PATTERN.test(inventoryQuantity) ||
        !Number.isFinite(parsedQuantity) ||
        parsedQuantity < 0)
    ) {
      Taro.showToast({
        title: '请填写开药后的当前总量，或选择稍后盘点',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      await runSubmission(async () => {
        await markDone(item.id, {
          date: selectedDate,
          inventoryQuantity:
            item.inventoryTrackingEnabled && !inventoryLater
              ? parsedQuantity
              : undefined,
          inventoryLater: item.inventoryTrackingEnabled && inventoryLater
        });
      });
      Taro.showToast({
        title: inventoryLater
          ? `${item.name} 已记录，等待重新盘点`
          : `${item.name} 已按实际日期更新`,
        icon: 'success',
        duration: 1600
      });
      onClose();
      onSuccess?.();
    } catch {
      Taro.showToast({
        title: '更新失败，输入已保留，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  };

  return (
    <BottomSheet
      open={open}
      title="记录本次已开药"
      closeDisabled={submitting}
      onClose={onClose}
    >
      <View className="done-date-sheet">
        <View className="done-date-sheet__notice">
          <Text className="done-date-sheet__notice-title">
            {item.daysLeft < 0
              ? `当前已逾期 ${Math.abs(item.daysLeft)} 天`
              : `确认「${item.name}」本次开药`}
          </Text>
          <Text className="done-date-sheet__notice-desc">
            确认后会更新开药历史，并以实际日期推算下一轮提醒。
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
            start={startDate}
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

        {item.inventoryTrackingEnabled ? (
          <View className="done-date-sheet__inventory">
            <View className="done-date-sheet__field">
              <Text className="done-date-sheet__label">开药后的当前总量</Text>
              <View className="done-date-sheet__quantity-row">
                <Input
                  className="done-date-sheet__quantity-input"
                  value={inventoryQuantity}
                  type="digit"
                  disabled={inventoryLater}
                  placeholder="包含旧药余量和本次新开药品"
                  onChange={(event) =>
                    setInventoryQuantity(sanitizeQuantity(event.detail.value))
                  }
                />
                <Text className="done-date-sheet__quantity-unit">
                  {item.dosageUnit}
                </Text>
              </View>
            </View>

            <View
              className={`done-date-sheet__later${inventoryLater ? ' done-date-sheet__later--active' : ''}`}
              role="button"
              aria-label="稍后盘点"
              onClick={() => setInventoryLater((value) => !value)}
            >
              <View className="done-date-sheet__later-check">
                <Text>{inventoryLater ? '✓' : ''}</Text>
              </View>
              <View>
                <Text className="done-date-sheet__later-title">稍后盘点</Text>
                <Text className="done-date-sheet__later-desc">
                  先保存开药日期，药箱暂停展示旧的预计余量
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text className="done-date-sheet__tip">
            此药品未开启余量跟踪，无需填写药品总量。
          </Text>
        )}

        <View className="done-date-sheet__actions">
          <Button
            className="done-date-sheet__btn done-date-sheet__btn--ghost"
            disabled={submitting}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            className="done-date-sheet__btn done-date-sheet__btn--primary"
            loading={submitting}
            disabled={submitting}
            onClick={handleConfirm}
          >
            {submitting ? '保存中...' : '确认已开药'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
