import { useMemo } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button } from '@taroify/core';

import { CHECKUP_STATUS } from '@/constants';
import ProgressBar from '@/components/ProgressBar';
import StatusTag from '@/components/StatusTag';
import { useCheckupActions, useDerivedCheckupById } from '@/hooks/useCheckups';

import './index.scss';

interface CheckupDetailProps {
  checkupId: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onComplete: (id: string) => void;
  onRestart: (id: string) => void;
}

export default function CheckupDetail({
  checkupId,
  onClose,
  onEdit,
  onComplete,
  onRestart
}: CheckupDetailProps) {
  const item = useDerivedCheckupById(checkupId);
  const { deleteCheckup, togglePause } = useCheckupActions();

  const relatedText = useMemo(() => {
    if (!item) return '';
    return item.relatedMedicineNames.length
      ? item.relatedMedicineNames.join('、')
      : '未关联药品';
  }, [item]);

  if (!item) {
    return (
      <View className="checkup-detail checkup-detail--empty">
        <Text className="checkup-detail__empty">检查提醒不存在或已删除</Text>
      </View>
    );
  }

  const paused = item.status === CHECKUP_STATUS.PAUSED;
  const done = item.status === CHECKUP_STATUS.DONE;
  const daysNumber = Math.abs(item.daysLeft);
  const daysText =
    item.daysLeft < 0
      ? '天 · 已逾期'
      : item.daysLeft === 0
        ? '今日需要检查'
        : '天后需要检查';

  const handleTogglePause = async () => {
    try {
      await togglePause(item.id);
      Taro.showToast({
        title: paused ? '提醒已恢复' : '提醒已暂停',
        icon: 'success'
      });
    } catch {
      Taro.showToast({ title: '操作失败，请稍后重试', icon: 'none' });
    }
  };

  const handleDelete = () => {
    Taro.showModal({
      title: '删除检查提醒',
      content: `确定删除「${item.title}」吗？这不会影响药箱中的药品记录。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ca4e41',
      success: async (result) => {
        if (!result.confirm) return;

        try {
          await deleteCheckup(item.id);
          Taro.showToast({ title: '检查提醒已删除', icon: 'success' });
          onClose();
        } catch {
          Taro.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
        }
      }
    });
  };

  return (
    <View className="checkup-detail">
      <View className="checkup-detail__header">
        <View className="checkup-detail__header-main">
          <Text className="checkup-detail__title">{item.title}</Text>
          <Text className="checkup-detail__type">
            {item.typeLabel} · {item.hospital || '医院未填'}
          </Text>
          {item.note ? (
            <Text className="checkup-detail__summary-note">{item.note}</Text>
          ) : null}
        </View>
        <StatusTag level={item.level} label={item.levelLabel} />
      </View>

      {!paused && !done ? (
        <View className="checkup-detail__days">
          <Text
            className={`checkup-detail__days-number checkup-detail__days-number--${item.level}`}
          >
            {item.daysLeft === 0 ? '' : daysNumber}
          </Text>
          <Text className="checkup-detail__days-text">{daysText}</Text>
        </View>
      ) : (
        <View className="checkup-detail__status-notice">
          <Text className="checkup-detail__status-text">
            {done
              ? '本次检查已完成，当前未安排下一次提醒。可重新安排检查继续跟踪。'
              : '检查提醒已暂停，点击下方「恢复提醒」继续跟踪。'}
          </Text>
        </View>
      )}

      <View className="checkup-detail__progress">
        <ProgressBar progress={item.progress} level={item.level} />
      </View>

      <View className="checkup-detail__grid">
        <View className="checkup-detail__info">
          <Text className="checkup-detail__label">检查日期</Text>
          <Text className="checkup-detail__value">{item.targetDate}</Text>
        </View>
        <View className="checkup-detail__info">
          <Text className="checkup-detail__label">提醒时间</Text>
          <Text className="checkup-detail__value">
            {item.remindDate} {item.remindTime}
          </Text>
        </View>
        <View className="checkup-detail__info">
          <Text className="checkup-detail__label">关联药品</Text>
          <Text className="checkup-detail__value">{relatedText}</Text>
        </View>
        <View className="checkup-detail__info">
          <Text className="checkup-detail__label">提前提醒</Text>
          <Text className="checkup-detail__value">
            提前 {item.remindAdvanceDays} 天
          </Text>
        </View>
      </View>

      {!done ? (
        <View className="checkup-detail__notice">
          <Text className="checkup-detail__notice-title">推荐操作</Text>
          <Text className="checkup-detail__notice-desc">
            如果已经完成复诊或检查，点击「完成检查」记录实际完成日期；需要继续跟踪时可同时设置下一次检查。
          </Text>
        </View>
      ) : null}

      <View className="checkup-detail__actions">
        {!done ? (
          <Button
            className="checkup-detail__primary"
            onClick={() => onComplete(item.id)}
          >
            完成检查
          </Button>
        ) : null}
        {done ? (
          <Button
            className="checkup-detail__primary"
            onClick={() => onRestart(item.id)}
          >
            重新安排检查
          </Button>
        ) : null}
        {!done ? (
          <Button
            className="checkup-detail__primary"
            onClick={() => onEdit(item.id)}
          >
            编辑提醒
          </Button>
        ) : null}
        {!done ? (
          <Button className="checkup-detail__ghost" onClick={handleTogglePause}>
            {paused ? '恢复提醒' : '暂停提醒'}
          </Button>
        ) : null}
        <Button className="checkup-detail__danger" onClick={handleDelete}>
          删除提醒
        </Button>
      </View>

      <View className="checkup-detail__history">
        <View className="checkup-detail__history-head">
          <Text className="checkup-detail__history-title">完成历史</Text>
          {item.completionHistory.length > 0 ? (
            <Text className="checkup-detail__history-count">
              最近 {item.completionHistory.length} 次
            </Text>
          ) : null}
        </View>
        {item.completionHistory.length > 0 ? (
          item.completionHistory.map((record, index) => (
            <View
              key={`${record.date}-${index}`}
              className="checkup-detail__history-item"
            >
              <Text className="checkup-detail__history-date">
                {record.date}
              </Text>
              <Text className="checkup-detail__history-desc">
                {record.note || '已完成本次检查'}
              </Text>
            </View>
          ))
        ) : (
          <Text className="checkup-detail__history-empty">暂无完成记录</Text>
        )}
      </View>
    </View>
  );
}
