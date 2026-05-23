import { Text, View } from '@tarojs/components';
import { Success } from '@taroify/icons';

import { CHECKUP_STATUS, REMINDER_LEVEL } from '@/constants';
import StatusTag from '@/components/StatusTag';
import type { DerivedCheckupReminder } from '@/types';

import './index.scss';

interface CheckupCardProps {
  item: DerivedCheckupReminder;
  onClick?: () => void;
  onComplete?: () => void;
}

export default function CheckupCard({
  item,
  onClick,
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
            : 'good';
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
    <View className={`checkup-card checkup-card--${accent}`} onClick={onClick}>
      <View className="checkup-card__top">
        {/* <View className="checkup-card__mark">
          <Text className="checkup-card__mark-text">
            {item.typeLabel.slice(0, 1)}
          </Text>
        </View> */}
        <View className="checkup-card__main">
          <View className="checkup-card__headline">
            <Text className="checkup-card__title">{item.title}</Text>
            <StatusTag level={item.level} label={item.levelLabel} />
          </View>
          <Text className="checkup-card__type">
            {item.typeLabel} · {item.hospital || '医院未填'}
          </Text>
        </View>
      </View>

      <View className="checkup-card__date-row">
        <View className="checkup-card__date-block">
          <Text className="checkup-card__date-label">目标日期</Text>
          <Text className="checkup-card__date-value">{item.targetDate}</Text>
        </View>
        <View className="checkup-card__date-block">
          <Text className="checkup-card__date-label">提醒时间</Text>
          <Text className="checkup-card__date-value">
            {item.remindDate} {item.remindTime}
          </Text>
        </View>
      </View>

      <Text className="checkup-card__related">关联：{relatedText}</Text>

      <View className="checkup-card__footer">
        <Text className="checkup-card__hint">
          {item.status === CHECKUP_STATUS.DONE
            ? '已完成，历史记录可在详情查看'
            : item.note || '点击查看详情和操作'}
        </Text>
        {canComplete ? (
          <View
            className={`checkup-card__done checkup-card__done--${doneColor}`}
            role="button"
            aria-label={`完成${item.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onComplete?.();
            }}
          >
            <Success className="checkup-card__done-icon" />
            <Text className="checkup-card__done-text">完成检查</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
