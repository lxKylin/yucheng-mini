import Taro from "@tarojs/taro";
import type { Reminder } from "@/types";
import { getCollection } from "./cloud";
import { getUserId } from "./auth";

const COL = "medicines";

/** 拉取当前用户的全部提醒（排除 deleted） */
export async function fetchReminders(): Promise<Reminder[]> {
  if (!getUserId()) return [];

  try {
    const { data } = await getCollection(COL)
      .where({ status: Taro.cloud.database().command.neq("deleted") })
      .limit(100)
      .orderBy("createdAt", "asc")
      .get();

    // 云文档中已存储 id 字段，直接忽略 _id 和 _openid
    return data.map(({ _id, _openid, ...rest }: any) => rest as Reminder);
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
