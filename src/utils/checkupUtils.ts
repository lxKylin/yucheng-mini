import {
  DEFAULT_INTERVAL,
  CHECKUP_STATUS,
  CHECKUP_TYPE_OPTIONS,
  LEVEL_ORDER,
  REMINDER_LEVEL
} from '@/constants';
import type {
  CheckupReminder,
  DerivedCheckupReminder,
  Medicine,
  ReminderLevel
} from '@/types';
import { addDays, diffDays, today } from '@/utils/dateUtils';

export function calcCheckupRemindDate(
  targetDate: string,
  remindAdvanceDays: number
) {
  return addDays(targetDate || today(), -Number(remindAdvanceDays || 0));
}

function calcCheckupLevel(
  daysLeft: number,
  status: CheckupReminder['status']
): ReminderLevel {
  if (status === CHECKUP_STATUS.PAUSED || status === CHECKUP_STATUS.DONE) {
    return REMINDER_LEVEL.PAUSED;
  }

  if (daysLeft <= 0) return REMINDER_LEVEL.DANGER;
  if (daysLeft <= 7) return REMINDER_LEVEL.WARNING;
  return REMINDER_LEVEL.GOOD;
}

function calcCheckupLevelLabel(
  daysLeft: number,
  status: CheckupReminder['status'],
  level: ReminderLevel
) {
  if (status === CHECKUP_STATUS.DONE) return '已完成';
  if (level === REMINDER_LEVEL.PAUSED) return '已暂停';
  if (daysLeft === 0) return '今日';
  if (daysLeft < 0) return `逾期 ${Math.abs(daysLeft)} 天`;
  return `${daysLeft} 天后`;
}

function calcCheckupProgress(
  startDate: string,
  targetDate: string,
  todayStr: string
) {
  const total = diffDays(startDate, targetDate);
  if (total <= 0) return 100;

  const elapsed = diffDays(startDate, todayStr);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function getCheckupTypeLabel(type: CheckupReminder['type']) {
  return (
    CHECKUP_TYPE_OPTIONS.find((option) => option.value === type)?.label ||
    '其他'
  );
}

function getRelatedMedicineNames(
  relatedMedicineIds: string[],
  medicines: Medicine[]
) {
  if (!relatedMedicineIds.length) return [];

  return relatedMedicineIds
    .map((id) => medicines.find((medicine) => medicine.id === id)?.name)
    .filter(Boolean) as string[];
}

export function deriveCheckup(
  checkup: CheckupReminder,
  medicines: Medicine[] = []
): DerivedCheckupReminder {
  const todayStr = today();
  const targetDate = checkup.targetDate || todayStr;
  const remindDate = calcCheckupRemindDate(
    targetDate,
    checkup.remindAdvanceDays
  );
  const daysLeft = diffDays(todayStr, targetDate);
  const level = calcCheckupLevel(daysLeft, checkup.status);
  const progressStartDate =
    checkup.completionHistory[0]?.date || addDays(targetDate, -DEFAULT_INTERVAL);

  return {
    ...checkup,
    targetDate,
    remindDate,
    daysLeft,
    level,
    levelLabel: calcCheckupLevelLabel(daysLeft, checkup.status, level),
    progress: calcCheckupProgress(progressStartDate, targetDate, todayStr),
    typeLabel: getCheckupTypeLabel(checkup.type),
    relatedMedicineNames: getRelatedMedicineNames(
      checkup.relatedMedicineIds,
      medicines
    )
  };
}

export function deriveAllCheckups(
  checkups: CheckupReminder[],
  medicines: Medicine[] = []
): DerivedCheckupReminder[] {
  return checkups
    .filter((checkup) => checkup.status !== CHECKUP_STATUS.DELETED)
    .map((checkup) => deriveCheckup(checkup, medicines))
    .sort((a, b) => {
      if (a.status === CHECKUP_STATUS.DONE && b.status !== CHECKUP_STATUS.DONE) {
        return 1;
      }
      if (a.status !== CHECKUP_STATUS.DONE && b.status === CHECKUP_STATUS.DONE) {
        return -1;
      }

      const levelDiff =
        (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
      if (levelDiff !== 0) return levelDiff;
      return a.targetDate.localeCompare(b.targetDate);
    });
}
