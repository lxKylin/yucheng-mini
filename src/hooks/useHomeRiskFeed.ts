import { useMemo } from 'react';

import { CHECKUP_STATUS, REMINDER_LEVEL, REMINDER_STATUS } from '@/constants';
import type { DerivedCheckupReminder, DerivedReminder } from '@/types';
import { diffDays, today } from '@/utils/dateUtils';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useDerivedList } from '@/hooks/useReminders';

interface HomeRiskFeedBase {
  id: string;
  typeLabel: '开药' | '检查';
  title: string;
  targetDate: string;
  remindDate: string;
  remindTime: string;
  daysLeft: number;
  levelLabel: string;
  riskLabel: string;
  actionSummary: string;
  contextSummary: string;
  timeSummary: string;
  primaryActionLabel: string;
}

export type HomeRiskFeedItem =
  | (HomeRiskFeedBase & {
      type: 'medicine';
      level: DerivedReminder['level'];
      item: DerivedReminder;
    })
  | (HomeRiskFeedBase & {
      type: 'checkup';
      level: DerivedCheckupReminder['level'];
      item: DerivedCheckupReminder;
    });

interface HomeRiskFeedOptions {
  limit?: number;
}

function getRiskRank(item: HomeRiskFeedItem, todayStr: string) {
  if (item.daysLeft < 0) return 0;
  if (item.daysLeft === 0) return 1;
  if (item.daysLeft <= 7 || diffDays(todayStr, item.remindDate) <= 0) return 2;
  return 3;
}

function formatShortDate(date: string) {
  const [, month, day] = date.split('-');

  if (!month || !day) {
    return date;
  }

  return `${month}-${day}`;
}

function buildRiskLabel(daysLeft: number) {
  if (daysLeft < 0) return `逾期 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return '今天到期';
  return `${daysLeft} 天后`;
}

function buildTimeSummary(
  targetDate: string,
  remindDate: string,
  remindTime: string
) {
  return `目标 ${formatShortDate(targetDate)} · 提醒 ${formatShortDate(
    remindDate
  )} ${remindTime}`;
}

function buildMedicineActionSummary(item: DerivedReminder) {
  if (item.daysLeft < 0) {
    return '当前开药周期已结束，建议补记后进入下一轮';
  }

  if (item.daysLeft === 0) {
    return '今天是预计开药日，记录后会推算下一次';
  }

  if (item.daysLeft <= 7) {
    return `未来 ${item.daysLeft} 天内需安排，避免临近断药`;
  }

  return '开药计划已安排，临近时会优先提醒';
}

function buildCheckupActionSummary(item: DerivedCheckupReminder) {
  if (item.daysLeft < 0) {
    return `${item.typeLabel}已过目标日，建议尽快完成`;
  }

  if (item.daysLeft === 0) {
    return `${item.typeLabel}今天到期，完成后可继续安排下一次`;
  }

  if (item.daysLeft <= 7) {
    return `${item.typeLabel}临近，提前准备检查或复诊材料`;
  }

  return `${item.typeLabel}已安排，临近时会优先提醒`;
}

function buildMedicineContextSummary(item: DerivedReminder) {
  return `规格：${item.spec || '-'} · 每 ${item.intervalDays} 天开药一次`;
}

function buildCheckupContextSummary(item: DerivedCheckupReminder) {
  const contexts: string[] = [];

  if (item.hospital) {
    contexts.push(`医院/诊室：${item.hospital}`);
  }

  if (item.relatedMedicineNames.length) {
    contexts.push(`关联药品：${item.relatedMedicineNames.join('、')}`);
  }

  return contexts.join(' · ');
}

export function useHomeRiskFeed(options: HomeRiskFeedOptions = {}) {
  const { limit = 3 } = options;
  const medicines = useDerivedList();
  const checkups = useDerivedCheckups();

  return useMemo(() => {
    const todayStr = today();
    const medicineItems: HomeRiskFeedItem[] = medicines
      .filter((item) => item.status === REMINDER_STATUS.ACTIVE)
      .map((item) => ({
        id: item.id,
        type: 'medicine',
        typeLabel: '开药',
        title: item.name,
        targetDate: item.nextPrescriptionDate,
        remindDate: item.nextRemindDate,
        remindTime: item.remindTime,
        daysLeft: item.daysLeft,
        level: item.level,
        levelLabel: item.levelLabel,
        riskLabel: buildRiskLabel(item.daysLeft),
        actionSummary: buildMedicineActionSummary(item),
        contextSummary: buildMedicineContextSummary(item),
        timeSummary: buildTimeSummary(
          item.nextPrescriptionDate,
          item.nextRemindDate,
          item.remindTime
        ),
        primaryActionLabel: '记录已开药',
        item
      }));
    const checkupItems: HomeRiskFeedItem[] = checkups
      .filter((item) => item.status === CHECKUP_STATUS.ACTIVE)
      .map((item) => ({
        id: item.id,
        type: 'checkup',
        typeLabel: '检查',
        title: item.title,
        targetDate: item.targetDate,
        remindDate: item.remindDate,
        remindTime: item.remindTime,
        daysLeft: item.daysLeft,
        level: item.level,
        levelLabel: item.levelLabel,
        riskLabel: buildRiskLabel(item.daysLeft),
        actionSummary: buildCheckupActionSummary(item),
        contextSummary: buildCheckupContextSummary(item),
        timeSummary: buildTimeSummary(
          item.targetDate,
          item.remindDate,
          item.remindTime
        ),
        primaryActionLabel: '完成检查',
        item
      }));
    const candidates = [...medicineItems, ...checkupItems].sort((a, b) => {
      const riskDiff = getRiskRank(a, todayStr) - getRiskRank(b, todayStr);
      if (riskDiff !== 0) return riskDiff;

      const dateDiff = a.targetDate.localeCompare(b.targetDate);
      if (dateDiff !== 0) return dateDiff;

      return a.type.localeCompare(b.type);
    });
    const overdueCount = candidates.filter((item) => item.daysLeft < 0).length;
    const todayCount = candidates.filter((item) => item.daysLeft === 0).length;
    const warningCount = candidates.filter(
      (item) => item.level === REMINDER_LEVEL.WARNING
    ).length;

    return {
      items: candidates.slice(0, limit),
      total: candidates.length,
      sourceTotal: medicines.length + checkups.length,
      overdueCount,
      todayCount,
      warningCount
    };
  }, [checkups, limit, medicines]);
}
