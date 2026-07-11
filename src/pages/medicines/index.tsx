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
import GlobalReminderComposerHost from '@/components/GlobalReminderComposerHost';
import ListLoadStatus from '@/components/ListLoadStatus';
import MedicineComposer from '@/components/MedicineComposer';
import MedicineInventoryCard from '@/components/MedicineInventoryCard';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { useReminderSheet } from '@/hooks/useReminderSheet';
import {
  useAllDerivedMedicines,
  useMedicineLoadState,
  useReminderActions
} from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { reminderStore } from '@/store/reminderStore';
import type { DerivedMedicine } from '@/types';
import { withPageShare } from '@/utils/pageShare';
import './index.scss';

type FilterKey = 'all' | 'enabled' | 'disabled' | 'low';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'enabled', label: '已开提醒' },
  { key: 'disabled', label: '未开提醒' },
  { key: 'low', label: '余量不足' }
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
    formSubmitting,
    formKey,
    sheetMode,
    sheetOpen,
    sheetTitle,
    closeSheet,
    handleFormSuccess,
    handleSheetExited,
    openEdit,
    setFormSubmitting
  } = useReminderSheet();

  const medicines = useAllDerivedMedicines();
  const { error, loading } = useMedicineLoadState();
  const { deleteReminder } = useReminderActions();

  const counts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: medicines.length,
      enabled: medicines.filter((item) => item.reminderEnabled).length,
      disabled: medicines.filter((item) => !item.reminderEnabled).length,
      low: medicines.filter(
        (item) =>
          item.inventoryDisplayStatus === 'low' ||
          item.inventoryDisplayStatus === 'depleted'
      ).length
    }),
    [medicines]
  );

  const filteredMedicines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return medicines.filter((item) => {
      const byFilter =
        activeFilter === 'all' ||
        (activeFilter === 'enabled' && item.reminderEnabled) ||
        (activeFilter === 'disabled' && !item.reminderEnabled) ||
        (activeFilter === 'low' &&
          (item.inventoryDisplayStatus === 'low' ||
            item.inventoryDisplayStatus === 'depleted'));
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
    if (!editReminderId || formSubmitting) {
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
    medicines.length === 0
      ? '药箱还是空的'
      : activeFilter === 'low'
        ? '暂无余量不足药品'
        : '当前筛选下没有药品';
  const emptyDesc =
    medicines.length === 0
      ? '先保存一个药品，之后也可以随时开启开药提醒。'
      : activeFilter === 'low'
        ? '仅展示自动估算中预计可用不超过 7 天或余量为 0 的药品。'
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
        {loading && medicines.length === 0 ? (
          <View className="medicines-empty">
            <Text className="medicines-empty__title">正在整理药箱</Text>
            <Text className="medicines-empty__desc">正在加载药品与余量信息…</Text>
          </View>
        ) : error && medicines.length === 0 ? (
          <View className="medicines-empty medicines-empty--error">
            <Text className="medicines-empty__title">药箱加载失败</Text>
            <Text className="medicines-empty__desc">请检查网络后重试，已有数据不会被修改。</Text>
            <View
              className="medicines-empty__button"
              role="button"
              aria-label="重新加载药箱"
              onClick={() => void refreshMedicines()}
            >
              <Text className="medicines-empty__button-text">重新加载</Text>
            </View>
          </View>
        ) : filteredMedicines.length > 0 ? (
          <>
            {visibleItems.map((medicine) => (
              <MedicineInventoryCard
                key={medicine.id}
                medicine={medicine}
                onClick={() => openEdit(medicine.id)}
                onInventoryClick={() => openEdit(medicine.id)}
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

      <GlobalReminderComposerHost pagePath="pages/medicines/index" />

      <BottomSheet
        open={sheetOpen}
        title={sheetTitle}
        closeDisabled={sheetMode === 'form' && formSubmitting}
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
                    className={`medicines-delete__button${formSubmitting ? ' medicines-delete__button--disabled' : ''}`}
                    role="button"
                    aria-label="删除药品"
                    aria-disabled={formSubmitting}
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
            onSubmittingChange={setFormSubmitting}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
};

export default withPageShare(Medicines);
