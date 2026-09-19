import type {
  HealthTimelineEventForm,
  HealthTimelineEventType
} from '@/types';
import { today } from '@/utils/dateUtils';

export const HEALTH_TIMELINE_EVENT_TYPES: {
  value: HealthTimelineEventType;
  label: string;
}[] = [
  { value: 'diagnosis', label: '确诊或疑似诊断' },
  { value: 'condition_change', label: '症状或病程变化' },
  { value: 'test_result', label: '检查结果' },
  { value: 'visit', label: '就诊或复诊' },
  { value: 'treatment', label: '治疗开始或调整' },
  { value: 'hospitalization', label: '住院或手术' },
  { value: 'milestone', label: '重要里程碑' },
  { value: 'other', label: '其他事件' }
];

export const HEALTH_TIMELINE_PAGE_SIZE = 30;
export const HEALTH_TIMELINE_TITLE_MAX_LENGTH = 60;
export const HEALTH_TIMELINE_NOTE_MAX_LENGTH = 500;

export function createDefaultHealthTimelineEventForm(): HealthTimelineEventForm {
  return {
    eventType: 'diagnosis',
    title: '',
    occurredAt: today(),
    note: '',
    relatedMedicineIds: [],
    relatedCheckupIds: [],
    endedAt: '',
    isOngoing: false
  };
}
