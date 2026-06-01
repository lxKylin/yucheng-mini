import { EyeOutlined, Success } from '@taroify/icons';
import { Text, View } from '@tarojs/components';

import { CHECKUP_STATUS, REMINDER_LEVEL } from '@/constants';
import ProgressBar from '@/components/ProgressBar';
import StatusTag from '@/components/StatusTag';
import type { DerivedCheckupReminder } from '@/types';

import './index.scss';

interface CheckupCardProps {
  item: DerivedCheckupReminder;
  onDetail?: () => void;
  onComplete?: () => void;
}

export default function CheckupCard({
  item,
  onDetail,
  onComplete
}: CheckupCardProps) {
  const accent =
    item.status === CHECKUP_STATUS.DONE
      ? 'done'
      : item.level === REMINDER_LEVEL.DANGER
        ? 'danger'
        : item.level === REMINDER_LEVEL.WARNING
          ? 'warning'
          : item.level === REMINDER_LEVEL.PAUSED
            ? 'paused'
            : 'success';
  const relatedText = item.relatedMedicineNames.length
    ? item.relatedMedicineNames.join('、')
    : '未关联药品';
  const canComplete = item.status === CHECKUP_STATUS.ACTIVE;
  const doneColor =
    item.level === REMINDER_LEVEL.DANGER
      ? 'danger'
      : item.level === REMINDER_LEVEL.WARNING
        ? 'warning'
        : 'success';

  return (
    <View className={`checkup-card checkup-card--${accent}`}>
      <View className="checkup-card__header">
        <View className="checkup-card__title-wrap">
          <View className="checkup-card__type-tag">
            <Text className="checkup-card__type-tag-text">检查</Text>
          </View>
          <Text className="checkup-card__title">{item.title}</Text>
        </View>
        <StatusTag level={item.level} label={item.levelLabel} />
      </View>

      <Text className="checkup-card__meta">
        {item.typeLabel} · {item.hospital || '医院未填'}
      </Text>
      <Text className="checkup-card__meta">关联：{relatedText}</Text>
      <Text
        className={`checkup-card__meta checkup-card__meta--accent checkup-card__meta--${accent}`}
      >
        检查日期: {item.targetDate}
      </Text>
      <Text
        className={`checkup-card__meta checkup-card__meta--accent checkup-card__meta--${accent}`}
      >
        提醒时间: {item.remindDate} {item.remindTime}
      </Text>

      <View className="checkup-card__progress">
        <ProgressBar progress={item.progress} level={item.level} />
      </View>

      <View className="checkup-card__actions">
        {canComplete ? (
          <View
            className={`checkup-card__btn checkup-card__btn--${doneColor}`}
            role="button"
            aria-label={`完成${item.title}`}
            onClick={onComplete}
          >
            <Success className="checkup-card__btn-icon" />
            <Text className="checkup-card__btn-text">已检查</Text>
          </View>
        ) : null}
        <View
          className={`checkup-card__btn checkup-card__btn--ghost${canComplete ? '' : ' checkup-card__btn--wide'}`}
          role="button"
          aria-label={`查看${item.title}详情`}
          onClick={onDetail}
        >
          <EyeOutlined className="checkup-card__btn-icon" />
          <Text className="checkup-card__btn-text">查看详情</Text>
        </View>
      </View>
    </View>
  );
}
