import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro, {
  usePullDownRefresh,
  useReachBottom,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';
import { Search } from '@taroify/icons';

import { REMINDER_STATUS, SHARE_IMAGE, SHARE_PATH } from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import CheckupCard from '@/components/CheckupCard';
import CheckupCompletionSheet from '@/components/CheckupCompletionSheet';
import CheckupComposer from '@/components/CheckupComposer';
import CheckupDetail from '@/components/CheckupDetail';
import CheckupRestartSheet from '@/components/CheckupRestartSheet';
import DoneDateSheet from '@/components/DoneDateSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import ListLoadStatus from '@/components/ListLoadStatus';
import MedicineCard from '@/components/MedicineCard';
import MedicineComposer from '@/components/MedicineComposer';
import ReminderDetail from '@/components/ReminderDetail';
import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { useDerivedList, useReminderActions } from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import {
  type UnifiedReminderItem,
  type UnifiedReminderStatus,
  type UnifiedReminderType,
  UNIFIED_STATUS_FILTERS,
  UNIFIED_TYPE_FILTERS,
  useUnifiedReminderCenter
} from '@/hooks/useUnifiedReminderCenter';
import { fetchCheckups } from '@/services/checkup';
import { fetchReminders } from '@/services/reminder';
import { checkupStore } from '@/store/checkupStore';
import { reminderStore } from '@/store/reminderStore';
import { withPageShare } from '@/utils/pageShare';

import './index.scss';

type MedicineSheetMode = 'form' | 'detail' | null;
type CheckupSheetMode = 'form' | 'detail' | null;
type PendingCheckupAction =
  | { type: 'completion'; id: string }
  | { type: 'restart'; id: string };

function ListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<UnifiedReminderType>('all');
  const [activeStatus, setActiveStatus] =
    useState<UnifiedReminderStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [medicineSheetOpen, setMedicineSheetOpen] = useState(false);
  const [medicineSheetMode, setMedicineSheetMode] =
    useState<MedicineSheetMode>(null);
  const [activeMedicineId, setActiveMedicineId] = useState<
    string | undefined
  >();
  const [medicineFormKey, setMedicineFormKey] = useState(0);
  const [checkupSheetOpen, setCheckupSheetOpen] = useState(false);
  const [checkupSheetMode, setCheckupSheetMode] =
    useState<CheckupSheetMode>(null);
  const [activeCheckupId, setActiveCheckupId] = useState<string | undefined>();
  const [checkupFormKey, setCheckupFormKey] = useState(0);
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [restartId, setRestartId] = useState<string | null>(null);
  const [pendingCheckupAction, setPendingCheckupAction] =
    useState<PendingCheckupAction | null>(null);
  useTabScrollToTop();

  const allMedicines = useDerivedList();
  const allCheckups = useDerivedCheckups();
  const { filteredItems, counts, resetKey, sourceTotal } =
    useUnifiedReminderCenter({
      type: activeType,
      status: activeStatus,
      searchTerm
    });
  const { markDone } = useReminderActions();
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useIncrementalList(filteredItems, resetKey);

  const doneTarget =
    doneReminderId === null
      ? null
      : (allMedicines.find((item) => item.id === doneReminderId) ?? null);
  const completionTarget = useMemo(
    () =>
      completionId === null
        ? null
        : (allCheckups.find((item) => item.id === completionId) ?? null),
    [allCheckups, completionId]
  );
  const restartTarget = useMemo(
    () =>
      restartId === null
        ? null
        : (allCheckups.find((item) => item.id === restartId) ?? null),
    [allCheckups, restartId]
  );

  const refreshUnifiedReminders = async () => {
    try {
      const [nextMedicines, nextCheckups] = await Promise.all([
        fetchReminders(),
        fetchCheckups()
      ]);

      reminderStore.setState({ reminders: nextMedicines });
      checkupStore.setState({ checkups: nextCheckups });
    } catch {
      Taro.showToast({
        title: '刷新失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    } finally {
      Taro.stopPullDownRefresh();
    }
  };

  usePullDownRefresh(() => {
    void refreshUnifiedReminders();
  });

  useReachBottom(() => {
    if (hasMore) {
      loadMore();
    }
  });

  const openCreate = () => {
    setCreateKey((key) => key + 1);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
  };

  const openMedicineDetail = (id: string) => {
    setActiveMedicineId(id);
    setMedicineSheetMode('detail');
    setMedicineSheetOpen(true);
  };

  const openMedicineEdit = (id: string) => {
    setActiveMedicineId(id);
    setMedicineSheetMode('form');
    setMedicineFormKey((key) => key + 1);
    setMedicineSheetOpen(true);
  };

  const closeMedicineSheet = () => {
    setMedicineSheetOpen(false);
  };

  const handleMedicineSheetExited = () => {
    setMedicineSheetMode(null);
    setActiveMedicineId(undefined);
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
      setCompletionId(nextAction.id);
      return;
    }

    setRestartId(nextAction.id);
  };

  const openCompletion = (id: string) => {
    if (checkupSheetOpen) {
      setPendingCheckupAction({ type: 'completion', id });
      closeCheckupSheet();
      return;
    }

    setCompletionId(id);
  };

  const closeCompletion = () => {
    setCompletionId(null);
  };

  const openRestart = (id: string) => {
    if (checkupSheetOpen) {
      setPendingCheckupAction({ type: 'restart', id });
      closeCheckupSheet();
      return;
    }

    setRestartId(id);
  };

  const closeRestart = () => {
    setRestartId(null);
  };

  const closeDoneSheet = () => {
    setDoneReminderId(null);
  };

  const handleMarkDone = (id: string) => {
    const target = allMedicines.find((item) => item.id === id);

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
      success: async (result) => {
        if (!result.confirm) {
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

  const renderUnifiedItem = (entry: UnifiedReminderItem) => {
    if (entry.type === 'medicine') {
      return (
        <MedicineCard
          key={entry.listKey}
          item={entry.item}
          showActions
          onDone={() => handleMarkDone(entry.id)}
          onDetail={() => openMedicineDetail(entry.id)}
        />
      );
    }

    return (
      <CheckupCard
        key={entry.listKey}
        item={entry.item}
        onDetail={() => openCheckupDetail(entry.id)}
        onComplete={() => openCompletion(entry.id)}
      />
    );
  };

  const activeTypeCount =
    activeType === 'all' ? sourceTotal : counts.type[activeType];
  const emptyText =
    sourceTotal === 0
      ? '暂无提醒，点击下方 + 添加'
      : searchTerm.trim()
        ? '没有符合条件的提醒'
        : activeTypeCount === 0
          ? activeType === 'checkup'
            ? '还没有检查提醒，点击下方 + 添加'
            : '还没有开药提醒，点击下方 + 添加'
          : '当前筛选没有结果，换个状态试试';
  const sheetActive =
    createOpen ||
    medicineSheetOpen ||
    checkupSheetOpen ||
    doneTarget !== null ||
    completionTarget !== null ||
    restartTarget !== null;

  Taro.useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
  });

  useShareAppMessage(() => ({
    title: '愈历：把开药和检查提醒管理得更清楚',
    path: SHARE_PATH,
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：长期用药和复诊检查提醒',
    query: 'from=list-timeline',
    imageUrl: SHARE_IMAGE
  }));

  return (
    <View className="list-page">
      <View className="list-search">
        <View className="list-search__icon" aria-hidden="true">
          <Search />
        </View>
        <Input
          className="list-search__input"
          value={searchTerm}
          placeholder="搜索药品、检查事项或医院"
          placeholderClass="list-search__placeholder"
          onInput={(event) => setSearchTerm(event.detail.value)}
        />
      </View>

      <View className="list-type-filters">
        {UNIFIED_TYPE_FILTERS.map(({ key, label }) => (
          <View
            key={key}
            className={`list-type-filter${activeType === key ? ' list-type-filter--active' : ''}`}
            role="button"
            aria-label={`${label} ${counts.type[key]}`}
            onClick={() => setActiveType(key)}
          >
            <Text className="list-type-filter__text">
              {label} {counts.type[key]}
            </Text>
          </View>
        ))}
      </View>

      <View className="list-filters">
        {UNIFIED_STATUS_FILTERS.map(({ key, label }) => (
          <View
            key={key}
            className={`list-filter${activeStatus === key ? ' list-filter--active' : ''}`}
            role="button"
            aria-label={`${label} ${counts.status[key]}`}
            onClick={() => setActiveStatus(key)}
          >
            <Text className="list-filter__text">
              {label} {counts.status[key]}
            </Text>
          </View>
        ))}
      </View>

      <View className="list-content">
        {filteredItems.length > 0 ? (
          <>
            {visibleItems.map(renderUnifiedItem)}
            <ListLoadStatus
              visibleCount={visibleCount}
              totalCount={totalCount}
              hasMore={hasMore}
            />
          </>
        ) : (
          <View className="list-empty">
            <Text className="list-empty__icon">
              {sourceTotal === 0 ? '+' : '-'}
            </Text>
            <Text className="list-empty__text">{emptyText}</Text>
          </View>
        )}
      </View>

      <FloatingAddReminder
        ariaLabel="新增提醒"
        hidden={sheetActive}
        onClick={openCreate}
      />

      <BottomSheet open={createOpen} title="新增提醒" onClose={closeCreate}>
        <UnifiedReminderComposer
          resetKey={createKey}
          onSuccess={closeCreate}
          onCancel={closeCreate}
        />
      </BottomSheet>

      <BottomSheet
        open={medicineSheetOpen}
        title={medicineSheetMode === 'detail' ? '提醒详情' : '编辑药品'}
        onClose={closeMedicineSheet}
        onAfterClose={handleMedicineSheetExited}
      >
        {medicineSheetMode === 'detail' && activeMedicineId ? (
          <ReminderDetail
            reminderId={activeMedicineId}
            onClose={closeMedicineSheet}
            onEdit={openMedicineEdit}
          />
        ) : null}
        {medicineSheetMode === 'form' ? (
          <MedicineComposer
            key={medicineFormKey}
            medicineId={activeMedicineId}
            defaultReminderEnabled
            onSuccess={closeMedicineSheet}
            onCancel={closeMedicineSheet}
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
            onComplete={openCompletion}
            onRestart={openRestart}
          />
        ) : null}
        {checkupSheetMode === 'form' ? (
          <CheckupComposer
            key={checkupFormKey}
            checkupId={activeCheckupId}
            onSuccess={closeCheckupSheet}
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
        onClose={closeCompletion}
      />

      <CheckupRestartSheet
        open={restartTarget !== null}
        item={restartTarget}
        onClose={closeRestart}
      />
    </View>
  );
}

export default withPageShare(ListPage);
