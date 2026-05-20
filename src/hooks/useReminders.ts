import { useMemo, useSyncExternalStore } from 'react';

import { REMINDER_LEVEL, REMINDER_STATUS } from '@/constants';
import { reminderStore } from '@/store/reminderStore';
import { derive, deriveAll, deriveAllMedicines } from '@/utils/dateUtils';

function useReminderStore() {
  return useSyncExternalStore(
    reminderStore.subscribe,
    reminderStore.getState,
    reminderStore.getInitialState
  );
}

/** 获取全部派生列表（已排序、已过滤删除项） */
export function useDerivedList() {
  const reminders = useReminderStore().reminders;
  return useMemo(() => deriveAll(reminders), [reminders]);
}

/** 获取药箱视角全部派生药品（已过滤删除项） */
export function useAllDerivedMedicines() {
  const reminders = useReminderStore().reminders;
  return useMemo(() => deriveAllMedicines(reminders), [reminders]);
}

/** 获取单条派生数据 */
export function useDerivedById(id: string) {
  const reminders = useReminderStore().reminders;

  return useMemo(() => {
    const item = reminders.find(
      (reminder) =>
        reminder.id === id && reminder.status !== REMINDER_STATUS.DELETED
    );
    return item ? derive(item) : null;
  }, [id, reminders]);
}

/** 获取首页摘要统计 */
export function useHomeSummary() {
  const reminders = useReminderStore().reminders;

  return useMemo(() => {
    const list = deriveAll(reminders);
    const overdueCount = list.filter(
      (r) => r.level === REMINDER_LEVEL.DANGER
    ).length;
    const warningCount = list.filter(
      (r) => r.level === REMINDER_LEVEL.WARNING
    ).length;
    const activeCount = list.filter(
      (r) => r.status === REMINDER_STATUS.ACTIVE
    ).length;
    return { overdueCount, warningCount, activeCount, total: list.length };
  }, [reminders]);
}

/** 提醒操作 */
export function useReminderActions() {
  const state = useReminderStore();

  return useMemo(
    () => ({
      addReminder: state.addReminder,
      updateReminder: state.updateReminder,
      deleteReminder: state.deleteReminder,
      markDone: state.markDone,
      togglePause: state.togglePause
    }),
    [state]
  );
}

/** 获取"我的"页面所需的统计数据 */
export function useProfileStats() {
  const reminders = useReminderStore().reminders;

  return useMemo(() => {
    const activeList = reminders.filter(
      (r) =>
        r.status === REMINDER_STATUS.ACTIVE && r.reminderEnabled === true
    );
    const visibleList = reminders.filter(
      (r) => r.status !== REMINDER_STATUS.DELETED
    );
    const historyTotal = visibleList.reduce(
      (sum, r) => sum + r.prescriptionHistory.length,
      0
    );

    return {
      activeCount: activeList.length,
      historyTotal,
      total: visibleList.length,
      unreadCount: 0
    };
  }, [reminders]);
}
