import { useSyncExternalStore } from "react";

import { reminderStore } from "@/store/reminderStore";
import { deriveAll } from "@/utils/dateUtils";

function useReminderStoreSelector<T>(
  selector: (state: ReturnType<typeof reminderStore.getState>) => T,
) {
  return useSyncExternalStore(
    reminderStore.subscribe,
    () => selector(reminderStore.getState()),
    () => selector(reminderStore.getInitialState()),
  );
}

/** 获取全部派生列表（已排序、已过滤删除项） */
export function useDerivedList() {
  return useReminderStoreSelector((state) => deriveAll(state.reminders));
}

/** 获取单条派生数据 */
export function useDerivedById(id: string) {
  return useReminderStoreSelector((state) => state.getById(id));
}

/** 获取首页摘要统计 */
export function useHomeSummary() {
  return useReminderStoreSelector((state) => {
    const list = deriveAll(state.reminders);
    const overdueCount = list.filter((r) => r.level === "danger").length;
    const warningCount = list.filter((r) => r.level === "warning").length;
    const activeCount = list.filter((r) => r.status === "active").length;
    return { overdueCount, warningCount, activeCount, total: list.length };
  });
}

/** 提醒操作 */
export function useReminderActions() {
  return useReminderStoreSelector((state) => ({
    addReminder: state.addReminder,
    updateReminder: state.updateReminder,
    deleteReminder: state.deleteReminder,
    markDone: state.markDone,
    togglePause: state.togglePause,
  }));
}
