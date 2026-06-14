import {
  findSameDayHealthMetricRecord,
  getHealthMetricRangeStatus,
  isFutureHealthMetricDate,
  isSameHealthMetricName
} from './healthMetricUtils';

const sampleRecord = {
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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[healthMetricUtils.verify] ${message}`);
  }
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
}
