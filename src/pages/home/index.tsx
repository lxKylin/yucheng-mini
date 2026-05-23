import { useState } from 'react';
import { EyeOutlined, Success } from '@taroify/icons';
import { Text, View } from '@tarojs/components';
import Taro, {
  useLoad,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';

import { REMINDER_STATUS, SHARE_IMAGE, SHARE_PATH } from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import CheckupComposer from '@/components/CheckupComposer';
import CheckupDetail from '@/components/CheckupDetail';
import DoneDateSheet from '@/components/DoneDateSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import MedicineComposer from '@/components/MedicineComposer';
import ReminderDetail from '@/components/ReminderDetail';
import { useCheckupActions } from '@/hooks/useCheckups';
import {
  type HomeRiskFeedItem,
  useHomeRiskFeed
} from '@/hooks/useHomeRiskFeed';
import { useDerivedList, useReminderActions } from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { useReminderSheet } from '@/hooks/useReminderSheet';
import type { DerivedCheckupReminder } from '@/types';

import './index.scss';

interface HomeRiskCardProps {
  item: HomeRiskFeedItem;
  onPrimary: () => void;
  onDetail: () => void;
}

type CheckupSheetMode = 'detail' | 'form' | null;

function HomeRiskCard({ item, onPrimary, onDetail }: HomeRiskCardProps) {
  const primaryLabel = item.type === 'medicine' ? '已开药' : '已检查';
  const primaryAria =
    item.type === 'medicine'
      ? `确认${item.title}已开药`
      : `完成${item.title}检查`;
  const detailAria =
    item.type === 'medicine'
      ? `查看${item.title}开药详情`
      : `查看${item.title}检查详情`;

  return (
    <View
      className={`home-risk-card home-risk-card--${item.level}`}
      onClick={onDetail}
    >
      <View className="home-risk-card__header">
        <View className="home-risk-card__identity">
          <Text className="home-risk-card__type">{item.typeLabel}</Text>
          <Text className="home-risk-card__title">{item.title}</Text>
        </View>
        <Text
          className={`home-risk-card__status home-risk-card__status--${item.level}`}
        >
          {item.levelLabel}
        </Text>
      </View>

      <View className="home-risk-card__dates">
        <View className="home-risk-card__date-block">
          <Text className="home-risk-card__date-label">目标日期</Text>
          <Text className="home-risk-card__date-value">{item.targetDate}</Text>
        </View>
        <View className="home-risk-card__date-block">
          <Text className="home-risk-card__date-label">提醒时间</Text>
          <Text className="home-risk-card__date-value">
            {item.remindDate} {item.remindTime}
          </Text>
        </View>
      </View>

      <View className="home-risk-card__meta">
        <Text className="home-risk-card__meta-text">{item.primaryMeta}</Text>
        <Text className="home-risk-card__meta-text">{item.secondaryMeta}</Text>
      </View>

      <View className="home-risk-card__actions">
        <View
          className={`home-risk-card__primary home-risk-card__primary--${item.level}`}
          role="button"
          aria-label={primaryAria}
          onClick={(event) => {
            event.stopPropagation();
            onPrimary();
          }}
        >
          <Success className="home-risk-card__action-icon" />
          <Text>{primaryLabel}</Text>
        </View>
        <View
          className="home-risk-card__detail"
          role="button"
          aria-label={detailAria}
          onClick={(event) => {
            event.stopPropagation();
            onDetail();
          }}
        >
          <EyeOutlined className="home-risk-card__detail-icon" />
          <Text>查看详情</Text>
        </View>
      </View>
    </View>
  );
}

export default function Home() {
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
  const [checkupSheetOpen, setCheckupSheetOpen] = useState(false);
  const [checkupSheetMode, setCheckupSheetMode] =
    useState<CheckupSheetMode>(null);
  const [activeCheckupId, setActiveCheckupId] = useState<string | undefined>();
  const [checkupFormKey, setCheckupFormKey] = useState(0);
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

  const openCheckupDetail = (id: string) => {
    setActiveCheckupId(id);
    setCheckupSheetMode('detail');
    setCheckupSheetOpen(true);
  };

  const openCheckupEdit = (id: string) => {
    setActiveCheckupId(id);
    setCheckupSheetMode('form');
    setCheckupFormKey((key) => key + 1);
    setCheckupSheetOpen(true);
  };

  const closeCheckupSheet = () => {
    setCheckupSheetOpen(false);
  };

  const handleCheckupSheetExited = () => {
    setCheckupSheetMode(null);
    setActiveCheckupId(undefined);
  };

  const handleCheckupFormSuccess = () => {
    closeCheckupSheet();
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
          <Text className="home-subhead__desc">按逾期、今日和临近事项排序</Text>
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
            <HomeRiskCard
              key={`${riskItem.type}-${riskItem.id}`}
              item={riskItem}
              onPrimary={() => {
                if (riskItem.type === 'medicine') {
                  handleMarkDone(riskItem.id);
                  return;
                }

                handleCompleteCheckup(riskItem.item);
              }}
              onDetail={() => {
                if (riskItem.type === 'medicine') {
                  openDetail(riskItem.id);
                  return;
                }

                openCheckupDetail(riskItem.id);
              }}
            />
          ))
        ) : (
          <View className="home-empty home-empty--card">
            <Text className="home-empty__badge">
              {hasRecords ? '当前节奏稳定' : '开始建立开药提醒'}
            </Text>
            <Text className="home-empty__title">
              {hasRecords ? '暂无待处理事项' : '还没有提醒'}
            </Text>
            <Text className="home-empty__desc">
              {hasRecords
                ? '你最近没有需要立即处理的任务，下一次临近提醒会优先显示在这里。'
                : '先建立第一条开药提醒，首页会优先显示逾期、今天和临近事项。'}
            </Text>
            {!hasRecords ? (
              <>
                <Text className="home-empty__hint">
                  点击右下角 + 新增开药提醒
                </Text>
                <Text className="home-empty__link" onClick={handleViewCheckups}>
                  检查/复诊提醒可在「检查」页新增
                </Text>
              </>
            ) : null}
          </View>
        )}
      </View>

      <FloatingAddReminder
        hidden={sheetActive || checkupSheetOpen}
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

      <BottomSheet
        open={checkupSheetOpen}
        title={checkupSheetMode === 'detail' ? '检查详情' : '编辑检查提醒'}
        onClose={closeCheckupSheet}
        onAfterClose={handleCheckupSheetExited}
      >
        {checkupSheetMode === 'detail' && activeCheckupId ? (
          <CheckupDetail
            checkupId={activeCheckupId}
            onClose={closeCheckupSheet}
            onEdit={openCheckupEdit}
          />
        ) : null}
        {checkupSheetMode === 'form' ? (
          <CheckupComposer
            key={checkupFormKey}
            checkupId={activeCheckupId}
            onSuccess={handleCheckupFormSuccess}
            onCancel={closeCheckupSheet}
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
