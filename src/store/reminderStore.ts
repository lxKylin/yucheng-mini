import { createStore } from 'zustand/vanilla';
import type {
  DerivedMedicine,
  InventoryEstimateMode,
  Medicine
} from '@/types';
import {
  DEFAULT_REMIND_TIME,
  DEFAULT_INTERVAL,
  DEFAULT_BEFORE,
  HISTORY_MAX,
  REMINDER_STATUS
} from '@/constants';
import {
  fetchReminders,
  addReminderToCloud,
  updateReminderInCloud,
  deleteReminderInCloud
} from '@/services/reminder';
import {
  calcNextDate,
  derive,
  deriveAll,
  deriveAllMedicines,
  today
} from '@/utils/dateUtils';

import { genId } from '@/utils/commonUtils';
import { deriveMedicineInventory, roundQuantity } from '@/utils/medicineInventory';
import { persistMedicineChange } from './persistMedicineChange';

type AddPayload = Partial<Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Medicine, 'name'>;

export interface MarkMedicineDoneOptions {
  date?: string;
  inventoryQuantity?: number;
  inventoryLater?: boolean;
}

const DEFAULT_REMINDER_STATUS: Medicine['status'] = REMINDER_STATUS.ACTIVE;

interface ReminderStore {
  reminders: Medicine[];
  loading: boolean;
  error: string;

  // ─── CRUD ───────────────────────────────────────────────────────
  addReminder: (payload: AddPayload) => Promise<void>;
  updateReminder: (id: string, payload: Partial<Medicine>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // ─── 业务操作 ────────────────────────────────────────────────────
  /** 标记已开药：更新最近开药日期，将本次记录日期插入 history 头部，最多保留 HISTORY_MAX 条 */
  markDone: (
    id: string,
    options?: string | MarkMedicineDoneOptions
  ) => Promise<void>;
  calibrateInventory: (id: string, quantity: number, date: string) => Promise<void>;
  setInventoryEstimateMode: (
    id: string,
    mode: InventoryEstimateMode,
    calibration?: { quantity: number; date: string }
  ) => Promise<void>;
  /** 切换暂停/启用 */
  togglePause: (id: string) => Promise<void>;

  // ─── 查询（返回派生数据） ────────────────────────────────────────
  getDerivedList: () => DerivedMedicine[];
  getAllDerivedMedicines: () => DerivedMedicine[];
  getById: (id: string) => DerivedMedicine | null;

  /** 从云数据库拉取当前用户最新数据，并覆盖内存态 */
  loadFromCloud: () => Promise<void>;
}

export const reminderStore = createStore<ReminderStore>((set, get) => ({
  reminders: [],
  loading: true,
  error: '',

  async addReminder(payload) {
    const now = new Date().toISOString();
    const newItem: Medicine = {
      id: genId(),
      name: payload.name || '',
      spec: payload.spec || '',
      form: payload.form || 'tablet',
      expiryDate: payload.expiryDate || '',
      note: payload.note || '',
      dosagePerUse: payload.dosagePerUse ?? 1,
      dosageUnit: payload.dosageUnit || '片',
      timesPerDay: payload.timesPerDay ?? 1,
      scheduleTiming: payload.scheduleTiming || '饭后',
      scheduleTime: payload.scheduleTime || '',
      inventoryTrackingEnabled: payload.inventoryTrackingEnabled ?? false,
      inventoryEstimateMode: payload.inventoryEstimateMode || 'manual',
      inventoryBaseQuantity: payload.inventoryBaseQuantity ?? 0,
      inventoryBaseDate: payload.inventoryBaseDate || '',
      inventoryNeedsCalibration: payload.inventoryNeedsCalibration ?? false,
      inventoryUpdatedAt: payload.inventoryUpdatedAt || '',
      reminderEnabled: payload.reminderEnabled ?? true,
      currentPrescriptionDate: payload.currentPrescriptionDate || today(),
      remindTime: payload.remindTime || DEFAULT_REMIND_TIME,
      intervalDays: payload.intervalDays || DEFAULT_INTERVAL,
      remindAdvanceDays: payload.remindAdvanceDays || DEFAULT_BEFORE,
      status: payload.status || DEFAULT_REMINDER_STATUS,
      prescriptionHistory: payload.prescriptionHistory || [],
      lastWechatReminderDate: payload.lastWechatReminderDate || '',
      lastWechatReminderAt: payload.lastWechatReminderAt || '',
      createdAt: now,
      updatedAt: now
    };

    await addReminderToCloud(newItem);
    set((state) => ({ reminders: [...state.reminders, newItem] }));
  },

  async updateReminder(id, payload) {
    const updatedAt = new Date().toISOString();
    const nextItem = get().reminders.find((r) => r.id === id);
    if (!nextItem) {
      throw new Error('药品不存在或已删除');
    }

    const nextPayload = { ...payload, updatedAt };
    await persistMedicineChange(
      () => updateReminderInCloud(id, nextPayload),
      () => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, ...nextPayload } : r
          )
        }));
      }
    );
  },

  async deleteReminder(id) {
    const updatedAt = new Date().toISOString();
    const target = get().reminders.find((r) => r.id === id);
    if (!target) {
      throw new Error('药品不存在或已删除');
    }

    await deleteReminderInCloud(id);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, status: REMINDER_STATUS.DELETED, updatedAt } : r
      )
    }));
  },

  async markDone(id, options) {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) {
      throw new Error('药品不存在或已删除');
    }

    const normalizedOptions =
      typeof options === 'string' ? { date: options } : options ?? {};
    const doneDate =
      normalizedOptions.date ??
      calcNextDate(target.currentPrescriptionDate, target.intervalDays);

    const updatedAt = new Date().toISOString();
    const prescriptionHistory = [doneDate, ...target.prescriptionHistory].slice(
      0,
      HISTORY_MAX
    );
    const nextPayload: Partial<Medicine> = {
      currentPrescriptionDate: doneDate,
      prescriptionHistory,
      updatedAt
    };

    if (target.inventoryTrackingEnabled) {
      if (normalizedOptions.inventoryLater) {
        nextPayload.inventoryNeedsCalibration = true;
        nextPayload.inventoryUpdatedAt = updatedAt;
      } else if (normalizedOptions.inventoryQuantity !== undefined) {
        nextPayload.inventoryBaseQuantity = roundQuantity(
          Math.max(0, normalizedOptions.inventoryQuantity)
        );
        nextPayload.inventoryBaseDate = doneDate;
        nextPayload.inventoryNeedsCalibration = false;
        nextPayload.inventoryUpdatedAt = updatedAt;
      } else {
        nextPayload.inventoryNeedsCalibration = true;
        nextPayload.inventoryUpdatedAt = updatedAt;
      }
    }

    await persistMedicineChange(
      () => updateReminderInCloud(id, nextPayload),
      () => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, ...nextPayload } : r
          )
        }));
      }
    );
  },

  async calibrateInventory(id, quantity, date) {
    await get().updateReminder(id, {
      inventoryBaseQuantity: roundQuantity(Math.max(0, quantity)),
      inventoryBaseDate: date,
      inventoryNeedsCalibration: false,
      inventoryUpdatedAt: new Date().toISOString()
    });
  },

  async setInventoryEstimateMode(id, mode, calibration) {
    const target = get().reminders.find((medicine) => medicine.id === id);
    if (!target) throw new Error('药品不存在或已删除');

    if (mode === 'automatic') {
      if (!calibration) throw new Error('恢复自动估算前请重新盘点');
      await get().updateReminder(id, {
        inventoryEstimateMode: mode,
        inventoryBaseQuantity: roundQuantity(
          Math.max(0, calibration.quantity)
        ),
        inventoryBaseDate: calibration.date,
        inventoryNeedsCalibration: false,
        inventoryUpdatedAt: new Date().toISOString()
      });
      return;
    }

    const currentInventory = deriveMedicineInventory(target, today());
    await get().updateReminder(id, {
      inventoryEstimateMode: mode,
      inventoryBaseQuantity:
        currentInventory.estimatedRemainingQuantity ??
        target.inventoryBaseQuantity,
      inventoryBaseDate: today(),
      inventoryNeedsCalibration: false,
      inventoryUpdatedAt: new Date().toISOString()
    });
  },

  async togglePause(id) {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) {
      throw new Error('药品不存在或已删除');
    }

    const updatedAt = new Date().toISOString();
    const status: Medicine['status'] =
      target.status === REMINDER_STATUS.PAUSED
        ? REMINDER_STATUS.ACTIVE
        : REMINDER_STATUS.PAUSED;
    const nextPayload = { status, updatedAt };

    await updateReminderInCloud(id, nextPayload);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...nextPayload } : r
      )
    }));
  },

  getDerivedList() {
    return deriveAll(get().reminders);
  },

  getAllDerivedMedicines() {
    return deriveAllMedicines(get().reminders);
  },

  getById(id) {
    const r = get().reminders.find(
      (r) => r.id === id && r.status !== REMINDER_STATUS.DELETED
    );
    return r ? derive(r) : null;
  },

  async loadFromCloud() {
    set({ loading: true, error: '' });
    try {
      const cloudList = await fetchReminders();
      set({ reminders: cloudList, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '药箱加载失败'
      });
      throw error;
    }
  }
}));
