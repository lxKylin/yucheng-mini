import {
  buildHealthMetricSummaries,
  findSameDayHealthMetricRecord,
  getHealthMetricRangeStatus,
  isFutureHealthMetricDate,
  isSameHealthMetricName
} from './healthMetricUtils';
import type { HealthMetricRecord, HealthMetricType } from '@/types';

const sampleMetricType: HealthMetricType = {
  id: 'metric_type_1',
  name: '空腹血糖',
  unit: 'mmol/L',
  referenceMin: 3.9,
  referenceMax: 6.1,
  note: '',
  status: 'active',
  createdAt: '2026-06-10T08:00:00.000Z',
  updatedAt: '2026-06-10T08:00:00.000Z'
};

const newerMetricType: HealthMetricType = {
  ...sampleMetricType,
  id: 'metric_type_2',
  name: '糖化血红蛋白',
  createdAt: '2026-06-13T08:00:00.000Z',
  updatedAt: '2026-06-13T08:00:00.000Z'
};

const olderMetricType: HealthMetricType = {
  ...sampleMetricType,
  id: 'metric_type_3',
  name: '总胆固醇',
  createdAt: '2026-06-08T08:00:00.000Z',
  updatedAt: '2026-06-08T08:00:00.000Z'
};

const sampleRecord: HealthMetricRecord = {
  id: 'metric_record_1',
  metricTypeId: 'metric_type_1',
  date: '2026-06-12',
  value: 7.2,
  unit: 'mmol/L',
  referenceMin: 3.9,
  referenceMax: 6.1,
  note: '',
  createdAt: '2026-06-12T08:00:00.000Z',
  updatedAt: '2026-06-12T08:00:00.000Z'
};

const olderSameDayRecord: HealthMetricRecord = {
  ...sampleRecord,
  id: 'metric_record_2',
  metricTypeId: 'metric_type_3',
  updatedAt: '2026-06-12T07:00:00.000Z'
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[healthMetricUtils.verify] ${message}`);
  }
}

function getSummaryMetricIds(
  metrics: HealthMetricType[],
  recordsByMetricId: Record<string, HealthMetricRecord[]>
): string {
  return buildHealthMetricSummaries(metrics, recordsByMetricId)
    .map((summary) => summary.metric.id)
    .join(',');
}

export function verifyHealthMetricUtils() {
  assert(
    getHealthMetricRangeStatus(3.2, 3.9, 6.1) === 'low',
    '低于参考范围判断失败'
  );
  assert(
    getHealthMetricRangeStatus(7.2, 3.9, 6.1) === 'high',
    '高于参考范围判断失败'
  );
  assert(
    getHealthMetricRangeStatus(5.4, 3.9, 6.1) === 'normal',
    '参考范围内判断失败'
  );
  assert(isFutureHealthMetricDate('2999-01-01'), '未来日期判断失败');
  assert(
    isSameHealthMetricName(' 血糖 ', '血糖'),
    '同名指标归一判断失败'
  );
  assert(
    findSameDayHealthMetricRecord([sampleRecord], 'metric_type_1', '2026-06-12')
      ?.id === sampleRecord.id,
    '同日同指标匹配失败'
  );
  assert(
    getSummaryMetricIds(
      [newerMetricType, sampleMetricType],
      {
        [sampleMetricType.id]: [sampleRecord],
        [newerMetricType.id]: []
      }
    ) ===
      [newerMetricType.id, sampleMetricType.id].join(','),
    '加载记录后指标顺序不应变化'
  );
  assert(
    getSummaryMetricIds([olderMetricType, newerMetricType], {}) ===
      [olderMetricType.id, newerMetricType.id].join(','),
    '无记录指标应保持原始顺序'
  );
  assert(
    getSummaryMetricIds(
      [olderMetricType, newerMetricType],
      {
        [olderMetricType.id]: [olderSameDayRecord],
        [newerMetricType.id]: [
          { ...olderSameDayRecord, id: 'metric_record_3', metricTypeId: newerMetricType.id }
        ]
      }
    ) ===
      [olderMetricType.id, newerMetricType.id].join(','),
    '同日期记录不应改变指标顺序'
  );
  assert(
    buildHealthMetricSummaries(
      [newerMetricType],
      {
        [sampleMetricType.id]: [sampleRecord],
        [newerMetricType.id]: []
      }
    ).every((summary) => summary.metric.id !== sampleMetricType.id),
    '删除后列表更新排序失败'
  );
}
