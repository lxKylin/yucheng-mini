import Taro from '@tarojs/taro';

import {
  DEFAULT_BEFORE,
  DEFAULT_INTERVAL,
  DEFAULT_REMIND_TIME,
  REMINDER_STATUS
} from '@/constants';
import type {
  DosageUnit,
  Medicine,
  MedicineForm,
  MedicineSchedule
} from '@/types';
import { today } from '@/utils/dateUtils';
import { isValidDateString, roundQuantity } from '@/utils/medicineInventory';
import { getCollection } from './cloud';
import { getUserId } from './auth';

const COL = 'medicines';
const QUERYABLE_REMINDER_STATUSES = [
  REMINDER_STATUS.ACTIVE,
  REMINDER_STATUS.PAUSED
];

const DOSAGE_UNITS: DosageUnit[] = ['片', '粒', 'ml', '支', '贴', '滴'];
const SCHEDULE_TIMINGS: MedicineSchedule[] = [
  '饭前',
  '饭后',
  '随餐',
  '空腹',
  '睡前',
  '固定时间',
  '按医嘱'
];

function normalizeMedicineForm(value: unknown): MedicineForm {
  if (
    value === 'tablet' ||
    value === 'capsule' ||
    value === 'liquid' ||
    value === 'injection' ||
    value === 'external' ||
    value === 'patch' ||
    value === 'drops' ||
    value === 'other'
  ) {
    return value;
  }

  const text = String(value || '');
  if (text === '片剂') return 'tablet';
  if (text === '胶囊') return 'capsule';
  if (text === '注射剂' || text === '注射液') return 'injection';
  if (text === '滴剂') return 'drops';
  if (text === '液体' || text === '口服液') return 'liquid';
  if (text === '外用') return 'external';
  if (text === '贴剂') return 'patch';
  return 'other';
}

function normalizeDosageUnit(value: unknown): DosageUnit {
  return DOSAGE_UNITS.includes(value as DosageUnit)
    ? (value as DosageUnit)
    : '片';
}

function normalizeScheduleTiming(value: unknown): MedicineSchedule {
  return SCHEDULE_TIMINGS.includes(value as MedicineSchedule)
    ? (value as MedicineSchedule)
    : '饭后';
}

function toNumber(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toArray(value: unknown): string[] {
  return Array.isArray(value) ? value : [];
}

function normalizeNonNegativeQuantity(value: unknown): number {
  const next = Number(value);
  return Number.isFinite(next) ? roundQuantity(Math.max(0, next)) : 0;
}

function normalizeInventoryDate(value: unknown): string {
  return isValidDateString(value) ? value : '';
}

export function migrateMedicine(raw: any): Medicine {
  const id = raw.id ?? raw._id ?? '';
  const name = raw.name ?? raw.medicineName ?? '';
  const spec = raw.spec ?? raw.medicineSpec ?? '';
  const currentPrescriptionDate =
    raw.currentPrescriptionDate || raw.lastDate || today();

  return {
    id,
    name,
    spec,
    form: normalizeMedicineForm(raw.form ?? raw.dosageForm ?? 'tablet'),
    expiryDate: raw.expiryDate ?? '',
    note: raw.note ?? raw.notes ?? '',
    dosagePerUse: toNumber(raw.dosagePerUse ?? raw.dosePerTime, 1),
    dosageUnit: normalizeDosageUnit(raw.dosageUnit ?? raw.doseUnit),
    timesPerDay: toNumber(raw.timesPerDay, 1),
    scheduleTiming: normalizeScheduleTiming(raw.scheduleTiming ?? raw.timing),
    scheduleTime: raw.scheduleTime ?? raw.timingTime ?? '',
    inventoryTrackingEnabled: raw.inventoryTrackingEnabled === true,
    inventoryEstimateMode:
      raw.inventoryEstimateMode === 'automatic' ? 'automatic' : 'manual',
    inventoryBaseQuantity: normalizeNonNegativeQuantity(
      raw.inventoryBaseQuantity
    ),
    inventoryBaseDate: normalizeInventoryDate(raw.inventoryBaseDate),
    inventoryNeedsCalibration: raw.inventoryNeedsCalibration === true,
    inventoryUpdatedAt:
      typeof raw.inventoryUpdatedAt === 'string'
        ? raw.inventoryUpdatedAt
        : '',
    reminderEnabled: raw.reminderEnabled ?? true,
    currentPrescriptionDate,
    intervalDays: toNumber(raw.intervalDays, DEFAULT_INTERVAL),
    remindAdvanceDays: toNumber(raw.remindAdvanceDays, DEFAULT_BEFORE),
    remindTime: raw.remindTime || DEFAULT_REMIND_TIME,
    status: raw.status ?? REMINDER_STATUS.ACTIVE,
    prescriptionHistory: toArray(raw.prescriptionHistory),
    lastWechatReminderDate: raw.lastWechatReminderDate ?? '',
    lastWechatReminderAt: raw.lastWechatReminderAt ?? '',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? ''
  };
}

async function queryUserReminders(field: '_openid' | 'userId', userId: string) {
  return getCollection(COL)
    .where({
      [field]: userId,
      status: Taro.cloud.database().command.in(QUERYABLE_REMINDER_STATUSES)
    })
    .limit(100)
    .orderBy('createdAt', 'asc')
    .get();
}

async function findUserMedicineDoc(id: string, userId: string) {
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
    throw new Error(`[reminderService] 缺少用户身份，无法${action}`);
  }

  return userId;
}

/** 拉取当前用户的全部提醒（排除 deleted） */
export async function fetchReminders(): Promise<Medicine[]> {
  const userId = getUserId();
  console.log('[reminderService] 当前用户 ID：', userId);
  if (!userId) return [];

  try {
    const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
      queryUserReminders('_openid', userId),
      queryUserReminders('userId', userId)
    ]);
    console.log('[_openid] 拉取数据：', openIdData);
    console.log('[userId] 拉取数据：', userIdData);

    const data = [...openIdData, ...userIdData].filter(
      (item, index, list) =>
        index ===
        list.findIndex(
          (candidate) =>
            (candidate._id && candidate._id === item._id) ||
            (candidate.id && candidate.id === item.id)
        )
    );

    // 兼容旧字段格式，迁移后返回
    return data.map((item: any) => migrateMedicine(item));
  } catch (err) {
    console.error('[reminderService] 拉取失败：', err);
    throw err;
  }
}

/** 新增提醒（本地 id 作为 id 字段存入云文档） */
export async function addReminderToCloud(medicine: Medicine): Promise<void> {
  const userId = requireUserId('新增药品');

  try {
    await getCollection(COL).add({
      data: { ...medicine, userId }
    });
  } catch (err) {
    console.error('[reminderService] 新增失败：', err);
    throw err;
  }
}

/** 更新提醒（通过 where id 定位） */
export async function updateReminderInCloud(
  id: string,
  payload: Partial<Medicine>
): Promise<void> {
  const userId = requireUserId('更新药品');

  try {
    const docId = await findUserMedicineDoc(id, userId);
    if (!docId) {
      throw new Error('[reminderService] 药品不存在或不属于当前用户');
    }
    const result = await getCollection(COL)
      .doc(docId)
      .update({ data: payload });
    if (result.stats.updated !== 1) {
      throw new Error('[reminderService] 药品未实际更新');
    }
  } catch (err) {
    console.error('[reminderService] 更新失败：', err);
    throw err;
  }
}

/** 软删除（将 status 设为 deleted） */
export async function deleteReminderInCloud(id: string): Promise<void> {
  const userId = requireUserId('删除药品');

  try {
    const payload = {
      status: REMINDER_STATUS.DELETED,
      updatedAt: new Date().toISOString()
    };
    const docId = await findUserMedicineDoc(id, userId);
    if (!docId) {
      throw new Error('[reminderService] 药品不存在或不属于当前用户');
    }
    const result = await getCollection(COL)
      .doc(docId)
      .update({ data: payload });
    if (result.stats.updated !== 1) {
      throw new Error('[reminderService] 药品未实际删除');
    }
  } catch (err) {
    console.error('[reminderService] 删除失败：', err);
    throw err;
  }
}
