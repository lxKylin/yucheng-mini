import { getUserId } from '@/services/auth';
import { getCollection } from '@/services/cloud';
import type { HealthTimelineEvent } from '@/types';
import {
  migrateHealthTimelineEvent,
  sortHealthTimelineEvents
} from '@/subpackages/health/utils/healthTimelineUtils';

const COL = 'healthTimelineEvents';

type CloudEvent = Partial<HealthTimelineEvent> & {
  _id?: string | number;
  _openid?: string;
  userId?: string;
};

function requireUserId(action: string): string {
  const userId = getUserId();
  if (!userId) throw new Error(`[healthTimelineService] 缺少用户身份，无法${action}`);
  return userId;
}

function dedupe(records: CloudEvent[]): HealthTimelineEvent[] {
  const byId = new Map<string, HealthTimelineEvent>();
  records.forEach((raw) => {
    const event = migrateHealthTimelineEvent(raw);
    if (!event.id) return;
    const current = byId.get(event.id);
    if (!current || event.updatedAt > current.updatedAt) byId.set(event.id, event);
  });
  return sortHealthTimelineEvents([...byId.values()]);
}

async function queryEvents(field: '_openid' | 'userId', skip: number, limit: number) {
  const userId = requireUserId('读取健康历程');
  return getCollection(COL)
    .where({ [field]: userId })
    .orderBy('occurredAt', 'desc')
    .orderBy('updatedAt', 'desc')
    .skip(skip)
    .limit(limit)
    .get();
}

async function findUserEventDoc(id: string): Promise<string> {
  const userId = requireUserId('更新健康历程');
  const [byOpenId, byUserId] = await Promise.all([
    getCollection(COL).where({ id, _openid: userId }).limit(1).get(),
    getCollection(COL).where({ id, userId }).limit(1).get()
  ]);
  return String(byUserId.data[0]?._id ?? byOpenId.data[0]?._id ?? '');
}

export async function fetchHealthTimelineEvents(
  offset: number,
  limit: number
): Promise<{ events: HealthTimelineEvent[]; hasMore: boolean }> {
  try {
    const [byOpenId, byUserId] = await Promise.all([
      queryEvents('_openid', offset, limit),
      queryEvents('userId', offset, limit)
    ]);
    const events = dedupe([...byOpenId.data, ...byUserId.data]);
    return { events, hasMore: byOpenId.data.length === limit || byUserId.data.length === limit };
  } catch (error) {
    console.error('[healthTimelineService] 读取失败：', error);
    throw error;
  }
}

export async function createHealthTimelineEventToCloud(event: HealthTimelineEvent): Promise<void> {
  const userId = requireUserId('创建健康历程事件');
  try {
    const result = await getCollection(COL).add({ data: { ...event, userId } });
    if (!result._id) throw new Error('[healthTimelineService] 事件未实际创建');
  } catch (error) {
    console.error('[healthTimelineService] 创建失败：', error);
    throw error;
  }
}

export async function updateHealthTimelineEventInCloud(
  id: string,
  payload: HealthTimelineEvent
): Promise<void> {
  try {
    const docId = await findUserEventDoc(id);
    if (!docId) throw new Error('[healthTimelineService] 事件不存在或不属于当前用户');
    const result = await getCollection(COL).doc(docId).update({ data: payload });
    if (result.stats.updated !== 1) throw new Error('[healthTimelineService] 事件未实际更新');
  } catch (error) {
    console.error('[healthTimelineService] 更新失败：', error);
    throw error;
  }
}

export async function deleteHealthTimelineEventFromCloud(id: string): Promise<void> {
  try {
    const docId = await findUserEventDoc(id);
    if (!docId) throw new Error('[healthTimelineService] 事件不存在或不属于当前用户');
    const result = await getCollection(COL).doc(docId).remove({});
    if (result.stats.removed !== 1) throw new Error('[healthTimelineService] 事件未实际删除');
  } catch (error) {
    console.error('[healthTimelineService] 删除失败：', error);
    throw error;
  }
}
