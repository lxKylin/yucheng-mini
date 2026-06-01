import { useMemo, useState } from 'react';
import { EyeOutlined, Success } from '@taroify/icons';
import { Text, View } from '@tarojs/components';
import Taro, {
  useLoad,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';

import { REMINDER_STATUS, SHARE_IMAGE, SHARE_PATH } from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import CheckupCompletionSheet from '@/components/CheckupCompletionSheet';
import CheckupComposer from '@/components/CheckupComposer';
import CheckupDetail from '@/components/CheckupDetail';
import CheckupRestartSheet from '@/components/CheckupRestartSheet';
import DoneDateSheet from '@/components/DoneDateSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import HomeHealthStatusEntry from '@/components/HomeHealthStatusEntry';
import MedicineComposer from '@/components/MedicineComposer';
import ReminderDetail from '@/components/ReminderDetail';
import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import {
  type HomeRiskFeedItem,
  useHomeRiskFeed
} from '@/hooks/useHomeRiskFeed';
import { useDerivedList, useReminderActions } from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { useReminderSheet } from '@/hooks/useReminderSheet';
import { withPageShare } from '@/utils/pageShare';

import '@/assets/images/share.jpg';

import './index.scss';

interface HomeRiskCardProps {
  item: HomeRiskFeedItem;
  onPrimary: () => void;
  onDetail: () => void;
}

type CheckupSheetMode = 'detail' | 'form' | null;
type PendingCheckupAction =
  | { type: 'completion'; id: string }
  | { type: 'restart'; id: string };

function HomeRiskCard({ item, onPrimary, onDetail }: HomeRiskCardProps) {
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
        <Text
          className={`home-risk-card__status home-risk-card__status--${item.level}`}
        >
          {item.riskLabel}
        </Text>
        <Text className="home-risk-card__type">{item.typeLabel}</Text>
      </View>

      <View className="home-risk-card__body">
        <Text className="home-risk-card__title">{item.title}</Text>
        <Text className="home-risk-card__summary">{item.actionSummary}</Text>
        {item.contextSummary ? (
          <Text className="home-risk-card__context">{item.contextSummary}</Text>
        ) : null}
        <Text
          className={`home-risk-card__time home-risk-card__time--${item.level}`}
        >
          {item.timeSummary}
        </Text>
      </View>

      <View className="home-risk-card__actions">
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
          <Text>{item.primaryActionLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function Home() {
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
  const [checkupSheetOpen, setCheckupSheetOpen] = useState(false);
  const [checkupSheetMode, setCheckupSheetMode] =
    useState<CheckupSheetMode>(null);
  const [activeCheckupId, setActiveCheckupId] = useState<string | undefined>();
  const [completionCheckupId, setCompletionCheckupId] = useState<string | null>(
    null
  );
  const [restartCheckupId, setRestartCheckupId] = useState<string | null>(null);
  const [pendingCheckupAction, setPendingCheckupAction] =
    useState<PendingCheckupAction | null>(null);
  const [checkupFormKey, setCheckupFormKey] = useState(0);
  const [healthStatusSheetOpen, setHealthStatusSheetOpen] = useState(false);
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
  const allCheckups = useDerivedCheckups();
  const riskFeed = useHomeRiskFeed({ limit: 3 });
  const { markDone } = useReminderActions();
  const medicineSheetTitle =
    sheetMode === 'form' && !editReminderId ? '新增提醒' : sheetTitle;

  const doneTarget =
    doneReminderId === null
      ? null
      : (allItems.find((item) => item.id === doneReminderId) ?? null);
  const completionTarget = useMemo(
    () =>
      completionCheckupId === null
        ? null
        : (allCheckups.find((item) => item.id === completionCheckupId) ?? null),
    [allCheckups, completionCheckupId]
  );
  const restartTarget = useMemo(
    () =>
      restartCheckupId === null
        ? null
        : (allCheckups.find((item) => item.id === restartCheckupId) ?? null),
    [allCheckups, restartCheckupId]
  );

  const hasDanger = riskFeed.overdueCount > 0 || riskFeed.todayCount > 0;
  const hasWarning = !hasDanger && riskFeed.warningCount > 0;
  const hasRecords = riskFeed.sourceTotal > 0;
  const heroClass = [
    'home-hero',
    hasDanger ? 'home-hero--danger' : '',
    hasWarning ? 'home-hero--warning' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const heroEyebrow = hasWarning ? '近期待办' : '今日待办';
  const heroTitle = hasWarning
    ? `${riskFeed.warningCount} 个 7 天内待安排`
    : `${riskFeed.overdueCount} 个已逾期，${riskFeed.todayCount} 个今天到期`;
  const heroDesc = hasDanger
    ? '建议先处理逾期或今日到期事项，再检查未来 7 天内需要提前安排的开药和复诊任务。'
    : hasWarning
      ? '已有事项进入准备窗口，建议先确认开药或检查安排，避免临近断药或复诊仓促。'
      : '近期没有紧急事项，继续保持当前记录节奏。';

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
    const nextAction = pendingCheckupAction;

    setCheckupSheetMode(null);
    setActiveCheckupId(undefined);

    if (!nextAction) {
      return;
    }

    setPendingCheckupAction(null);

    if (nextAction.type === 'completion') {
      setCompletionCheckupId(nextAction.id);
      return;
    }

    setRestartCheckupId(nextAction.id);
  };

  const handleCheckupFormSuccess = () => {
    closeCheckupSheet();
  };

  const openCheckupCompletion = (id: string) => {
    if (checkupSheetOpen) {
      setPendingCheckupAction({ type: 'completion', id });
      closeCheckupSheet();
      return;
    }

    setCompletionCheckupId(id);
  };

  const closeCheckupCompletion = () => {
    setCompletionCheckupId(null);
  };

  const openCheckupRestart = (id: string) => {
    if (checkupSheetOpen) {
      setPendingCheckupAction({ type: 'restart', id });
      closeCheckupSheet();
      return;
    }

    setRestartCheckupId(id);
  };

  const closeCheckupRestart = () => {
    setRestartCheckupId(null);
  };

  const closeDoneSheet = () => {
    setDoneReminderId(null);
  };

  useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
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
      <View className={heroClass}>
        <Text className="home-hero__eyebrow">{heroEyebrow}</Text>
        <Text className="home-hero__title">{heroTitle}</Text>
        <Text className="home-hero__desc">{heroDesc}</Text>
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

      <HomeHealthStatusEntry onOpenChange={setHealthStatusSheetOpen} />

      <View className="home-subhead">
        <View className="home-subhead__main">
          <Text className="home-subhead__title">优先待办</Text>
          <Text className="home-subhead__desc">按逾期、今日和临近事项排序</Text>
        </View>
        <View className="home-subhead__actions">
          <View className="home-subhead__action" onClick={handleViewAll}>
            <Text>全部提醒</Text>
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

                openCheckupCompletion(riskItem.item.id);
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
              {hasRecords ? '当前节奏稳定' : '开始建立提醒'}
            </Text>
            <Text className="home-empty__title">
              {hasRecords ? '暂无待处理事项' : '还没有提醒'}
            </Text>
            <Text className="home-empty__desc">
              {hasRecords
                ? '你最近没有需要立即处理的任务，下一次临近提醒会优先显示在这里。'
                : '先建立第一条提醒，首页会优先显示逾期、今天和临近事项。'}
            </Text>
            {!hasRecords ? (
              <>
                <Text className="home-empty__hint">点击右下角 + 新增提醒</Text>
                <Text className="home-empty__link" onClick={handleViewAll}>
                  也可前往提醒页管理全部提醒
                </Text>
              </>
            ) : null}
          </View>
        )}
      </View>

      <FloatingAddReminder
        ariaLabel="新增提醒"
        hidden={
          sheetActive ||
          healthStatusSheetOpen ||
          checkupSheetOpen ||
          completionTarget !== null ||
          restartTarget !== null
        }
        onClick={() => openCreate(true)}
      />

      <BottomSheet
        open={sheetOpen}
        title={medicineSheetTitle}
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
        {sheetMode === 'form' && editReminderId ? (
          <MedicineComposer
            key={formKey}
            medicineId={editReminderId}
            defaultReminderEnabled={true}
            onSuccess={handleFormSuccess}
            onCancel={closeSheet}
          />
        ) : null}
        {sheetMode === 'form' && !editReminderId ? (
          <UnifiedReminderComposer
            resetKey={formKey}
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
            onComplete={openCheckupCompletion}
            onRestart={openCheckupRestart}
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

      <CheckupCompletionSheet
        open={completionTarget !== null}
        item={completionTarget}
        onClose={closeCheckupCompletion}
      />

      <CheckupRestartSheet
        open={restartTarget !== null}
        item={restartTarget}
        onClose={closeCheckupRestart}
      />
    </View>
  );
}

export default withPageShare(Home);
