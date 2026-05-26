import {
  DEFAULT_HEALTH_MEDICATION_ADHERENCE,
  HEALTH_MEDICATION_ADHERENCE_OPTIONS,
  HEALTH_OVERALL_STATUS_OPTIONS,
  HEALTH_SYMPTOM_TAG_OPTIONS
} from '@/constants';
import type {
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthStatusRecord,
  HealthStatusSummary,
  HealthSymptomTag,
  Medicine
} from '@/types';
import { formatDate, parseDate, today } from '@/utils/dateUtils';

const OVERALL_VALUES = HEALTH_OVERALL_STATUS_OPTIONS.map(
  (option) => option.value
);
const SYMPTOM_VALUES = HEALTH_SYMPTOM_TAG_OPTIONS.map((option) => option.value);
const ADHERENCE_VALUES = HEALTH_MEDICATION_ADHERENCE_OPTIONS.map(
  (option) => option.value
);

function isDateString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    formatDate(parseDate(value)) === value
  );
}

function isOverallStatus(value: unknown): value is HealthOverallStatus {
  return OVERALL_VALUES.includes(value as HealthOverallStatus);
}

function isSymptomTag(value: unknown): value is HealthSymptomTag {
  return SYMPTOM_VALUES.includes(value as HealthSymptomTag);
}

function isMedicationAdherence(
  value: unknown
): value is HealthMedicationAdherence {
  return ADHERENCE_VALUES.includes(value as HealthMedicationAdherence);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function dedupeStringArray<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function migrateHealthStatus(raw: unknown): HealthStatusRecord {
  const source: Record<string, unknown> =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const now = new Date().toISOString();
  const symptomTags = dedupeStringArray(
    toStringArray(source.symptomTags).filter(isSymptomTag)
  );

  return {
    id: toStringValue(source.id, toStringValue(source._id)),
    date: isDateString(source.date) ? source.date : today(),
    overallStatus: isOverallStatus(source.overallStatus)
      ? source.overallStatus
      : 'normal',
    symptomTags,
    medicationAdherence: isMedicationAdherence(source.medicationAdherence)
      ? source.medicationAdherence
      : DEFAULT_HEALTH_MEDICATION_ADHERENCE,
    relatedMedicineIds: dedupeStringArray(
      toStringArray(source.relatedMedicineIds)
    ),
    note: toStringValue(source.note),
    createdAt: toStringValue(source.createdAt, now),
    updatedAt: toStringValue(
      source.updatedAt,
      toStringValue(source.createdAt, now)
    )
  };
}

export function getOverallStatusLabel(value: HealthOverallStatus): string {
  return (
    HEALTH_OVERALL_STATUS_OPTIONS.find((option) => option.value === value)
      ?.label ?? '一般'
  );
}

export function getSymptomTagLabel(value: HealthSymptomTag): string {
  return (
    HEALTH_SYMPTOM_TAG_OPTIONS.find((option) => option.value === value)
      ?.label ?? '其他'
  );
}

export function getMedicationAdherenceLabel(
  value: HealthMedicationAdherence
): string {
  return (
    HEALTH_MEDICATION_ADHERENCE_OPTIONS.find((option) => option.value === value)
      ?.label ?? '正常服用'
  );
}

export function buildTodayHealthStatusSummary(
  record: HealthStatusRecord | null
): string {
  if (!record) {
    return '今天身体感觉怎么样？';
  }

  const symptomText = record.symptomTags
    .slice(0, 2)
    .map(getSymptomTagLabel)
    .join('、');
  const overall = getOverallStatusLabel(record.overallStatus);
  return symptomText ? `${overall} · ${symptomText}` : overall;
}

export function buildRelatedMedicineNames(
  record: HealthStatusRecord,
  medicines: Medicine[]
): string[] {
  return record.relatedMedicineIds
    .map((id) => medicines.find((medicine) => medicine.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function buildHealthStatusSummary(
  records: HealthStatusRecord[]
): HealthStatusSummary {
  const tagCounts = new Map<HealthSymptomTag, number>();

  for (const record of records) {
    for (const tag of record.symptomTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    totalDays: records.length,
    uncomfortableDays: records.filter(
      (record) =>
        record.overallStatus === 'uncomfortable' ||
        record.overallStatus === 'bad'
    ).length,
    abnormalAdherenceDays: records.filter(
      (record) => record.medicationAdherence !== 'normal'
    ).length,
    commonSymptomTags: Array.from(tagCounts.entries())
      .map(([value, count]) => ({
        value,
        label: getSymptomTagLabel(value),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  };
}
