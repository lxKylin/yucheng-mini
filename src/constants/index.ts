import type { CheckupType, DosageUnit, MedicineSchedule } from '@/types';

/** 快捷间隔选项（天） */
export const INTERVAL_OPTIONS = [3, 7, 14, 28, 30, 45, 60, 90] as const;

/** 快捷提前提醒天数选项（天） */
export const BEFORE_OPTIONS = [1, 3, 7, 14, 30] as const;

/** 默认提醒时间 */
export const DEFAULT_REMIND_TIME = '09:00';

/** 默认开药间隔（天） */
export const DEFAULT_INTERVAL = 30;

/** 默认提前提醒天数 */
export const DEFAULT_BEFORE = 7;

export const MEDICINE_FORM_OPTIONS = [
  { value: 'tablet', label: '片剂' },
  { value: 'capsule', label: '胶囊' },
  { value: 'liquid', label: '液体/口服液' },
  { value: 'injection', label: '注射液' },
  { value: 'external', label: '外用' },
  { value: 'patch', label: '贴剂' },
  { value: 'drops', label: '滴剂' },
  { value: 'other', label: '其他' }
] as const;

export const DOSAGE_UNIT_OPTIONS: DosageUnit[] = [
  '片',
  '粒',
  'ml',
  '支',
  '贴',
  '滴'
];

export const SCHEDULE_OPTIONS: MedicineSchedule[] = [
  '饭前',
  '饭后',
  '随餐',
  '空腹',
  '睡前',
  '固定时间',
  '按医嘱'
];

export const TIMES_PER_DAY_OPTIONS = [1, 2, 3, 4] as const;

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

export const CHECKUP_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DONE: 'done',
  DELETED: 'deleted'
} as const;

export const CHECKUP_TYPE_OPTIONS: { value: CheckupType; label: string }[] = [
  { value: 'follow_up', label: '复诊' },
  { value: 'lab_test', label: '化验' },
  { value: 'imaging', label: '影像' },
  { value: 'indicator', label: '指标复查' },
  { value: 'other', label: '其他' }
];

export const CHECKUP_BEFORE_OPTIONS = [0, 1, 3, 7, 14, 30] as const;

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

/** 微信订阅消息模板 ID */
export const WECHAT_REMINDER_TEMPLATE_ID = [
  'lJrijmJoifhTuQjcF2ENsXwR1T5_59Ey1W-cu0KugTw', //日程提醒
  'tGvIm8wbZIYVmp9f2es1MYLFwWhrGBke7PUeQMgfcwY', //药品过期提醒
  '6fS1yWWR-UQqYCu7CJ0c4AKerKQvfmAggh25GP1-i98' //检查提醒
] as const;

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

export const SHARE_IMAGE = '/assets/images/logo.png';
export const SHARE_PATH = '/pages/home/index';
