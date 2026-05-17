import type { Reminder, DerivedReminder, ReminderLevel } from "@/types";
import { LEVEL_ORDER, REMINDER_LEVEL, REMINDER_STATUS } from "@/constants";

// ─── 基础日期工具 ─────────────────────────────────────────────────

/** 将 YYYY-MM-DD 字符串解析为本地零时 Date，避免时区偏移 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 格式化 Date 为 YYYY-MM-DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 格式化 Date 为 M月D日（展示用） */
export function formatDisplay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 获取今天的 YYYY-MM-DD */
export function today(): string {
  return formatDate(new Date());
}

/** 日期加 N 天 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * 计算两个日期字符串之间的天数差
 * @returns to - from 的天数（to 在 from 之后为正数）
 */
export function diffDays(from: string, to: string): number {
  const msPerDay = 86400000;
  return Math.round(
    (parseDate(to).getTime() - parseDate(from).getTime()) / msPerDay,
  );
}

// ─── 业务计算 ─────────────────────────────────────────────────────

/** 计算下次开药日期 */
export function calcNextDate(lastDate: string, interval: number): string {
  return addDays(lastDate, interval);
}

/** 计算提醒触发日期（下次开药日期 - 提前天数） */
export function calcRemindDate(nextDate: string, before: number): string {
  return addDays(nextDate, -before);
}

/**
 * 计算进度条百分比 0-100
 * 逻辑：从 lastDate 到 nextDate 为一个周期，当前在周期内的位置
 * 逾期时进度为 100，不超过 100
 */
function calcProgress(
  lastDate: string,
  nextDate: string,
  todayStr: string,
): number {
  const total = diffDays(lastDate, nextDate);
  if (total <= 0) return 100;
  const elapsed = diffDays(lastDate, todayStr);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/**
 * 根据 daysLeft 和 status 计算 level
 * danger：逾期（<0）或今日（=0）
 * warning：1-7 天内
 * good：7 天以上
 * paused：已暂停
 */
function calcLevel(
  daysLeft: number,
  status: Reminder["status"],
): ReminderLevel {
  if (status === REMINDER_STATUS.PAUSED) return REMINDER_LEVEL.PAUSED;
  if (daysLeft <= 0) return REMINDER_LEVEL.DANGER;
  if (daysLeft <= 7) return REMINDER_LEVEL.WARNING;
  return REMINDER_LEVEL.GOOD;
}

/**
 * 根据 daysLeft 和 level 生成展示文案
 * 示例："-2" → "逾期 2 天"，"0" → "今日"，"5" → "5 天后"，paused → "已暂停"
 */
function calcLevelLabel(daysLeft: number, level: ReminderLevel): string {
  if (level === REMINDER_LEVEL.PAUSED) return "已暂停";
  if (daysLeft === 0) return "今日";
  if (daysLeft < 0) return `逾期 ${Math.abs(daysLeft)} 天`;
  return `${daysLeft} 天后`;
}

/** 核心派生函数：将单条 Reminder 计算为 DerivedReminder */
export function derive(reminder: Reminder): DerivedReminder {
  const todayStr = today();
  const nextPrescriptionDate = calcNextDate(
    reminder.currentPrescriptionDate,
    reminder.intervalDays,
  );
  const nextRemindDate = calcRemindDate(
    nextPrescriptionDate,
    reminder.remindAdvanceDays,
  );
  const daysLeft = diffDays(todayStr, nextPrescriptionDate);
  const level = calcLevel(daysLeft, reminder.status);
  const levelLabel = calcLevelLabel(daysLeft, level);
  const progress = calcProgress(
    reminder.currentPrescriptionDate,
    nextPrescriptionDate,
    todayStr,
  );

  return {
    ...reminder,
    nextPrescriptionDate,
    nextRemindDate,
    daysLeft,
    level,
    levelLabel,
    progress,
  };
}

/**
 * 批量派生并按优先级排序
 * 排序规则：danger < warning < good < paused，同级按 nextDate 升序
 * 已删除（status=deleted）的条目过滤掉
 */
export function deriveAll(reminders: Reminder[]): DerivedReminder[] {
  return reminders
    .filter((r) => r.status !== REMINDER_STATUS.DELETED)
    .map(derive)
    .sort((a, b) => {
      const levelDiff =
        (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
      if (levelDiff !== 0) return levelDiff;
      return a.nextPrescriptionDate.localeCompare(b.nextPrescriptionDate);
    });
}
