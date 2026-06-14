import { useMemo, useSyncExternalStore } from 'react';

import {
  HEALTH_METRIC_RECENT_RECORD_LIMIT
} from '@/constants/healthMetric';
import { healthMetricStore } from '@/store/healthMetricStore';
import type { HealthMetricRecord, HealthMetricSummary } from '@/types';
import {
  buildHealthMetricTrendPoints,
  getLatestHealthMetricRecord,
  sortHealthMetricRecords
} from '@/utils/healthMetricUtils';

function useHealthMetricStoreState() {
  return useSyncExternalStore(
    healthMetricStore.subscribe,
    healthMetricStore.getState,
    healthMetricStore.getInitialState
  );
}

export function useHealthMetricPageState() {
  const state = useHealthMetricStoreState();
  const currentMetric = useMemo(
    () =>
      state.metricTypes.find(
        (metric) => metric.id === state.selectedMetricTypeId
      ) ?? null,
    [state.metricTypes, state.selectedMetricTypeId]
  );
  const currentRecords = useMemo<HealthMetricRecord[]>(
    () =>
      currentMetric
        ? sortHealthMetricRecords(
            state.records.filter(
              (record) => record.metricTypeId === currentMetric.id
            )
          )
        : [],
    [currentMetric, state.records]
  );
  const trendPoints = useMemo(
    () =>
      buildHealthMetricTrendPoints(currentRecords, currentMetric),
    [currentMetric, currentRecords]
  );
  const recentRecords = useMemo(
    () => currentRecords.slice(0, HEALTH_METRIC_RECENT_RECORD_LIMIT),
    [currentRecords]
  );
  const summaries = useMemo<HealthMetricSummary[]>(
    () =>
      state.metricTypes.map((metric) => ({
        metric,
        latestRecord: getLatestHealthMetricRecord(state.records, metric.id),
        recordCount: state.records.filter(
          (record) => record.metricTypeId === metric.id
        ).length
      })),
    [state.metricTypes, state.records]
  );

  return {
    ...state,
    currentMetric,
    currentRecords,
    trendPoints,
    recentRecords,
    summaries,
    isEmpty:
      !state.loading && !state.error && state.metricTypes.length === 0
  };
}

export function useHealthMetricActions() {
  const state = useHealthMetricStoreState();

  return useMemo(
    () => ({
      load: state.load,
      retryLoad: state.retryLoad,
      selectMetric: state.selectMetric,
      createMetricType: state.createMetricType,
      updateMetricType: state.updateMetricType,
      saveRecord: state.saveRecord,
      findSameDayRecord: state.findSameDayRecord
    }),
    [state]
  );
}
