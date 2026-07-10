import { createStore } from 'zustand/vanilla';
import type { DerivedMedicine, Medicine } from '@/types';
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

type AddPayload = Partial<Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Medicine, 'name'>;

const DEFAULT_REMINDER_STATUS: Medicine['status'] = REMINDER_STATUS.ACTIVE;

interface ReminderStore {
  reminders: Medicine[];

  // ─── CRUD ───────────────────────────────────────────────────────
  addReminder: (payload: AddPayload) => Promise<void>;
  updateReminder: (id: string, payload: Partial<Medicine>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // ─── 业务操作 ────────────────────────────────────────────────────
  /** 标记已开药：更新最近开药日期，将本次记录日期插入 history 头部，最多保留 HISTORY_MAX 条 */
  markDone: (id: string, date?: string) => Promise<void>;
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
    await updateReminderInCloud(id, nextPayload);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...nextPayload } : r
      )
    }));
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

  async markDone(id, date) {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) {
      throw new Error('药品不存在或已删除');
    }

    const doneDate =
      date ?? calcNextDate(target.currentPrescriptionDate, target.intervalDays);

    const updatedAt = new Date().toISOString();
    const prescriptionHistory = [doneDate, ...target.prescriptionHistory].slice(
      0,
      HISTORY_MAX
    );
    const nextPayload = {
      currentPrescriptionDate: doneDate,
      prescriptionHistory,
      updatedAt
    };

    await updateReminderInCloud(id, nextPayload);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...nextPayload } : r
      )
    }));
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
    const cloudList = await fetchReminders();
    set({ reminders: cloudList });
  }
}));
