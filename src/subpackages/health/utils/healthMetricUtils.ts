import { HEALTH_METRIC_VALUE_PRECISION } from '@/subpackages/health/constants/healthMetric';
import type {
  HealthMetricRangeStatus,
  HealthMetricRecord,
  HealthMetricTrendPoint,
  HealthMetricType
} from '@/types';
import { formatDisplay, parseDate, today } from '@/utils/dateUtils';

export function normalizeHealthMetricName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isSameHealthMetricName(a: string, b: string): boolean {
  return normalizeHealthMetricName(a) === normalizeHealthMetricName(b);
}

export function parseOptionalMetricNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const num = Number(trimmed);
  return Number.isFinite(num) ? num : Number.NaN;
}

export function formatHealthMetricValue(
  value: number | null | undefined,
  precision = HEALTH_METRIC_VALUE_PRECISION
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, '');
}

export function getHealthMetricRangeStatus(
  value: number,
  referenceMin: number | null | undefined,
  referenceMax: number | null | undefined
): HealthMetricRangeStatus {
  if (referenceMin !== null && referenceMin !== undefined && value < referenceMin) {
    return 'low';
  }

  if (referenceMax !== null && referenceMax !== undefined && value > referenceMax) {
    return 'high';
  }

  if (referenceMin === null && referenceMax === null) {
    return 'unknown';
  }

  return 'normal';
}

export function getHealthMetricRangeLabel(
  status: HealthMetricRangeStatus
): string {
  if (status === 'low') return '低于参考范围';
  if (status === 'high') return '高于参考范围';
  if (status === 'normal') return '参考范围内';
  return '未填写参考范围';
}

export function hasInvalidHealthMetricRange(
  referenceMin: number | null,
  referenceMax: number | null
): boolean {
  return (
    referenceMin !== null &&
    referenceMax !== null &&
    Number.isFinite(referenceMin) &&
    Number.isFinite(referenceMax) &&
    referenceMin > referenceMax
  );
}

export function isFutureHealthMetricDate(date: string): boolean {
  return date > today();
}

export function sortHealthMetricRecords(
  records: HealthMetricRecord[]
): HealthMetricRecord[] {
  return records
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

export function findSameDayHealthMetricRecord(
  records: HealthMetricRecord[],
  metricTypeId: string,
  date: string
): HealthMetricRecord | null {
  return (
    records.find(
      (record) => record.metricTypeId === metricTypeId && record.date === date
    ) ?? null
  );
}

export function getLatestHealthMetricRecord(
  records: HealthMetricRecord[],
  metricTypeId: string
): HealthMetricRecord | null {
  return sortHealthMetricRecords(
    records.filter((record) => record.metricTypeId === metricTypeId)
  )[0] ?? null;
}

export function pickDefaultHealthMetricId(
  metrics: HealthMetricType[],
  records: HealthMetricRecord[]
): string {
  const latest = sortHealthMetricRecords(records)[0];
  if (latest && metrics.some((metric) => metric.id === latest.metricTypeId)) {
    return latest.metricTypeId;
  }

  return metrics[0]?.id ?? '';
}

export function buildHealthMetricTrendPoints(
  records: HealthMetricRecord[],
  metric: HealthMetricType | null
): HealthMetricTrendPoint[] {
  const unit = metric?.unit ?? '';
  const trendRecords = sortHealthMetricRecords(records).reverse();

  return trendRecords.map((record) => {
    const value = record.value;
    const rangeStatus = getHealthMetricRangeStatus(
      value,
      record.referenceMin,
      record.referenceMax
    );

    return {
      date: record.date,
      dayLabel: formatDisplay(parseDate(record.date)),
      value,
      displayValue: formatHealthMetricValue(value),
      unit: record.unit || unit,
      rangeStatus,
      record
    };
  });
}
