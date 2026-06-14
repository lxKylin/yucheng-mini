import Taro from '@tarojs/taro';

import { getUserId } from '@/services/auth';
import { getCollection } from '@/services/cloud';
import { HEALTH_METRIC_STATUS } from '@/subpackages/health/constants/healthMetric';
import type { HealthMetricRecord, HealthMetricType } from '@/types';
import { sortHealthMetricRecords } from '@/subpackages/health/utils/healthMetricUtils';

const TYPE_COL = 'healthMetricTypes';
const RECORD_COL = 'healthMetricRecords';
const DOC_LIMIT = 100;
const RECORD_LIMIT = 20;

interface FetchHealthMetricRecordsOptions {
  metricTypeId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

type HealthMetricTypeCloudRecord = Partial<HealthMetricType> & {
  _id?: string | number;
  _openid?: string;
  userId?: string;
};

type HealthMetricRecordCloudRecord = Partial<HealthMetricRecord> & {
  _id?: string | number;
  _openid?: string;
  userId?: string;
};

function migrateMetricType(record: HealthMetricTypeCloudRecord): HealthMetricType {
  const now = new Date().toISOString();

  return {
    id: typeof record.id === 'string' && record.id ? record.id : String(record._id ?? ''),
    name: typeof record.name === 'string' ? record.name : '',
    unit: typeof record.unit === 'string' ? record.unit : '',
    referenceMin:
      typeof record.referenceMin === 'number' ? record.referenceMin : null,
    referenceMax:
      typeof record.referenceMax === 'number' ? record.referenceMax : null,
    note: typeof record.note === 'string' ? record.note : '',
    status:
      record.status === HEALTH_METRIC_STATUS.HIDDEN ||
      record.status === HEALTH_METRIC_STATUS.DELETED
        ? record.status
        : HEALTH_METRIC_STATUS.ACTIVE,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now
  };
}

function migrateMetricRecord(
  record: HealthMetricRecordCloudRecord
): HealthMetricRecord {
  const now = new Date().toISOString();

  return {
    id: typeof record.id === 'string' && record.id ? record.id : String(record._id ?? ''),
    metricTypeId: typeof record.metricTypeId === 'string' ? record.metricTypeId : '',
    date: typeof record.date === 'string' ? record.date : '',
    value: typeof record.value === 'number' ? record.value : Number(record.value ?? 0),
    unit: typeof record.unit === 'string' ? record.unit : '',
    referenceMin:
      typeof record.referenceMin === 'number' ? record.referenceMin : null,
    referenceMax:
      typeof record.referenceMax === 'number' ? record.referenceMax : null,
    note: typeof record.note === 'string' ? record.note : '',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function queryUserDocs(collectionName: string, field: '_openid' | 'userId') {
  const userId = getUserId();
  if (!userId) return { data: [] };

  return getCollection(collectionName).where({ [field]: userId }).limit(DOC_LIMIT).get();
}

async function findMetricTypeDoc(metricTypeId: string) {
  const userId = getUserId();
  if (!userId) return null;

  const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
    getCollection(TYPE_COL).where({ id: metricTypeId, _openid: userId }).limit(1).get(),
    getCollection(TYPE_COL).where({ id: metricTypeId, userId }).limit(1).get()
  ]);

  return (userIdData[0] || openIdData[0] || null) as
    | HealthMetricTypeCloudRecord
    | null;
}

async function findMetricRecordDoc(recordId: string) {
  const userId = getUserId();
  if (!userId) return null;

  const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
    getCollection(RECORD_COL).where({ id: recordId, _openid: userId }).limit(1).get(),
    getCollection(RECORD_COL).where({ id: recordId, userId }).limit(1).get()
  ]);

  return (userIdData[0] || openIdData[0] || null) as
    | HealthMetricRecordCloudRecord
    | null;
}

export async function fetchHealthMetricTypes(): Promise<HealthMetricType[]> {
  const userId = getUserId();
  if (!userId) return [];

  try {
    const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
      queryUserDocs(TYPE_COL, '_openid'),
      queryUserDocs(TYPE_COL, 'userId')
    ]);

    return uniqueById([...openIdData, ...userIdData].map(migrateMetricType))
      .filter((item) => item.status !== HEALTH_METRIC_STATUS.DELETED)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (err) {
    console.error('[healthMetricService] 拉取指标类型失败：', err);
    throw err;
  }
}

export async function fetchHealthMetricRecords({
  metricTypeId,
  startDate,
  endDate,
  limit = RECORD_LIMIT
}: FetchHealthMetricRecordsOptions): Promise<HealthMetricRecord[]> {
  const userId = getUserId();
  if (!userId || !metricTypeId) return [];

  const db = Taro.cloud.database();
  const _ = db.command;
  const queryLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : RECORD_LIMIT;
  const dateQuery =
    startDate && endDate
      ? {
          date: _.gte(startDate).and(_.lte(endDate))
        }
      : {};

  async function query(field: '_openid' | 'userId') {
    return getCollection(RECORD_COL)
      .where({
        [field]: userId,
        metricTypeId,
        ...dateQuery
      })
      .orderBy('date', 'desc')
      .limit(queryLimit)
      .get();
  }

  try {
    const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
      query('_openid'),
      query('userId')
    ]);

    return sortHealthMetricRecords(
      uniqueById([...openIdData, ...userIdData].map(migrateMetricRecord))
    );
  } catch (err) {
    console.error('[healthMetricService] 拉取指标记录失败：', err);
    throw err;
  }
}

export async function createHealthMetricTypeToCloud(
  metric: HealthMetricType
): Promise<void> {
  const userId = getUserId();
  if (!userId) {
    throw new Error('[healthMetricService] 缺少用户身份，无法创建指标类型');
  }

  await getCollection(TYPE_COL).add({ data: { ...metric, userId } });
}

export async function updateHealthMetricTypeDefaults(
  metricTypeId: string,
  patch: Pick<HealthMetricType, 'unit' | 'referenceMin' | 'referenceMax'>
): Promise<void> {
  const userId = getUserId();
  if (!userId) {
    throw new Error('[healthMetricService] 缺少用户身份，无法更新指标默认设置');
  }

  const doc = await findMetricTypeDoc(metricTypeId);

  if (!doc?._id) return;

  await getCollection(TYPE_COL)
    .doc(String(doc._id))
    .update({ data: { ...patch, updatedAt: new Date().toISOString() } });
}

export async function updateHealthMetricTypeToCloud(
  metricTypeId: string,
  patch: Pick<HealthMetricType, 'name' | 'unit' | 'referenceMin' | 'referenceMax'>
): Promise<void> {
  const userId = getUserId();
  if (!userId) {
    throw new Error('[healthMetricService] 缺少用户身份，无法更新指标类型');
  }

  const doc = await findMetricTypeDoc(metricTypeId);

  if (!doc?._id) return;

  await getCollection(TYPE_COL)
    .doc(String(doc._id))
    .update({ data: { ...patch, updatedAt: new Date().toISOString() } });
}

export async function findSameDayHealthMetricRecordFromCloud(
  metricTypeId: string,
  date: string
): Promise<HealthMetricRecord | null> {
  const userId = getUserId();
  if (!userId) return null;

  const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
    getCollection(RECORD_COL).where({ metricTypeId, date, _openid: userId }).limit(5).get(),
    getCollection(RECORD_COL).where({ metricTypeId, date, userId }).limit(5).get()
  ]);
  const all = sortHealthMetricRecords(
    [...openIdData, ...userIdData].map(migrateMetricRecord)
  );

  return all[0] ?? null;
}

export async function saveHealthMetricRecordToCloud(
  record: HealthMetricRecord
): Promise<void> {
  const userId = getUserId();
  if (!userId) {
    throw new Error('[healthMetricService] 缺少用户身份，无法保存指标记录');
  }

  const existing = await findSameDayHealthMetricRecordFromCloud(
    record.metricTypeId,
    record.date
  );

  if (existing) {
    const doc = await findMetricRecordDoc(existing.id);

    if (doc?._id) {
      await getCollection(RECORD_COL)
        .doc(String(doc._id))
        .update({ data: { ...record, id: existing.id, userId } });
      return;
    }
  }

  await getCollection(RECORD_COL).add({ data: { ...record, userId } });
}
