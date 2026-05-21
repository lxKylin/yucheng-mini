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
    reminderEnabled: raw.reminderEnabled ?? true,
    currentPrescriptionDate,
    intervalDays: toNumber(raw.intervalDays ?? raw.interval, DEFAULT_INTERVAL),
    remindAdvanceDays: toNumber(
      raw.remindAdvanceDays ?? raw.before,
      DEFAULT_BEFORE
    ),
    remindTime: raw.remindTime || raw.time || DEFAULT_REMIND_TIME,
    status: raw.status ?? REMINDER_STATUS.ACTIVE,
    prescriptionHistory: toArray(raw.prescriptionHistory ?? raw.history),
    lastWechatReminderDate: raw.lastWechatReminderDate ?? '',
    lastWechatReminderAt: raw.lastWechatReminderAt ?? '',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? ''
  };
}

function toCloudMedicinePayload(
  medicine: Partial<Medicine>
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...medicine };

  if (typeof medicine.name !== 'undefined') {
    payload.medicineName = medicine.name;
  }

  if (typeof medicine.spec !== 'undefined') {
    payload.medicineSpec = medicine.spec;
  }

  if (typeof medicine.currentPrescriptionDate !== 'undefined') {
    payload.lastDate = medicine.currentPrescriptionDate;
  }

  if (typeof medicine.intervalDays !== 'undefined') {
    payload.interval = medicine.intervalDays;
  }

  if (typeof medicine.remindAdvanceDays !== 'undefined') {
    payload.before = medicine.remindAdvanceDays;
  }

  if (typeof medicine.remindTime !== 'undefined') {
    payload.time = medicine.remindTime;
  }

  if (typeof medicine.prescriptionHistory !== 'undefined') {
    payload.history = medicine.prescriptionHistory;
  }

  return payload;
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

async function findUserMedicineDoc(id: string) {
  const userId = getUserId();
  if (!userId) return '';

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

  return id;
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
  const userId = getUserId();
  if (!userId) return;

  try {
    await getCollection(COL).add({
      data: { ...toCloudMedicinePayload(medicine), userId }
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
  if (!getUserId()) return;

  try {
    const docId = await findUserMedicineDoc(id);
    if (!docId) return;
    await getCollection(COL)
      .doc(docId)
      .update({ data: toCloudMedicinePayload(payload) });
  } catch (err) {
    console.error('[reminderService] 更新失败：', err);
    throw err;
  }
}

/** 软删除（将 status 设为 deleted） */
export async function deleteReminderInCloud(id: string): Promise<void> {
  if (!getUserId()) return;

  try {
    const payload = {
      status: REMINDER_STATUS.DELETED,
      updatedAt: new Date().toISOString()
    };
    const docId = await findUserMedicineDoc(id);
    if (!docId) return;
    await getCollection(COL).doc(docId).update({ data: payload });
  } catch (err) {
    console.error('[reminderService] 删除失败：', err);
    throw err;
  }
}
