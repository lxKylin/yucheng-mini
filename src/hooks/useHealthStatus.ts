import { useMemo, useSyncExternalStore } from 'react';

import { HEALTH_STATUS_LOOKBACK_DAYS } from '@/constants';
import { healthStatusStore } from '@/store/healthStatusStore';
import { buildHealthStatusSummary } from '@/utils/healthStatusUtils';
import { addDays, today } from '@/utils/dateUtils';

function useHealthStatusStore() {
  return useSyncExternalStore(
    healthStatusStore.subscribe,
    healthStatusStore.getState,
    healthStatusStore.getInitialState
  );
}

export function getHealthStatusLookbackRange() {
  const endDate = today();
  const startDate = addDays(endDate, -(HEALTH_STATUS_LOOKBACK_DAYS - 1));
  return { startDate, endDate };
}

export function useTodayHealthStatus() {
  const records = useHealthStatusStore().records;
  const todayStr = today();

  return useMemo(
    () => records.find((record) => record.date === todayStr) ?? null,
    [records, todayStr]
  );
}

export function useRecentHealthStatuses() {
  const records = useHealthStatusStore().records;
  const { startDate, endDate } = getHealthStatusLookbackRange();

  return useMemo(
    () =>
      records.filter(
        (record) => record.date >= startDate && record.date <= endDate
      ),
    [endDate, records, startDate]
  );
}

export function useHealthStatusSummary() {
  const records = useRecentHealthStatuses();

  return useMemo(() => buildHealthStatusSummary(records), [records]);
}

export function useHealthStatusActions() {
  const state = useHealthStatusStore();

  return useMemo(
    () => ({
      loadRange: state.loadRange,
      saveTodayStatus: state.saveTodayStatus
    }),
    [state]
  );
}
