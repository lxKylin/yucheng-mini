import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro, {
  usePullDownRefresh,
  useReachBottom,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';
import { Search } from '@taroify/icons';

import { MEDICINE_FORM_OPTIONS, SHARE_IMAGE, SHARE_PATH } from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import ListLoadStatus from '@/components/ListLoadStatus';
import MedicineComposer from '@/components/MedicineComposer';
import MedicineInventoryCard from '@/components/MedicineInventoryCard';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { useReminderSheet } from '@/hooks/useReminderSheet';
import {
  useAllDerivedMedicines,
  useReminderActions
} from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { reminderStore } from '@/store/reminderStore';
import type { DerivedMedicine } from '@/types';
import { withPageShare } from '@/utils/pageShare';
import './index.scss';

type FilterKey = 'all' | 'enabled' | 'disabled';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '已开提醒' },
  { key: 'disabled', label: '未开提醒' }
];

const FORM_LABEL_MAP = MEDICINE_FORM_OPTIONS.reduce<Record<string, string>>(
  (map, option) => {
    map[option.value] = option.label;
    return map;
  },
  {}
);

function buildSearchText(item: DerivedMedicine) {
  return [
    item.name,
    item.spec,
    FORM_LABEL_MAP[item.form],
    item.form,
    item.scheduleTiming,
    item.scheduleTime,
    item.scheduleLabel,
    item.expiryDate
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const Medicines = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  useTabScrollToTop();

  const {
    defaultReminderEnabled,
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
    openEdit
  } = useReminderSheet();

  const medicines = useAllDerivedMedicines();
  const { deleteReminder } = useReminderActions();

  const counts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: medicines.length,
      enabled: medicines.filter((item) => item.reminderEnabled).length,
      disabled: medicines.filter((item) => !item.reminderEnabled).length
    }),
    [medicines]
  );

  const filteredMedicines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return medicines.filter((item) => {
      const byFilter =
        activeFilter === 'all' ||
        (activeFilter === 'enabled' && item.reminderEnabled) ||
        (activeFilter === 'disabled' && !item.reminderEnabled);
      const bySearch = !term || buildSearchText(item).includes(term);

      return byFilter && bySearch;
    });
  }, [activeFilter, medicines, searchTerm]);

  const listResetKey = `${activeFilter}:${searchTerm.trim()}`;
  const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
    useIncrementalList(filteredMedicines, listResetKey);

  const refreshMedicines = async () => {
    try {
      await reminderStore.getState().loadFromCloud();
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
    void refreshMedicines();
  });

  useReachBottom(() => {
    if (hasMore) {
      loadMore();
    }
  });

  const handleDelete = () => {
    if (!editReminderId) {
      return;
    }

    const target = medicines.find((item) => item.id === editReminderId);

    Taro.showModal({
      title: '删除药品',
      content: '删除后将不再出现在药箱和提醒列表，历史记录也不会继续展示。',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ca4e41',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        try {
          await deleteReminder(editReminderId);
          closeSheet();
          Taro.showToast({
            title: '药品已删除',
            icon: 'success',
            duration: 1500
          });
        } catch {
          Taro.showToast({
            title: `${target?.name || '药品'}删除失败`,
            icon: 'none',
            duration: 1800
          });
        }
      }
    });
  };

  const emptyTitle =
    medicines.length === 0 ? '药箱还是空的' : '当前筛选下没有药品';
  const emptyDesc =
    medicines.length === 0
      ? '先保存一个药品，之后也可以随时开启开药提醒。'
      : '换个关键词，或切换筛选查看全部药箱记录。';

  Taro.useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
  });

  useShareAppMessage(() => ({
    title: '愈历：把药箱资料整理清楚',
    path: SHARE_PATH,
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：长期用药药箱备忘',
    query: 'from=medicines-timeline',
    imageUrl: SHARE_IMAGE
  }));

  return (
    <View className="medicines-page">
      <View className="medicines-search">
        <View className="medicines-search__icon" aria-hidden="true">
          <Search />
        </View>
        <Input
          className="medicines-search__input"
          value={searchTerm}
          placeholder="搜索药品名称、规格或服用时机"
          placeholderClass="medicines-search__placeholder"
          onInput={(event) => setSearchTerm(event.detail.value)}
        />
      </View>

      <View className="medicines-filters">
        {FILTER_TABS.map(({ key, label }) => (
          <View
            key={key}
            className={`medicines-filter${activeFilter === key ? ' medicines-filter--active' : ''}`}
            role="button"
            aria-label={`${label} ${counts[key]}`}
            onClick={() => setActiveFilter(key)}
          >
            <Text className="medicines-filter__text">
              {label} {counts[key]}
            </Text>
          </View>
        ))}
      </View>

      <View className="medicines-content">
        {filteredMedicines.length > 0 ? (
          <>
            {visibleItems.map((medicine) => (
              <MedicineInventoryCard
                key={medicine.id}
                medicine={medicine}
                onClick={() => openEdit(medicine.id)}
              />
            ))}
            <ListLoadStatus
              visibleCount={visibleCount}
              totalCount={totalCount}
              hasMore={hasMore}
            />
          </>
        ) : (
          <View className="medicines-empty">
            <Text className="medicines-empty__title">{emptyTitle}</Text>
            <Text className="medicines-empty__desc">{emptyDesc}</Text>
          </View>
        )}
      </View>

      <FloatingAddReminder
        ariaLabel="新增药品"
        hidden={sheetActive}
        onClick={() => openCreate(false)}
      />

      <BottomSheet
        open={sheetOpen}
        title={sheetTitle}
        onClose={closeSheet}
        onAfterClose={handleSheetExited}
      >
        {sheetMode === 'form' ? (
          <MedicineComposer
            key={formKey}
            medicineId={editReminderId}
            defaultReminderEnabled={defaultReminderEnabled}
            footerExtra={
              editReminderId ? (
                <View className="medicines-delete">
                  <View
                    className="medicines-delete__button"
                    role="button"
                    aria-label="删除药品"
                    onClick={handleDelete}
                  >
                    <Text className="medicines-delete__button-text">
                      删除药品
                    </Text>
                  </View>
                </View>
              ) : null
            }
            onSuccess={handleFormSuccess}
            onCancel={closeSheet}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
};

export default withPageShare(Medicines);
