import { useMemo } from 'react';

import { CHECKUP_STATUS, REMINDER_LEVEL, REMINDER_STATUS } from '@/constants';
import type { DerivedCheckupReminder, DerivedReminder } from '@/types';
import { diffDays, today } from '@/utils/dateUtils';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useDerivedList } from '@/hooks/useReminders';

export type HomeRiskFeedItem =
  | {
      id: string;
      type: 'medicine';
      typeLabel: '开药';
      title: string;
      targetDate: string;
      remindDate: string;
      daysLeft: number;
      level: DerivedReminder['level'];
      item: DerivedReminder;
    }
  | {
      id: string;
      type: 'checkup';
      typeLabel: '检查';
      title: string;
      targetDate: string;
      remindDate: string;
      daysLeft: number;
      level: DerivedCheckupReminder['level'];
      item: DerivedCheckupReminder;
    };

interface HomeRiskFeedOptions {
  limit?: number;
}

function getRiskRank(item: HomeRiskFeedItem, todayStr: string) {
  if (item.daysLeft < 0) return 0;
  if (item.daysLeft === 0) return 1;
  if (item.daysLeft <= 7 || diffDays(todayStr, item.remindDate) <= 0) return 2;
  return 3;
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
        daysLeft: item.daysLeft,
        level: item.level,
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
        daysLeft: item.daysLeft,
        level: item.level,
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
