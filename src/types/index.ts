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

/** 用户级微信订阅资格状态 */
export type UserWechatSubscriptionStatus =
  (typeof USER_WECHAT_SUBSCRIPTION_STATUS)[keyof typeof USER_WECHAT_SUBSCRIPTION_STATUS];

/** 药物提醒主体 */
export interface Reminder {
  id: string;
  medicineName: string; // 药物名称
  medicineSpec: string; // 规格描述
  currentPrescriptionDate: string; // 最近开药日期 YYYY-MM-DD
  intervalDays: number; // 开药间隔（天）
  remindAdvanceDays: number; // 提前提醒天数
  remindTime: string; // 提醒时间 HH:mm
  lastWechatReminderDate: string; // 最近一次成功发送的提醒日期 YYYY-MM-DD
  lastWechatReminderAt: string; // 最近一次成功发送时间 ISO 字符串
  status: ReminderStatus;
  note: string; // 备注
  prescriptionHistory: string[]; // 历史开药日期列表（最近 5 条，YYYY-MM-DD）
  createdAt: string; // ISO 字符串
  updatedAt: string; // ISO 字符串
}

/** 派生计算数据（不持久化，每次从 Reminder 实时计算） */
export interface DerivedReminder extends Reminder {
  nextPrescriptionDate: string; // 预计下次开药日期 YYYY-MM-DD
  nextRemindDate: string; // 实际触发提醒日期 YYYY-MM-DD
  daysLeft: number; // 距今天数（负数=逾期，0=今日）
  level: ReminderLevel;
  levelLabel: string; // "5 天后" / "逾期 2 天" / "今日" / "已暂停"
  progress: number; // 进度条百分比 0-100
}

/** 历史开药记录（为后续云开发扩展预留） */
export interface PrescriptionRecord {
  id: string;
  reminderId: string;
  prescriptionDate: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}
