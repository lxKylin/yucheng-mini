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
import { useCheckupHomeSummary } from '@/hooks/useCheckups';
import { useDerivedList, useReminderActions } from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { useReminderSheet } from '@/hooks/useReminderSheet';

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
  const checkupSummary = useCheckupHomeSummary();
  const { markDone } = useReminderActions();

  const doneTarget =
    doneReminderId === null
      ? null
      : (allItems.find((item) => item.id === doneReminderId) ?? null);

  const overdueCount = allItems.filter(
    (item) => item.status !== REMINDER_STATUS.PAUSED && item.daysLeft < 0
  ).length;
  const todayCount = allItems.filter(
    (item) => item.status !== REMINDER_STATUS.PAUSED && item.daysLeft === 0
  ).length;
  const totalOverdueCount = overdueCount + checkupSummary.overdueCount;
  const totalTodayCount = todayCount + checkupSummary.todayCount;
  const hasDanger = totalOverdueCount > 0 || totalTodayCount > 0;
  const urgent = allItems
    .filter((item) => item.status !== REMINDER_STATUS.PAUSED)
    .slice(0, 3);
  const hasRecords = allItems.length > 0;

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
          {totalOverdueCount} 个已逾期，{totalTodayCount} 个今天到期
        </Text>
        <Text className="home-hero__desc">
          {hasDanger
            ? '建议先处理逾期或今日到期事项，再检查未来 7 天内需要提前安排的开药和复诊任务。'
            : '近期没有紧急开药任务，继续保持当前记录节奏。'}
        </Text>
      </View>

      <View className="home-metrics">
        <View className="home-metric">
          <Text className="home-metric__value">{totalOverdueCount}</Text>
          <Text className="home-metric__label">已逾期</Text>
        </View>
        <View className="home-metric">
          <Text className="home-metric__value">{totalTodayCount}</Text>
          <Text className="home-metric__label">今日处理</Text>
        </View>
        <View className="home-metric">
          <Text className="home-metric__value">{checkupSummary.total}</Text>
          <Text className="home-metric__label">检查数</Text>
        </View>
      </View>

      <View className="home-subhead">
        <View className="home-subhead__main">
          <Text className="home-subhead__title">最近提醒</Text>
          <Text className="home-subhead__desc">
            仅展示最近 3 条，更多提醒请查看全部
          </Text>
        </View>
        <View className="home-subhead__action" onClick={handleViewAll}>
          <Text>查看全部</Text>
        </View>
      </View>
      <View className="home-cards">
        {urgent.length > 0 ? (
          urgent.map((item) => (
            <MedicineCard
              key={item.id}
              item={item}
              onDone={() => handleMarkDone(item.id)}
              onDetail={() => openDetail(item.id)}
            />
          ))
        ) : (
          <View className="home-empty home-empty--card">
            <Text className="home-empty__badge">
              {hasRecords ? '当前节奏稳定' : '开始建立提醒'}
            </Text>
            <Text className="home-empty__title">
              {hasRecords ? '暂无待处理提醒' : '还没有开药提醒'}
            </Text>
            <Text className="home-empty__desc">
              {hasRecords
                ? '你最近没有需要立即处理的任务，下一次临近提醒会优先显示在这里。'
                : '新增第一条提醒后，这里会显示最近需要处理的开药任务。'}
            </Text>
            {!hasRecords ? (
              <Text className="home-empty__hint">
                点击右下角 + 开始新增提醒
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {checkupSummary.urgent.length > 0 ? (
        <>
          <View className="home-subhead">
            <View className="home-subhead__main">
              <Text className="home-subhead__title">紧急检查</Text>
              <Text className="home-subhead__desc">
                今日或逾期的复诊检查会优先露出
              </Text>
            </View>
            <View className="home-subhead__action" onClick={handleViewCheckups}>
              <Text>查看检查</Text>
            </View>
          </View>
          <View className="home-checkups">
            {checkupSummary.urgent.map((item) => (
              <CheckupCard
                key={item.id}
                item={item}
                onClick={handleViewCheckups}
                onComplete={handleViewCheckups}
              />
            ))}
          </View>
        </>
      ) : null}

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
