import Taro from "@tarojs/taro";
import type { Reminder } from "@/types";
import { STORAGE_KEY_REMINDERS } from "@/constants";

/** 从本地存储读取提醒列表，不存在时返回空数组 */
export function loadReminders(): Reminder[] {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY_REMINDERS);
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

/** 将提醒列表写入本地存储 */
export function saveReminders(reminders: Reminder[]): void {
  try {
    Taro.setStorageSync(STORAGE_KEY_REMINDERS, reminders);
  } catch {
    // 存储失败时静默处理，不影响内存中的数据
  }
}
