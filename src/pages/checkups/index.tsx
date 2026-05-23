import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { Search } from '@taroify/icons';

import {
  CHECKUP_STATUS,
  CHECKUP_TYPE_OPTIONS,
  REMINDER_LEVEL,
  SHARE_IMAGE,
  SHARE_PATH
} from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import CheckupCard from '@/components/CheckupCard';
import CheckupCompletionSheet from '@/components/CheckupCompletionSheet';
import CheckupComposer from '@/components/CheckupComposer';
import CheckupDetail from '@/components/CheckupDetail';
import CheckupRestartSheet from '@/components/CheckupRestartSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import type { CheckupType, DerivedCheckupReminder, ReminderLevel } from '@/types';

import './index.scss';

type StatusFilter = 'all' | ReminderLevel | 'done';
type TypeFilter = 'all' | CheckupType;
type SheetMode = 'form' | 'detail' | null;
type PendingCheckupAction =
  | { type: 'completion'; id: string }
  | { type: 'restart'; id: string };

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: REMINDER_LEVEL.DANGER, label: '逾期今日' },
  { key: REMINDER_LEVEL.WARNING, label: '7天内' },
  { key: REMINDER_LEVEL.GOOD, label: '正常' },
  { key: REMINDER_LEVEL.PAUSED, label: '暂停' },
  { key: 'done', label: '已完成' }
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: '全部类型' },
  ...CHECKUP_TYPE_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label
  }))
];

function buildSearchText(item: DerivedCheckupReminder) {
  return [
    item.title,
    item.typeLabel,
    item.hospital,
    item.note,
    item.relatedMedicineNames.join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function CheckupsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [restartId, setRestartId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingCheckupAction | null>(null);
  const [formKey, setFormKey] = useState(0);
  useTabScrollToTop();

  const checkups = useDerivedCheckups();
  const completionTarget = useMemo(
    () =>
      completionId === null
        ? null
        : (checkups.find((item) => item.id === completionId) ?? null),
    [checkups, completionId]
  );
  const restartTarget = useMemo(
    () =>
      restartId === null
        ? null
        : (checkups.find((item) => item.id === restartId) ?? null),
    [checkups, restartId]
  );

  const counts = useMemo<Record<StatusFilter, number>>(
    () => ({
      all: checkups.length,
      [REMINDER_LEVEL.DANGER]: checkups.filter(
        (item) =>
          item.status === CHECKUP_STATUS.ACTIVE &&
          item.level === REMINDER_LEVEL.DANGER
      ).length,
      [REMINDER_LEVEL.WARNING]: checkups.filter(
        (item) =>
          item.status === CHECKUP_STATUS.ACTIVE &&
          item.level === REMINDER_LEVEL.WARNING
      ).length,
      [REMINDER_LEVEL.GOOD]: checkups.filter(
        (item) =>
          item.status === CHECKUP_STATUS.ACTIVE &&
          item.level === REMINDER_LEVEL.GOOD
      ).length,
      [REMINDER_LEVEL.PAUSED]: checkups.filter(
        (item) => item.status === CHECKUP_STATUS.PAUSED
      ).length,
      done: checkups.filter((item) => item.status === CHECKUP_STATUS.DONE)
        .length
    }),
    [checkups]
  );

  const filteredCheckups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return checkups.filter((item) => {
      const byStatus =
        activeStatus === 'all' ||
        (activeStatus === 'done' && item.status === CHECKUP_STATUS.DONE) ||
        (activeStatus === REMINDER_LEVEL.PAUSED &&
          item.status === CHECKUP_STATUS.PAUSED) ||
        (item.status === CHECKUP_STATUS.ACTIVE &&
          item.level === activeStatus);
      const byType = activeType === 'all' || item.type === activeType;
      const bySearch = !term || buildSearchText(item).includes(term);

      return byStatus && byType && bySearch;
    });
  }, [activeStatus, activeType, checkups, searchTerm]);

  const openCreate = () => {
    setActiveId(undefined);
    setSheetMode('form');
    setFormKey((key) => key + 1);
    setSheetOpen(true);
  };

  const openDetail = (id: string) => {
    setActiveId(id);
    setSheetMode('detail');
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
    setActiveId(id);
    setSheetMode('form');
    setFormKey((key) => key + 1);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const handleSheetExited = () => {
    const nextAction = pendingAction;

    setSheetMode(null);
    setActiveId(undefined);

    if (!nextAction) {
      return;
    }

    setPendingAction(null);

    if (nextAction.type === 'completion') {
      setCompletionId(nextAction.id);
      return;
    }

    setRestartId(nextAction.id);
  };

  const handleFormSuccess = () => {
    closeSheet();
  };

  const openCompletion = (id: string) => {
    if (sheetOpen) {
      setPendingAction({ type: 'completion', id });
      closeSheet();
      return;
    }

    setCompletionId(id);
  };

  const closeCompletion = () => {
    setCompletionId(null);
  };

  const openRestart = (id: string) => {
    if (sheetOpen) {
      setPendingAction({ type: 'restart', id });
      closeSheet();
      return;
    }

    setRestartId(id);
  };

  const closeRestart = () => {
    setRestartId(null);
  };

  Taro.useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
  });

  useShareAppMessage(() => ({
    title: '愈历：复诊和检查提醒也能整理清楚',
    path: SHARE_PATH,
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：长期用药复诊检查提醒',
    query: 'from=checkups-timeline',
    imageUrl: SHARE_IMAGE
  }));

  return (
    <View className="checkups-page">
      <View className="checkups-search">
        <View className="checkups-search__icon" aria-hidden="true">
          <Search />
        </View>
        <Input
          className="checkups-search__input"
          value={searchTerm}
          placeholder="搜索检查事项、医院或关联药品"
          placeholderClass="checkups-search__placeholder"
          onInput={(event) => setSearchTerm(event.detail.value)}
        />
      </View>

      <View className="checkups-filters">
        {STATUS_FILTERS.map(({ key, label }) => (
          <View
            key={key}
            className={`checkups-filter${activeStatus === key ? ' checkups-filter--active' : ''}`}
            role="button"
            aria-label={`${label} ${counts[key]}`}
            onClick={() => setActiveStatus(key)}
          >
            <Text className="checkups-filter__text">
              {label} {counts[key]}
            </Text>
          </View>
        ))}
      </View>

      <View className="checkups-type-filters">
        {TYPE_FILTERS.map(({ key, label }) => (
          <View
            key={key}
            className={`checkups-type${activeType === key ? ' checkups-type--active' : ''}`}
            role="button"
            aria-label={label}
            onClick={() => setActiveType(key)}
          >
            <Text className="checkups-type__text">{label}</Text>
          </View>
        ))}
      </View>

      <View className="checkups-content">
        {filteredCheckups.length > 0 ? (
          filteredCheckups.map((item) => (
            <CheckupCard
              key={item.id}
              item={item}
              onClick={() => openDetail(item.id)}
              onComplete={() => openCompletion(item.id)}
            />
          ))
        ) : (
          <View className="checkups-empty">
            <Text className="checkups-empty__title">
              {checkups.length === 0 ? '还没有检查提醒' : '当前筛选没有结果'}
            </Text>
            <Text className="checkups-empty__desc">
              {checkups.length === 0
                ? '新增复诊或化验提醒后，这里会按紧急程度自动排序。'
                : '换个关键词，或切换筛选查看其他检查任务。'}
            </Text>
          </View>
        )}
      </View>

      <FloatingAddReminder
        ariaLabel="新增检查提醒"
        hidden={sheetOpen || completionTarget !== null || restartTarget !== null}
        onClick={openCreate}
      />

      <BottomSheet
        open={sheetOpen}
        title={sheetMode === 'detail' ? '检查详情' : activeId ? '编辑检查提醒' : '新增检查提醒'}
        onClose={closeSheet}
        onAfterClose={handleSheetExited}
      >
        {sheetMode === 'detail' && activeId ? (
          <CheckupDetail
            checkupId={activeId}
            onClose={closeSheet}
            onEdit={openEdit}
            onComplete={openCompletion}
            onRestart={openRestart}
          />
        ) : null}
        {sheetMode === 'form' ? (
          <CheckupComposer
            key={formKey}
            checkupId={activeId}
            onSuccess={handleFormSuccess}
            onCancel={closeSheet}
          />
        ) : null}
      </BottomSheet>

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
