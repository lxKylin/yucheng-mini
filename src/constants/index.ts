/** 快捷间隔选项（天） */
export const INTERVAL_OPTIONS = [7, 14, 30, 45, 60, 90] as const;

/** 快捷提前提醒天数选项（天） */
export const BEFORE_OPTIONS = [1, 3, 7, 14] as const;

/** 默认提醒时间 */
export const DEFAULT_REMIND_TIME = "09:00";

/** 默认开药间隔（天） */
export const DEFAULT_INTERVAL = 30;

/** 默认提前提醒天数 */
export const DEFAULT_BEFORE = 3;

/** 本地存储 key */
export const STORAGE_KEY_REMINDERS = "reminders_v1";

/** 历史记录最大保留条数 */
export const HISTORY_MAX = 5;

/** level 对应的排序权重（数字越小越靠前） */
export const LEVEL_ORDER: Record<string, number> = {
  danger: 0,
  warning: 1,
  good: 2,
  paused: 3,
};
