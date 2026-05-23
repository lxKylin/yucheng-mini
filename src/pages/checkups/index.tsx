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
import CheckupComposer from '@/components/CheckupComposer';
import CheckupDetail from '@/components/CheckupDetail';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import { useCheckupActions, useDerivedCheckups } from '@/hooks/useCheckups';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import type { CheckupType, DerivedCheckupReminder, ReminderLevel } from '@/types';

import './index.scss';

type StatusFilter = 'all' | ReminderLevel | 'done';
type TypeFilter = 'all' | CheckupType;
type SheetMode = 'form' | 'detail' | null;

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
  const [formKey, setFormKey] = useState(0);
  useTabScrollToTop();

  const checkups = useDerivedCheckups();
  const { completeCheckup } = useCheckupActions();

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

  const overdueCount = counts[REMINDER_LEVEL.DANGER];
  const todayCount = checkups.filter(
    (item) => item.status === CHECKUP_STATUS.ACTIVE && item.daysLeft === 0
  ).length;

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
    setSheetMode(null);
    setActiveId(undefined);
  };

  const handleFormSuccess = () => {
    closeSheet();
  };

  const handleQuickComplete = (item: DerivedCheckupReminder) => {
    Taro.showModal({
      title: '完成检查',
      content: `确认已完成「${item.title}」吗？可稍后在详情里设置下一次检查。`,
      confirmText: '完成',
      cancelText: '取消',
      confirmColor: '#157a66',
      success: async (result) => {
        if (!result.confirm) return;

        try {
          await completeCheckup(item.id);
          Taro.showToast({ title: '检查已完成', icon: 'success' });
        } catch {
          Taro.showToast({ title: '更新失败，请稍后重试', icon: 'none' });
        }
      }
    });
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

      <View className="checkups-summary">
        <View className="checkups-summary__item">
          <Text className="checkups-summary__value">{overdueCount}</Text>
          <Text className="checkups-summary__label">逾期今日</Text>
        </View>
        <View className="checkups-summary__item">
          <Text className="checkups-summary__value">{todayCount}</Text>
          <Text className="checkups-summary__label">今天处理</Text>
        </View>
        <View className="checkups-summary__item">
          <Text className="checkups-summary__value">
            {filteredCheckups.length}
          </Text>
          <Text className="checkups-summary__label">当前筛选</Text>
        </View>
      </View>

      <View className="checkups-content">
        {filteredCheckups.length > 0 ? (
          filteredCheckups.map((item) => (
            <CheckupCard
              key={item.id}
              item={item}
              onClick={() => openDetail(item.id)}
              onComplete={() => handleQuickComplete(item)}
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
        hidden={sheetOpen}
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
    </View>
  );
}
