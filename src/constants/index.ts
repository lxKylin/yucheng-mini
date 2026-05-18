/** 快捷间隔选项（天） */
export const INTERVAL_OPTIONS = [7, 14, 28, 30, 45, 60, 90] as const;

/** 快捷提前提醒天数选项（天） */
export const BEFORE_OPTIONS = [1, 3, 7, 14, 30] as const;

/** 默认提醒时间 */
export const DEFAULT_REMIND_TIME = '09:00';

/** 默认开药间隔（天） */
export const DEFAULT_INTERVAL = 30;

/** 默认提前提醒天数 */
export const DEFAULT_BEFORE = 7;

/** 提醒状态 */
export const REMINDER_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DELETED: 'deleted'
} as const;

/** 提醒紧急等级 */
export const REMINDER_LEVEL = {
  DANGER: 'danger',
  WARNING: 'warning',
  GOOD: 'good',
  PAUSED: 'paused'
} as const;

/** 微信订阅授权状态 */
export const WECHAT_SUBSCRIPTION_STATUS = {
  UNKNOWN: 'unknown',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
} as const;

/** 用户级微信订阅资格状态 */
export const USER_WECHAT_SUBSCRIPTION_STATUS = {
  UNKNOWN: 'unknown',
  AVAILABLE: 'available',
  CONSUMED: 'consumed',
  REJECTED: 'rejected'
} as const;

/** 本地存储 key */
export const STORAGE_KEY_REMINDERS = 'reminders_v1';

/** 设置的本地存储 key */
export const STORAGE_KEY_SETTINGS = 'settings_v1';

/** 历史记录最大保留条数 */
export const HISTORY_MAX = 5;

/** level 对应的排序权重（数字越小越靠前） */
export const LEVEL_ORDER: Record<string, number> = {
  [REMINDER_LEVEL.DANGER]: 0,
  [REMINDER_LEVEL.WARNING]: 1,
  [REMINDER_LEVEL.GOOD]: 2,
  [REMINDER_LEVEL.PAUSED]: 3
};

/** 提前天数选项的显示文本（与 BEFORE_OPTIONS 下标一一对应） */
export const BEFORE_OPTIONS_LABEL = BEFORE_OPTIONS.map((d) => `${d} 天`);

export const SHARE_IMAGE =
  'https://636c-cloud1-d3gqjwfefe40e4dba-1319087750.tcb.qcloud.la/avatars/logo.png?sign=006db1948f25b48a009fbe2bac1a26c8&t=1779114111';
export const SHARE_PATH = '/pages/home/index';
