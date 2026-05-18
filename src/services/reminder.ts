import Taro from "@tarojs/taro";

import { REMINDER_STATUS } from "@/constants";
import type { Reminder } from "@/types";
import { getCollection } from "./cloud";
import { getUserId } from "./auth";

const COL = "medicines";
const QUERYABLE_REMINDER_STATUSES = [
  REMINDER_STATUS.ACTIVE,
  REMINDER_STATUS.PAUSED,
];

/**
 * 将云端旧字段格式迁移为新字段格式（兼容字段重命名前的数据）
 * 旧字段：name / spec / lastDate / interval / before / time / history
 * 新字段：medicineName / medicineSpec / currentPrescriptionDate / intervalDays / remindAdvanceDays / remindTime / prescriptionHistory
 */
function migrateReminder(raw: any): Reminder {
  return {
    id: raw._id ?? "",
    medicineName: raw.medicineName ?? "",
    medicineSpec: raw.medicineSpec ?? "",
    currentPrescriptionDate: raw.currentPrescriptionDate ?? "",
    intervalDays: raw.intervalDays ?? 30,
    remindAdvanceDays: raw.remindAdvanceDays ?? 7,
    remindTime: raw.remindTime ?? "09:00",
    lastWechatReminderDate: raw.lastWechatReminderDate ?? "",
    lastWechatReminderAt: raw.lastWechatReminderAt ?? "",
    status: raw.status ?? REMINDER_STATUS.ACTIVE,
    note: raw.note ?? "",
    prescriptionHistory: raw.prescriptionHistory ?? [],
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}

async function queryUserReminders(field: "_openid" | "userId", userId: string) {
  return getCollection(COL)
    .where({
      [field]: userId,
      status: Taro.cloud.database().command.in(QUERYABLE_REMINDER_STATUSES),
    })
    .limit(100)
    .orderBy("createdAt", "asc")
    .get();
}

/** 拉取当前用户的全部提醒（排除 deleted） */
export async function fetchReminders(): Promise<Reminder[]> {
  const userId = getUserId();
  console.log("[reminderService] 当前用户 ID：", userId);
  if (!userId) return [];

  try {
    let { data } = await queryUserReminders("_openid", userId);
    console.log("[_openid] 拉取数据：", data);

    // 兼容手工导入或旧版本写入的数据：仅保存了 userId，没有系统 _openid 字段可查。
    if (data.length === 0) {
      ({ data } = await queryUserReminders("userId", userId));
      console.log("[userId] 拉取数据：", data);
    }

    // 兼容旧字段格式，迁移后返回
    return data.map((item: any) => migrateReminder(item));
  } catch (err) {
    console.error("[reminderService] 拉取失败：", err);
    throw err;
  }
}

/** 新增提醒（本地 id 作为 id 字段存入云文档） */
export async function addReminderToCloud(reminder: Reminder): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  try {
    await getCollection(COL).add({ data: { ...reminder, userId } });
  } catch (err) {
    console.error("[reminderService] 新增失败：", err);
    throw err;
  }
}

/** 更新提醒（通过 where id 定位） */
export async function updateReminderInCloud(
  id: string,
  payload: Partial<Reminder>,
): Promise<void> {
  if (!getUserId()) return;

  try {
    const existing = await getCollection(COL).where({ id }).limit(1).get();

    if (existing.data.length > 0) {
      const docId = existing.data[0]?._id;
      if (!docId) return;
      await getCollection(COL).doc(docId).update({ data: payload });
      return;
    }

    await getCollection(COL).doc(id).update({ data: payload });
  } catch (err) {
    console.error("[reminderService] 更新失败：", err);
    throw err;
  }
}

/** 软删除（将 status 设为 deleted） */
export async function deleteReminderInCloud(id: string): Promise<void> {
  if (!getUserId()) return;

  try {
    const payload = {
      status: REMINDER_STATUS.DELETED,
      updatedAt: new Date().toISOString(),
    };
    const existing = await getCollection(COL).where({ id }).limit(1).get();

    if (existing.data.length > 0) {
      const docId = existing.data[0]?._id;
      if (!docId) return;
      await getCollection(COL).doc(docId).update({ data: payload });
      return;
    }

    await getCollection(COL).doc(id).update({ data: payload });
  } catch (err) {
    console.error("[reminderService] 删除失败：", err);
    throw err;
  }
}
