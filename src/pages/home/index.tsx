import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, {
  useLoad,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';

import { REMINDER_STATUS, SHARE_IMAGE, SHARE_PATH } from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import DoneDateSheet from '@/components/DoneDateSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import MedicineCard from '@/components/MedicineCard';
import MedicineComposer from '@/components/MedicineComposer';
import ReminderDetail from '@/components/ReminderDetail';
import CheckupCard from '@/components/CheckupCard';
import { useCheckupActions } from '@/hooks/useCheckups';
import { useHomeRiskFeed } from '@/hooks/useHomeRiskFeed';
import { useDerivedList, useReminderActions } from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { useReminderSheet } from '@/hooks/useReminderSheet';
import type { DerivedCheckupReminder } from '@/types';

import './index.scss';

export default function Home() {
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
  useTabScrollToTop();

  const {
    detailId,
    editReminderId,
    formKey,
    sheetActive,
    sheetMode,
    sheetOpen,
    sheetTitle,
    closeSheet,
    handleFormSuccess,
    handleSheetExited,
    openCreate,
    openDetail,
    openEdit
  } = useReminderSheet();
  const allItems = useDerivedList();
  const riskFeed = useHomeRiskFeed({ limit: 3 });
  const { markDone } = useReminderActions();
  const { completeCheckup } = useCheckupActions();

  const doneTarget =
    doneReminderId === null
      ? null
      : (allItems.find((item) => item.id === doneReminderId) ?? null);

  const hasDanger = riskFeed.overdueCount > 0 || riskFeed.todayCount > 0;
  const hasRecords = riskFeed.sourceTotal > 0;

  const handleMarkDone = (id: string) => {
    const target = allItems.find((item) => item.id === id);

    if (!target || target.status === REMINDER_STATUS.PAUSED) {
      return;
    }

    if (target.daysLeft < 0) {
      setDoneReminderId(id);
      return;
    }

    Taro.showModal({
      title: '确认已开药',
      content: `确认已完成「${target.name}」本次开药吗？系统会更新最近一盒日期并推算下一次提醒。`,
      confirmText: '确认',
      cancelText: '取消',
      confirmColor: '#157a66',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          await markDone(id);
          Taro.showToast({
            title: `${target.name} 已进入下一轮周期`,
            icon: 'success',
            duration: 1500
          });
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

  const handleViewAll = () => {
    Taro.switchTab({ url: '/pages/list/index' });
  };

  const handleViewCheckups = () => {
    Taro.switchTab({ url: '/pages/checkups/index' });
  };

  const handleCompleteCheckup = (item: DerivedCheckupReminder) => {
    Taro.showModal({
      title: '完成检查',
      content: `确认已完成「${item.title}」吗？可稍后在详情里设置下一次检查。`,
      confirmText: '完成',
      cancelText: '取消',
      confirmColor: '#157a66',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        try {
          await completeCheckup(item.id);
          Taro.showToast({ title: '检查已完成', icon: 'success' });
        } catch {
          Taro.showToast({ title: '更新失败，请稍后重试', icon: 'none' });
        }
      }
    });
  };

  const closeDoneSheet = () => {
    setDoneReminderId(null);
  };

  useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
    console.log('home page loaded');
  });

  useShareAppMessage(() => ({
    title: '我在用愈历管理长期用药提醒，也分享给你',
    path: SHARE_PATH,
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：开药提醒小程序',
    query: 'from=timeline',
    imageUrl: SHARE_IMAGE
  }));

  return (
    <View className="home-page">
      <View className={`home-hero${hasDanger ? ' home-hero--danger' : ''}`}>
        <Text className="home-hero__eyebrow">今日待办</Text>
        <Text className="home-hero__title">
          {riskFeed.overdueCount} 个已逾期，{riskFeed.todayCount} 个今天到期
        </Text>
        <Text className="home-hero__desc">
          {hasDanger
            ? '建议先处理逾期或今日到期事项，再检查未来 7 天内需要提前安排的开药和复诊任务。'
            : '近期没有紧急事项，继续保持当前记录节奏。'}
        </Text>
      </View>

      <View className="home-metrics">
        <View className="home-metric">
          <Text className="home-metric__value">{riskFeed.overdueCount}</Text>
          <Text className="home-metric__label">已逾期</Text>
        </View>
        <View className="home-metric">
          <Text className="home-metric__value">{riskFeed.todayCount}</Text>
          <Text className="home-metric__label">今日处理</Text>
        </View>
        <View className="home-metric">
          <Text className="home-metric__value">{riskFeed.warningCount}</Text>
          <Text className="home-metric__label">7天内</Text>
        </View>
      </View>

      <View className="home-subhead">
        <View className="home-subhead__main">
          <Text className="home-subhead__title">优先待办</Text>
          <Text className="home-subhead__desc">
            按逾期、今日和临近事项排序
          </Text>
        </View>
        <View className="home-subhead__actions">
          <View className="home-subhead__action" onClick={handleViewAll}>
            <Text>提醒</Text>
          </View>
          <View className="home-subhead__action" onClick={handleViewCheckups}>
            <Text>检查</Text>
          </View>
        </View>
      </View>
      <View className="home-risk-list">
        {riskFeed.items.length > 0 ? (
          riskFeed.items.map((riskItem) => (
            <View
              key={`${riskItem.type}-${riskItem.id}`}
              className="home-risk-card"
            >
              <View className="home-risk-card__bar">
                <Text
                  className={`home-risk-card__type home-risk-card__type--${riskItem.type}`}
                >
                  {riskItem.typeLabel}
                </Text>
                <Text className="home-risk-card__date">
                  目标日期 {riskItem.targetDate}
                </Text>
              </View>
              {riskItem.type === 'medicine' ? (
                <MedicineCard
                  item={riskItem.item}
                  onDone={() => handleMarkDone(riskItem.id)}
                  onDetail={() => openDetail(riskItem.id)}
                />
              ) : (
                <CheckupCard
                  item={riskItem.item}
                  onClick={handleViewCheckups}
                  onComplete={() => handleCompleteCheckup(riskItem.item)}
                />
              )}
            </View>
          ))
        ) : (
          <View className="home-empty home-empty--card">
            <Text className="home-empty__badge">
              {hasRecords ? '当前节奏稳定' : '开始建立提醒'}
            </Text>
            <Text className="home-empty__title">
              {hasRecords ? '暂无待处理事项' : '还没有提醒'}
            </Text>
            <Text className="home-empty__desc">
              {hasRecords
                ? '你最近没有需要立即处理的任务，下一次临近提醒会优先显示在这里。'
                : '新增第一条开药或检查提醒后，这里会显示最需要处理的任务。'}
            </Text>
            {!hasRecords ? (
              <Text className="home-empty__hint">
                点击右下角 + 开始新增提醒
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <FloatingAddReminder
        hidden={sheetActive}
        onClick={() => openCreate(true)}
      />

      <BottomSheet
        open={sheetOpen}
        title={sheetTitle}
        onClose={closeSheet}
        onAfterClose={handleSheetExited}
      >
        {sheetMode === 'detail' && detailId ? (
          <ReminderDetail
            reminderId={detailId}
            onClose={closeSheet}
            onEdit={openEdit}
          />
        ) : null}
        {sheetMode === 'form' ? (
          <MedicineComposer
            key={formKey}
            medicineId={editReminderId}
            defaultReminderEnabled={true}
            onSuccess={handleFormSuccess}
            onCancel={closeSheet}
          />
        ) : null}
      </BottomSheet>

      <DoneDateSheet
        open={doneTarget !== null}
        item={doneTarget}
        onClose={closeDoneSheet}
      />
    </View>
  );
}
