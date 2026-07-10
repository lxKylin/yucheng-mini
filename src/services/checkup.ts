import Taro from '@tarojs/taro';

import {
  CHECKUP_STATUS,
  CHECKUP_TYPE_OPTIONS,
  DEFAULT_BEFORE,
  DEFAULT_REMIND_TIME
} from '@/constants';
import type { CheckupReminder, CheckupType } from '@/types';
import { today } from '@/utils/dateUtils';
import { getUserId } from './auth';
import { getCollection } from './cloud';

const COL = 'checkups';
const QUERYABLE_CHECKUP_STATUSES = [
  CHECKUP_STATUS.ACTIVE,
  CHECKUP_STATUS.PAUSED,
  CHECKUP_STATUS.DONE
];

function normalizeCheckupType(value: unknown): CheckupType {
  const matched = CHECKUP_TYPE_OPTIONS.find((option) => option.value === value);
  return matched?.value ?? 'follow_up';
}

function toNumber(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeHistory(value: unknown): CheckupReminder['completionHistory'] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      date: item.date || item.completedDate || today(),
      note: item.note || '',
      createdAt: item.createdAt || ''
    }));
}

export function migrateCheckup(raw: any): CheckupReminder {
  const now = new Date().toISOString();

  return {
    id: raw.id ?? raw._id ?? '',
    title: raw.title ?? raw.name ?? '',
    type: normalizeCheckupType(raw.type),
    targetDate: raw.targetDate || raw.checkupDate || today(),
    remindAdvanceDays: toNumber(
      raw.remindAdvanceDays ?? raw.before,
      DEFAULT_BEFORE
    ),
    remindTime: raw.remindTime || raw.time || DEFAULT_REMIND_TIME,
    status: raw.status ?? CHECKUP_STATUS.ACTIVE,
    relatedMedicineIds: toStringArray(raw.relatedMedicineIds),
    hospital: raw.hospital ?? '',
    note: raw.note ?? raw.notes ?? '',
    completionHistory: normalizeHistory(raw.completionHistory),
    lastWechatReminderDate: raw.lastWechatReminderDate ?? '',
    lastWechatReminderAt: raw.lastWechatReminderAt ?? '',
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? now
  };
}

async function queryUserCheckups(field: '_openid' | 'userId', userId: string) {
  return getCollection(COL)
    .where({
      [field]: userId,
      status: Taro.cloud.database().command.in(QUERYABLE_CHECKUP_STATUSES)
    })
    .limit(100)
    .orderBy('targetDate', 'asc')
    .get();
}

async function findUserCheckupDoc(id: string, userId: string) {
  const byOpenId = await getCollection(COL)
    .where({ id, _openid: userId })
    .limit(1)
    .get();
  if (byOpenId.data[0]?._id) {
    return byOpenId.data[0]._id;
  }

  const byUserId = await getCollection(COL)
    .where({ id, userId })
    .limit(1)
    .get();
  if (byUserId.data[0]?._id) {
    return byUserId.data[0]._id;
  }

  return null;
}

function requireUserId(action: string): string {
  const userId = getUserId();
  if (!userId) {
    throw new Error(`[checkupService] 缺少用户身份，无法${action}`);
  }

  return userId;
}

export async function fetchCheckups(): Promise<CheckupReminder[]> {
  const userId = getUserId();
  if (!userId) return [];

  try {
    const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
      queryUserCheckups('_openid', userId),
      queryUserCheckups('userId', userId)
    ]);

    const data = [...openIdData, ...userIdData].filter(
      (item, index, list) =>
        index ===
        list.findIndex(
          (candidate) =>
            (candidate._id && candidate._id === item._id) ||
            (candidate.id && candidate.id === item.id)
        )
    );

    return data.map((item: any) => migrateCheckup(item));
  } catch (err) {
    console.error('[checkupService] 拉取失败：', err);
    throw err;
  }
}

export async function addCheckupToCloud(
  checkup: CheckupReminder
): Promise<void> {
  const userId = requireUserId('新增检查提醒');

  try {
    await getCollection(COL).add({
      data: { ...checkup, userId }
    });
  } catch (err) {
    console.error('[checkupService] 新增失败：', err);
    throw err;
  }
}

export async function updateCheckupInCloud(
  id: string,
  payload: Partial<CheckupReminder>
): Promise<void> {
  const userId = requireUserId('更新检查提醒');

  try {
    const docId = await findUserCheckupDoc(id, userId);
    if (!docId) {
      throw new Error('[checkupService] 检查提醒不存在或不属于当前用户');
    }
    const result = await getCollection(COL)
      .doc(docId)
      .update({ data: payload });
    if (result.stats.updated !== 1) {
      throw new Error('[checkupService] 检查提醒未实际更新');
    }
  } catch (err) {
    console.error('[checkupService] 更新失败：', err);
    throw err;
  }
}

export async function deleteCheckupInCloud(id: string): Promise<void> {
  const userId = requireUserId('删除检查提醒');

  try {
    const payload = {
      status: CHECKUP_STATUS.DELETED,
      updatedAt: new Date().toISOString()
    };
    const docId = await findUserCheckupDoc(id, userId);
    if (!docId) {
      throw new Error('[checkupService] 检查提醒不存在或不属于当前用户');
    }
    const result = await getCollection(COL)
      .doc(docId)
      .update({ data: payload });
    if (result.stats.updated !== 1) {
      throw new Error('[checkupService] 检查提醒未实际删除');
    }
  } catch (err) {
    console.error('[checkupService] 删除失败：', err);
    throw err;
  }
}
