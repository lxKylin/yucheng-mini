/** 提醒状态 */
export type ReminderStatus = "active" | "paused" | "deleted";

/** 提醒紧急等级（用于 UI 颜色） */
export type ReminderLevel = "danger" | "warning" | "good" | "paused";

/** 药物提醒主体 */
export interface Reminder {
  id: string;
  name: string; // 药物名称
  spec: string; // 规格描述
  lastDate: string; // 最近开药日期 YYYY-MM-DD
  interval: number; // 开药间隔（天）
  before: number; // 提前提醒天数
  time: string; // 提醒时间 HH:mm
  status: ReminderStatus;
  note: string; // 备注
  history: string[]; // 历史开药日期列表（最近 5 条，YYYY-MM-DD）
  createdAt: string; // ISO 字符串
  updatedAt: string; // ISO 字符串
}

/** 派生计算数据（不持久化，每次从 Reminder 实时计算） */
export interface DerivedReminder extends Reminder {
  nextDate: string; // 预计下次开药日期 YYYY-MM-DD
  remindAt: string; // 实际触发提醒日期 YYYY-MM-DD
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
