import { useMemo, useSyncExternalStore } from "react";

import { reminderStore } from "@/store/reminderStore";
import { deriveAll } from "@/utils/dateUtils";

function useReminderStore() {
  return useSyncExternalStore(
    reminderStore.subscribe,
    reminderStore.getState,
    reminderStore.getInitialState,
  );
}

/** 获取全部派生列表（已排序、已过滤删除项） */
export function useDerivedList() {
  const reminders = useReminderStore().reminders;
  return useMemo(() => deriveAll(reminders), [reminders]);
}

/** 获取单条派生数据 */
export function useDerivedById(id: string) {
  const reminders = useReminderStore().reminders;

  return useMemo(() => {
    const item = reminders.find(
      (reminder) => reminder.id === id && reminder.status !== "deleted",
    );
    return item ? (deriveAll([item])[0] ?? null) : null;
  }, [id, reminders]);
}

/** 获取首页摘要统计 */
export function useHomeSummary() {
  const reminders = useReminderStore().reminders;

  return useMemo(() => {
    const list = deriveAll(reminders);
    const overdueCount = list.filter((r) => r.level === "danger").length;
    const warningCount = list.filter((r) => r.level === "warning").length;
    const activeCount = list.filter((r) => r.status === "active").length;
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
      togglePause: state.togglePause,
    }),
    [state],
  );
}
