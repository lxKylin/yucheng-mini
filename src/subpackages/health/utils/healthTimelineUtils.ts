import { HEALTH_TIMELINE_EVENT_TYPES } from '@/subpackages/health/constants/healthTimeline';
import type {
  HealthTimelineEvent,
  HealthTimelineEventForm,
  HealthTimelineEventType
} from '@/types';
import { formatDate, parseDate, today } from '@/utils/dateUtils';

const EVENT_TYPES = new Set(HEALTH_TIMELINE_EVENT_TYPES.map((item) => item.value));

function isDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    formatDate(parseDate(value)) === value
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string')))
    : [];
}

export function formatTimelineDate(value: string): string {
  if (!isDate(value)) return '日期未填写';
  return `${value.slice(0, 4)}年${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
}

export function getHealthTimelineEventTypeLabel(type: HealthTimelineEventType): string {
  return HEALTH_TIMELINE_EVENT_TYPES.find((item) => item.value === type)?.label ?? '其他事件';
}

export function isTreatmentEvent(type: HealthTimelineEventType): boolean {
  return type === 'treatment';
}

export function sortHealthTimelineEvents(events: HealthTimelineEvent[]): HealthTimelineEvent[] {
  return events
    .slice()
    .sort(
      (a, b) =>
        b.occurredAt.localeCompare(a.occurredAt) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        b.id.localeCompare(a.id)
    );
}

export function validateHealthTimelineEventForm(
  form: HealthTimelineEventForm
): Partial<Record<keyof HealthTimelineEventForm, string>> {
  const errors: Partial<Record<keyof HealthTimelineEventForm, string>> = {};
  const title = form.title.trim();
  const occurredAt = form.occurredAt;

  if (!EVENT_TYPES.has(form.eventType)) errors.eventType = '请选择有效的事件类型';
  if (!title) errors.title = '请填写事件标题';
  if (title.length > 60) errors.title = '标题不超过 60 个字符';
  if (!isDate(form.occurredAt)) errors.occurredAt = '请选择有效日期';
  if (occurredAt > today()) errors.occurredAt = '健康历程仅记录已发生事件';
  if (form.note.trim().length > 500) errors.note = '备注不超过 500 个字符';

  if (isTreatmentEvent(form.eventType) && !form.isOngoing && form.endedAt) {
    const endedAt = form.endedAt;
    if (!isDate(form.endedAt)) errors.endedAt = '请选择有效的结束日期';
    if (endedAt > today()) errors.endedAt = '结束日期不能晚于今天';
    if (endedAt < occurredAt) errors.endedAt = '结束日期不能早于开始日期';
  }

  return errors;
}

export function migrateHealthTimelineEvent(raw: unknown): HealthTimelineEvent {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const now = new Date().toISOString();
  const eventType = EVENT_TYPES.has(source.eventType as HealthTimelineEventType)
    ? (source.eventType as HealthTimelineEventType)
    : 'other';
  const occurredAt = isDate(source.occurredAt) ? source.occurredAt : today();

  return {
    id: typeof source.id === 'string' && source.id ? source.id : String(source._id ?? ''),
    eventType,
    title: typeof source.title === 'string' ? source.title.trim() : '',
    occurredAt,
    note: typeof source.note === 'string' ? source.note : '',
    relatedMedicineIds: stringArray(source.relatedMedicineIds),
    relatedCheckupIds: stringArray(source.relatedCheckupIds),
    endedAt: isTreatmentEvent(eventType) && isDate(source.endedAt)
      ? source.endedAt
      : '',
    isOngoing: isTreatmentEvent(eventType) && source.isOngoing === true,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : now
  };
}
