import {
  REMINDER_LEVEL,
  REMINDER_STATUS,
  USER_WECHAT_SUBSCRIPTION_STATUS
} from '@/constants';

/** 提醒状态 */
export type ReminderStatus =
  (typeof REMINDER_STATUS)[keyof typeof REMINDER_STATUS];

/** 提醒紧急等级（用于 UI 颜色） */
export type ReminderLevel =
  (typeof REMINDER_LEVEL)[keyof typeof REMINDER_LEVEL];

export type MedicineForm =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'injection'
  | 'external'
  | 'patch'
  | 'drops'
  | 'other';

export type DosageUnit = '片' | '粒' | 'ml' | '支' | '贴' | '滴';

export type MedicineSchedule =
  | '饭前'
  | '饭后'
  | '随餐'
  | '空腹'
  | '睡前'
  | '固定时间'
  | '按医嘱';

export type CheckupType = 'follow_up' | 'lab_test' | 'imaging' | 'indicator' | 'other';

export type CheckupStatus = 'active' | 'paused' | 'done' | 'deleted';

/** 药品状态（兼容原 ReminderStatus） */
export type MedicineStatus = ReminderStatus;

/** 用户级微信订阅资格状态 */
export type UserWechatSubscriptionStatus =
  (typeof USER_WECHAT_SUBSCRIPTION_STATUS)[keyof typeof USER_WECHAT_SUBSCRIPTION_STATUS];

/** 统一药品主体 */
export interface Medicine {
  id: string;

  // 基础信息
  name: string; // 药物名称
  spec: string; // 规格描述
  form: MedicineForm;
  expiryDate: string;
  note: string; // 备注

  // 服药信息
  dosagePerUse: number;
  dosageUnit: DosageUnit;
  timesPerDay: number;
  scheduleTiming: MedicineSchedule;
  scheduleTime: string;

  // 开药提醒
  reminderEnabled: boolean;
  currentPrescriptionDate: string; // 最近开药日期 YYYY-MM-DD
  intervalDays: number; // 开药间隔（天）
  remindAdvanceDays: number; // 提前提醒天数
  remindTime: string; // 提醒时间 HH:mm
  status: MedicineStatus;
  prescriptionHistory: string[]; // 历史开药日期列表（最近 5 条，YYYY-MM-DD）
  lastWechatReminderDate: string; // 最近一次成功发送的提醒日期 YYYY-MM-DD
  lastWechatReminderAt: string; // 最近一次成功发送时间 ISO 字符串

  createdAt: string; // ISO 字符串
  updatedAt: string; // ISO 字符串
}

/** 派生计算数据（不持久化，每次从 Medicine 实时计算） */
export interface DerivedMedicine extends Medicine {
  nextPrescriptionDate: string; // 预计下次开药日期 YYYY-MM-DD
  nextRemindDate: string; // 实际触发提醒日期 YYYY-MM-DD
  daysLeft: number; // 距今天数（负数=逾期，0=今日）
  level: ReminderLevel;
  levelLabel: string; // "5 天后" / "逾期 2 天" / "今日" / "已暂停"
  progress: number; // 进度条百分比 0-100
  scheduleLabel: string;
}

export type Reminder = Medicine;
export type DerivedReminder = DerivedMedicine;

export interface CheckupCompletionRecord {
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}

/** 独立检查/复诊提醒主体 */
export interface CheckupReminder {
  id: string;
  title: string;
  type: CheckupType;
  targetDate: string; // 目标复诊/检查日期 YYYY-MM-DD
  remindAdvanceDays: number;
  remindTime: string; // HH:mm
  status: CheckupStatus;
  relatedMedicineIds: string[];
  hospital: string;
  note: string;
  completionHistory: CheckupCompletionRecord[];
  lastWechatReminderDate: string;
  lastWechatReminderAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DerivedCheckupReminder extends CheckupReminder {
  remindDate: string;
  daysLeft: number;
  level: ReminderLevel;
  levelLabel: string;
  progress: number;
  typeLabel: string;
  relatedMedicineNames: string[];
}

/** 历史开药记录（为后续云开发扩展预留） */
export interface PrescriptionRecord {
  id: string;
  reminderId: string;
  prescriptionDate: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}
