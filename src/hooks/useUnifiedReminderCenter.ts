import { useMemo } from 'react';

import { CHECKUP_STATUS, REMINDER_LEVEL } from '@/constants';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useDerivedList } from '@/hooks/useReminders';
import type {
  DerivedCheckupReminder,
  DerivedReminder,
  ReminderLevel
} from '@/types';

export type UnifiedReminderType = 'all' | 'medicine' | 'checkup';
export type UnifiedReminderStatus = 'all' | ReminderLevel | 'done';
type UnifiedReminderItemStatus = Exclude<UnifiedReminderStatus, 'all'>;

export interface UnifiedReminderFilters {
  type: UnifiedReminderType;
  status: UnifiedReminderStatus;
  searchTerm: string;
}

interface UnifiedReminderBase {
  id: string;
  listKey: string;
  title: string;
  targetDate: string;
  level: ReminderLevel;
  statusFilter: UnifiedReminderItemStatus;
  searchText: string;
}

export type UnifiedReminderItem =
  | (UnifiedReminderBase & {
      type: 'medicine';
      item: DerivedReminder;
    })
  | (UnifiedReminderBase & {
      type: 'checkup';
      item: DerivedCheckupReminder;
    });

export const UNIFIED_TYPE_FILTERS: {
  key: UnifiedReminderType;
  label: string;
}[] = [
  { key: 'all', label: '全部' },
  { key: 'medicine', label: '开药' },
  { key: 'checkup', label: '检查' }
];

export const UNIFIED_STATUS_FILTERS: {
  key: UnifiedReminderStatus;
  label: string;
}[] = [
  { key: 'all', label: '全部' },
  { key: REMINDER_LEVEL.DANGER, label: '逾期今日' },
  { key: REMINDER_LEVEL.WARNING, label: '7天内' },
  { key: REMINDER_LEVEL.GOOD, label: '正常' },
  { key: REMINDER_LEVEL.PAUSED, label: '暂停' },
  { key: 'done', label: '已完成' }
];

export interface UnifiedReminderCounts {
  type: Record<UnifiedReminderType, number>;
  status: Record<UnifiedReminderStatus, number>;
}

function joinSearchText(parts: Array<string | number | undefined | null>) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function getCheckupStatus(
  item: DerivedCheckupReminder
): UnifiedReminderItemStatus {
  if (item.status === CHECKUP_STATUS.DONE) return 'done';
  if (item.status === CHECKUP_STATUS.PAUSED) return REMINDER_LEVEL.PAUSED;
  return item.level;
}

function getSortRank(item: UnifiedReminderItem) {
  if (item.type === 'checkup' && item.item.status === CHECKUP_STATUS.DONE) {
    return 5;
  }

  if (item.statusFilter === REMINDER_LEVEL.PAUSED) return 4;
  if (item.level === REMINDER_LEVEL.DANGER && item.item.daysLeft < 0) return 0;
  if (item.level === REMINDER_LEVEL.DANGER) return 1;
  if (item.level === REMINDER_LEVEL.WARNING) return 2;
  return 3;
}

function sortUnifiedItems(
  a: UnifiedReminderItem,
  b: UnifiedReminderItem
) {
  const rankDiff = getSortRank(a) - getSortRank(b);
  if (rankDiff !== 0) return rankDiff;

  const dateDiff = a.targetDate.localeCompare(b.targetDate);
  if (dateDiff !== 0) return dateDiff;

  return a.title.localeCompare(b.title, 'zh-Hans-CN');
}

function toMedicineItem(item: DerivedReminder): UnifiedReminderItem {
  return {
    id: item.id,
    listKey: `medicine:${item.id}`,
    title: item.name,
    targetDate: item.nextPrescriptionDate,
    type: 'medicine',
    level: item.level,
    statusFilter: item.level,
    searchText: joinSearchText([
      item.name,
      item.spec,
      item.form,
      item.scheduleTiming,
      item.scheduleTime,
      item.scheduleLabel,
      item.expiryDate,
      item.note
    ]),
    item
  };
}

function toCheckupItem(item: DerivedCheckupReminder): UnifiedReminderItem {
  return {
    id: item.id,
    listKey: `checkup:${item.id}`,
    title: item.title,
    targetDate: item.targetDate,
    type: 'checkup',
    level: item.level,
    statusFilter: getCheckupStatus(item),
    searchText: joinSearchText([
      item.title,
      item.typeLabel,
      item.hospital,
      item.note,
      item.relatedMedicineNames.join(' ')
    ]),
    item
  };
}

function buildCounts(items: UnifiedReminderItem[]): UnifiedReminderCounts {
  // Counts describe the full unified source set before type/status/search filters.
  const counts: UnifiedReminderCounts = {
    type: {
      all: items.length,
      medicine: 0,
      checkup: 0
    },
    status: {
      all: items.length,
      [REMINDER_LEVEL.DANGER]: 0,
      [REMINDER_LEVEL.WARNING]: 0,
      [REMINDER_LEVEL.GOOD]: 0,
      [REMINDER_LEVEL.PAUSED]: 0,
      done: 0
    }
  };

  items.forEach((item) => {
    counts.type[item.type] += 1;
    counts.status[item.statusFilter] += 1;
  });

  return counts;
}

export function useUnifiedReminderCenter(filters: UnifiedReminderFilters) {
  const medicines = useDerivedList();
  const checkups = useDerivedCheckups();

  const items = useMemo(
    () =>
      [
        ...medicines.map(toMedicineItem),
        ...checkups.map(toCheckupItem)
      ].sort(sortUnifiedItems),
    [checkups, medicines]
  );

  const counts = useMemo(() => buildCounts(items), [items]);

  const normalizedTerm = filters.searchTerm.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const byType = filters.type === 'all' || item.type === filters.type;
        const byStatus =
          filters.status === 'all' || item.statusFilter === filters.status;
        const bySearch =
          !normalizedTerm || item.searchText.includes(normalizedTerm);

        return byType && byStatus && bySearch;
      }),
    [filters.status, filters.type, items, normalizedTerm]
  );

  return {
    items,
    filteredItems,
    counts,
    resetKey: `${filters.type}:${filters.status}:${normalizedTerm}`,
    sourceTotal: items.length
  };
}
