import Taro from '@tarojs/taro';

import type { HealthStatusRecord } from '@/types';
import { migrateHealthStatus } from '@/utils/healthStatusUtils';
import { getUserId } from './auth';
import { getCollection } from './cloud';

const COL = 'dailyHealthStatuses';
const SAME_DAY_DOC_LIMIT = 20;

type HealthStatusCloudRecord = Partial<HealthStatusRecord> & {
  _id?: string | number;
  _openid?: string;
  userId?: string;
};

function getCandidateTimestamp(record: HealthStatusCloudRecord): string {
  return typeof record.updatedAt === 'string' && record.updatedAt
    ? record.updatedAt
    : typeof record.createdAt === 'string'
      ? record.createdAt
      : '';
}

function getCandidateStableId(record: HealthStatusCloudRecord): string {
  return record._id
    ? String(record._id)
    : typeof record.id === 'string'
      ? record.id
      : '';
}

function compareHealthStatusCandidate(
  a: HealthStatusCloudRecord,
  b: HealthStatusCloudRecord
): number {
  const timeCompare = getCandidateTimestamp(b).localeCompare(
    getCandidateTimestamp(a)
  );
  if (timeCompare !== 0) return timeCompare;

  return getCandidateStableId(b).localeCompare(getCandidateStableId(a));
}

function pickLatestHealthStatusCandidate(
  records: HealthStatusCloudRecord[]
): HealthStatusCloudRecord | null {
  return records.slice().sort(compareHealthStatusCandidate)[0] ?? null;
}

async function queryUserHealthStatuses(
  field: '_openid' | 'userId',
  userId: string,
  startDate: string,
  endDate: string
) {
  const db = Taro.cloud.database();
  const _ = db.command;

  return getCollection(COL)
    .where({
      [field]: userId,
      date: _.gte(startDate).and(_.lte(endDate))
    })
    .limit(100)
    .orderBy('date', 'desc')
    .get();
}

async function findUserHealthStatusDocByDate(date: string) {
  const userId = getUserId();
  if (!userId) return '';

  const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
    getCollection(COL)
      .where({ date, _openid: userId })
      .limit(SAME_DAY_DOC_LIMIT)
      .get(),
    getCollection(COL)
      .where({ date, userId })
      .limit(SAME_DAY_DOC_LIMIT)
      .get()
  ]);
  const latest = pickLatestHealthStatusCandidate([
    ...openIdData,
    ...userIdData
  ]);

  return latest?._id ? String(latest._id) : '';
}

function dedupe(records: HealthStatusCloudRecord[]): HealthStatusRecord[] {
  const latestByDate = records.reduce<Record<string, HealthStatusCloudRecord>>(
    (result, item) => {
      const key = item.date || getCandidateStableId(item);
      if (!key) return result;

      const existing = result[key];
      if (!existing || compareHealthStatusCandidate(item, existing) < 0) {
        result[key] = item;
      }

      return result;
    },
    {}
  );

  return Object.values(latestByDate).map((item) => migrateHealthStatus(item));
}

export async function fetchHealthStatuses(
  startDate: string,
  endDate: string
): Promise<HealthStatusRecord[]> {
  const userId = getUserId();
  if (!userId) return [];

  try {
    const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
      queryUserHealthStatuses('_openid', userId, startDate, endDate),
      queryUserHealthStatuses('userId', userId, startDate, endDate)
    ]);

    return dedupe([...openIdData, ...userIdData]).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  } catch (err) {
    console.error('[healthStatusService] 拉取失败：', err);
    throw err;
  }
}

export async function saveHealthStatusToCloud(
  record: HealthStatusRecord
): Promise<void> {
  const userId = getUserId();
  if (!userId) {
    throw new Error('[healthStatusService] 缺少用户身份，无法保存每日健康状态');
  }

  try {
    const docId = await findUserHealthStatusDocByDate(record.date);
    if (docId) {
      await getCollection(COL)
        .doc(docId)
        .update({ data: { ...record, userId } });
      return;
    }

    await getCollection(COL).add({
      data: { ...record, userId }
    });
  } catch (err) {
    console.error('[healthStatusService] 保存失败：', err);
    throw err;
  }
}
