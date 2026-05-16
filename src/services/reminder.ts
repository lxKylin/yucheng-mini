import Taro from "@tarojs/taro";
import type { Reminder } from "@/types";
import { getCollection } from "./cloud";
import { getUserId } from "./auth";

const COL = "medicines";

/**
 * 将云端旧字段格式迁移为新字段格式（兼容字段重命名前的数据）
 * 旧字段：name / spec / lastDate / interval / before / time / history
 * 新字段：medicineName / medicineSpec / currentPrescriptionDate / intervalDays / remindAdvanceDays / remindTime / prescriptionHistory
 */
function migrateReminder(raw: any): Reminder {
  return {
    id: raw.id,
    medicineName: raw.medicineName ?? raw.name ?? "",
    medicineSpec: raw.medicineSpec ?? raw.spec ?? "",
    currentPrescriptionDate: raw.currentPrescriptionDate ?? raw.lastDate ?? "",
    intervalDays: raw.intervalDays ?? raw.interval ?? 30,
    remindAdvanceDays: raw.remindAdvanceDays ?? raw.before ?? 7,
    remindTime: raw.remindTime ?? raw.time ?? "09:00",
    status: raw.status ?? "active",
    note: raw.note ?? "",
    prescriptionHistory: raw.prescriptionHistory ?? raw.history ?? [],
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}

/** 拉取当前用户的全部提醒（排除 deleted） */
export async function fetchReminders(): Promise<Reminder[]> {
  if (!getUserId()) return [];

  try {
    const { data } = await getCollection(COL)
      .where({ status: Taro.cloud.database().command.neq("deleted") })
      .limit(100)
      .orderBy("createdAt", "asc")
      .get();

    // 兼容旧字段格式，迁移后返回
    return data.map(({ _id, _openid, ...rest }: any) => migrateReminder(rest));
  } catch (err) {
    console.error("[reminderService] 拉取失败：", err);
    return [];
  }
}

/** 新增提醒（本地 id 作为 id 字段存入云文档） */
export async function addReminderToCloud(reminder: Reminder): Promise<void> {
  if (!getUserId()) return;

  try {
    await getCollection(COL).add({ data: reminder });
  } catch (err) {
    console.error("[reminderService] 新增失败：", err);
  }
}

/** 更新提醒（通过 where id 定位） */
export async function updateReminderInCloud(
  id: string,
  payload: Partial<Reminder>,
): Promise<void> {
  if (!getUserId()) return;

  try {
    await getCollection(COL).where({ id }).update({ data: payload });
  } catch (err) {
    console.error("[reminderService] 更新失败：", err);
  }
}

/** 软删除（将 status 设为 deleted） */
export async function deleteReminderInCloud(id: string): Promise<void> {
  if (!getUserId()) return;

  try {
    await getCollection(COL)
      .where({ id })
      .update({
        data: { status: "deleted", updatedAt: new Date().toISOString() },
      });
  } catch (err) {
    console.error("[reminderService] 删除失败：", err);
  }
}
