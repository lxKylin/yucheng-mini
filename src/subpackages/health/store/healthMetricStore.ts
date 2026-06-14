import { createStore } from 'zustand/vanilla';

import { HEALTH_METRIC_STATUS } from '@/subpackages/health/constants/healthMetric';
import {
  createHealthMetricTypeToCloud,
  fetchHealthMetricRecords,
  fetchHealthMetricTypes,
  findSameDayHealthMetricRecordFromCloud,
  saveHealthMetricRecordToCloud,
  updateHealthMetricTypeDefaults,
  updateHealthMetricTypeToCloud
} from '@/subpackages/health/services/healthMetric';
import type { HealthMetricRecord, HealthMetricType } from '@/types';
import { genId } from '@/utils/commonUtils';
import {
  findSameDayHealthMetricRecord,
  pickDefaultHealthMetricId,
  sortHealthMetricRecords
} from '@/subpackages/health/utils/healthMetricUtils';

interface SaveHealthMetricRecordPayload {
  metricTypeId: string;
  date: string;
  value: number;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  note?: string;
  saveAsDefault?: boolean;
  confirmUpdate?: boolean;
}

interface HealthMetricStore {
  metricTypes: HealthMetricType[];
  records: HealthMetricRecord[];
  selectedMetricTypeId: string;
  loading: boolean;
  error: string;
  submitting: boolean;
  load: () => Promise<void>;
  retryLoad: () => Promise<void>;
  selectMetric: (metricTypeId: string) => void;
  createMetricType: (
    payload: Pick<HealthMetricType, 'name' | 'unit' | 'referenceMin' | 'referenceMax'>
  ) => Promise<HealthMetricType>;
  updateMetricType: (
    metricTypeId: string,
    payload: Pick<HealthMetricType, 'name' | 'unit' | 'referenceMin' | 'referenceMax'>
  ) => Promise<HealthMetricType>;
  saveRecord: (
    payload: SaveHealthMetricRecordPayload
  ) => Promise<{ record: HealthMetricRecord; updated: boolean }>;
  findSameDayRecord: (
    metricTypeId: string,
    date: string
  ) => Promise<HealthMetricRecord | null>;
}

export const healthMetricStore = createStore<HealthMetricStore>((set, get) => ({
  metricTypes: [],
  records: [],
  selectedMetricTypeId: '',
  loading: false,
  error: '',
  submitting: false,

  async load() {
    set({ loading: true, error: '' });

    try {
      const [metricTypes, records] = await Promise.all([
        fetchHealthMetricTypes(),
        fetchHealthMetricRecords()
      ]);
      set((state) => ({
        metricTypes,
        records,
        selectedMetricTypeId:
          state.selectedMetricTypeId ||
          pickDefaultHealthMetricId(metricTypes, records),
        loading: false
      }));
    } catch (err) {
      console.error('[healthMetricStore] 加载失败：', err);
      set({ loading: false, error: '指标数据加载失败，请重试' });
    }
  },

  retryLoad() {
    return get().load();
  },

  selectMetric(metricTypeId) {
    set({ selectedMetricTypeId: metricTypeId });
  },

  async createMetricType(payload) {
    const now = new Date().toISOString();
    const metric: HealthMetricType = {
      id: genId(),
      name: payload.name.trim(),
      unit: payload.unit.trim(),
      referenceMin: payload.referenceMin,
      referenceMax: payload.referenceMax,
      note: '',
      status: HEALTH_METRIC_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now
    };

    set({ submitting: true, error: '' });
    try {
      await createHealthMetricTypeToCloud(metric);
      set((state) => ({
        metricTypes: [metric, ...state.metricTypes],
        selectedMetricTypeId: metric.id,
        submitting: false
      }));
      return metric;
    } catch (err) {
      console.error('[healthMetricStore] 创建指标失败：', err);
      set({ submitting: false, error: '保存失败，请稍后重试' });
      throw err;
    }
  },

  async updateMetricType(metricTypeId, payload) {
    const current = get().metricTypes.find((item) => item.id === metricTypeId);
    if (!current) {
      throw new Error('HEALTH_METRIC_TYPE_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const metric: HealthMetricType = {
      ...current,
      name: payload.name.trim(),
      unit: payload.unit.trim(),
      referenceMin: payload.referenceMin,
      referenceMax: payload.referenceMax,
      updatedAt: now
    };

    set({ submitting: true, error: '' });
    try {
      await updateHealthMetricTypeToCloud(metricTypeId, {
        name: metric.name,
        unit: metric.unit,
        referenceMin: metric.referenceMin,
        referenceMax: metric.referenceMax
      });
      set((state) => ({
        metricTypes: state.metricTypes.map((item) =>
          item.id === metricTypeId ? metric : item
        ),
        selectedMetricTypeId: metricTypeId,
        submitting: false
      }));
      return metric;
    } catch (err) {
      console.error('[healthMetricStore] 更新指标失败：', err);
      set({ submitting: false, error: '保存失败，请稍后重试' });
      throw err;
    }
  },

  async saveRecord(payload) {
    const now = new Date().toISOString();
    const sameDay =
      findSameDayHealthMetricRecord(
        get().records,
        payload.metricTypeId,
        payload.date
      ) ||
      (await get().findSameDayRecord(payload.metricTypeId, payload.date));

    if (sameDay && !payload.confirmUpdate) {
      return Promise.reject(new Error('DUPLICATE_HEALTH_METRIC_RECORD'));
    }

    const record: HealthMetricRecord = {
      id: sameDay?.id || genId(),
      metricTypeId: payload.metricTypeId,
      date: payload.date,
      value: payload.value,
      unit: payload.unit.trim(),
      referenceMin: payload.referenceMin,
      referenceMax: payload.referenceMax,
      note: payload.note?.trim() || '',
      createdAt: sameDay?.createdAt || now,
      updatedAt: now
    };

    set({ submitting: true, error: '' });
    try {
      await saveHealthMetricRecordToCloud(record);

      if (payload.saveAsDefault) {
        await updateHealthMetricTypeDefaults(record.metricTypeId, {
          unit: record.unit,
          referenceMin: record.referenceMin,
          referenceMax: record.referenceMax
        });
      }

      set((state) => {
        const hasExisting = state.records.some((item) => item.id === record.id);
        const records = hasExisting
          ? state.records.map((item) => (item.id === record.id ? record : item))
          : [record, ...state.records];
        const metricTypes = payload.saveAsDefault
          ? state.metricTypes.map((item) =>
              item.id === record.metricTypeId
                ? {
                    ...item,
                    unit: record.unit,
                    referenceMin: record.referenceMin,
                    referenceMax: record.referenceMax,
                    updatedAt: now
                  }
                : item
            )
          : state.metricTypes;

        return {
          records: sortHealthMetricRecords(records),
          metricTypes,
          selectedMetricTypeId: record.metricTypeId,
          submitting: false
        };
      });

      return { record, updated: Boolean(sameDay) };
    } catch (err) {
      console.error('[healthMetricStore] 保存记录失败：', err);
      set({ submitting: false, error: '保存失败，请稍后重试' });
      throw err;
    }
  },

  findSameDayRecord(metricTypeId, date) {
    return findSameDayHealthMetricRecordFromCloud(metricTypeId, date);
  }
}));
