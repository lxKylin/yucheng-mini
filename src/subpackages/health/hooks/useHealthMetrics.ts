import { useMemo, useSyncExternalStore } from 'react';

import {
  HEALTH_METRIC_RECENT_RECORD_LIMIT
} from '@/subpackages/health/constants/healthMetric';
import { healthMetricStore } from '@/subpackages/health/store/healthMetricStore';
import type { HealthMetricRecord, HealthMetricSummary } from '@/types';
import {
  buildHealthMetricSummaries,
  buildHealthMetricTrendPoints,
  sortHealthMetricRecords
} from '@/subpackages/health/utils/healthMetricUtils';

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
            state.recordsByMetricId[currentMetric.id] ?? []
          )
        : [],
    [currentMetric, state.recordsByMetricId]
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
      buildHealthMetricSummaries(state.metricTypes, state.recordsByMetricId),
    [state.metricTypes, state.recordsByMetricId]
  );
  const recordsLoading =
    Boolean(state.selectedMetricTypeId) &&
    state.recordsLoadingMetricTypeId === state.selectedMetricTypeId;
  const recordsError =
    state.recordsErrorMetricTypeId === state.selectedMetricTypeId
      ? state.recordsError
      : '';

  return {
    ...state,
    currentMetric,
    currentRecords,
    trendPoints,
    recentRecords,
    summaries,
    recordsLoading,
    recordsError,
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
      loadMetricRecords: state.loadMetricRecords,
      retryCurrentRecords: () =>
        state.selectedMetricTypeId
          ? state.loadMetricRecords(state.selectedMetricTypeId, { force: true })
          : Promise.resolve(),
      createMetricType: state.createMetricType,
      updateMetricType: state.updateMetricType,
      deleteMetricType: state.deleteMetricType,
      saveRecord: state.saveRecord,
      findSameDayRecord: state.findSameDayRecord
    }),
    [
      state.createMetricType,
      state.deleteMetricType,
      state.findSameDayRecord,
      state.load,
      state.loadMetricRecords,
      state.retryLoad,
      state.saveRecord,
      state.selectMetric,
      state.selectedMetricTypeId,
      state.updateMetricType
    ]
  );
}
