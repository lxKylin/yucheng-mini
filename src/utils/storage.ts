import Taro from '@tarojs/taro';
import type { Reminder } from '@/types';
import { STORAGE_KEY_REMINDERS, STORAGE_KEY_SETTINGS } from '@/constants';

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

export interface AppSettings {
  defaultTime: string;
  defaultBefore: number;
  subscribeEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultTime: '09:00',
  defaultBefore: 7,
  subscribeEnabled: false
};

/** 读取应用设置，不存在时返回默认值 */
export function loadSettings(): AppSettings {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY_SETTINGS);
    if (data && typeof data === 'object') {
      return { ...DEFAULT_SETTINGS, ...data };
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** 将应用设置写入本地存储 */
export function saveSettings(settings: AppSettings): void {
  try {
    Taro.setStorageSync(STORAGE_KEY_SETTINGS, settings);
  } catch {
    // 静默处理
  }
}
