import type { HealthTimelineEvent, HealthTimelineEventForm } from '@/types';
import {
  formatTimelineDate,
  sortHealthTimelineEvents,
  validateHealthTimelineEventForm
} from './healthTimelineUtils';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[healthTimelineUtils.verify] ${message}`);
}

export function verifyHealthTimelineUtils() {
  const base: HealthTimelineEventForm = {
    eventType: 'treatment', title: '治疗调整', occurredAt: '2026-06-12',
    note: '', relatedMedicineIds: [], relatedCheckupIds: [],
    endedAt: '', isOngoing: false
  };
  const events: HealthTimelineEvent[] = [
    { ...base, id: 'older', createdAt: '', updatedAt: '2026-06-12T07:00:00.000Z' },
    { ...base, id: 'newer', createdAt: '', updatedAt: '2026-06-12T08:00:00.000Z' }
  ];
  assert(formatTimelineDate('2026-06-12') === '2026年6月12日', '日期展示失败');
  assert(sortHealthTimelineEvents(events)[0]?.id === 'newer', '同日稳定排序失败');
  assert(validateHealthTimelineEventForm({ ...base, endedAt: '2026-06-11' }).endedAt === '结束日期不能早于开始日期', '治疗时段校验失败');
}
