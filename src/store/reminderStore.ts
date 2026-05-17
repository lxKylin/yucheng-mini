import { createStore } from "zustand/vanilla";
import type { Reminder, DerivedReminder } from "@/types";
import {
  DEFAULT_REMIND_TIME,
  DEFAULT_INTERVAL,
  DEFAULT_BEFORE,
  HISTORY_MAX,
} from "@/constants";
import {
  fetchReminders,
  addReminderToCloud,
  updateReminderInCloud,
  deleteReminderInCloud,
} from "@/services/reminder";
import { calcNextDate, derive, deriveAll } from "@/utils/dateUtils";

/** 生成唯一 ID（小程序环境不使用 crypto） */
function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type AddPayload = Omit<Reminder, "id" | "createdAt" | "updatedAt">;

const DEFAULT_REMINDER_STATUS: Reminder["status"] = "active";

interface ReminderStore {
  reminders: Reminder[];

  // ─── CRUD ───────────────────────────────────────────────────────
  addReminder: (payload: AddPayload) => Promise<void>;
  updateReminder: (id: string, payload: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // ─── 业务操作 ────────────────────────────────────────────────────
  /** 标记已开药：更新最近开药日期，将本次记录日期插入 history 头部，最多保留 HISTORY_MAX 条 */
  markDone: (id: string, date?: string) => Promise<void>;
  /** 切换暂停/启用 */
  togglePause: (id: string) => Promise<void>;

  // ─── 查询（返回派生数据） ────────────────────────────────────────
  getDerivedList: () => DerivedReminder[];
  getById: (id: string) => DerivedReminder | null;

  /** 从云数据库拉取当前用户最新数据，并覆盖内存态 */
  loadFromCloud: () => Promise<void>;
}

export const reminderStore = createStore<ReminderStore>((set, get) => ({
  reminders: [],

  async addReminder(payload) {
    const now = new Date().toISOString();
    const newItem: Reminder = {
      ...payload,
      id: genId(),
      createdAt: now,
      updatedAt: now,
      // 未传入字段使用默认值兜底
      remindTime: payload.remindTime || DEFAULT_REMIND_TIME,
      intervalDays: payload.intervalDays || DEFAULT_INTERVAL,
      remindAdvanceDays: payload.remindAdvanceDays || DEFAULT_BEFORE,
      note: payload.note || "",
      prescriptionHistory: payload.prescriptionHistory || [],
      status: payload.status || DEFAULT_REMINDER_STATUS,
    };

    await addReminderToCloud(newItem);
    set((state) => ({ reminders: [...state.reminders, newItem] }));
  },

  async updateReminder(id, payload) {
    const updatedAt = new Date().toISOString();
    const nextItem = get().reminders.find((r) => r.id === id);
    if (!nextItem) return;

    const nextPayload = { ...payload, updatedAt };
    await updateReminderInCloud(id, nextPayload);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...nextPayload } : r,
      ),
    }));
  },

  async deleteReminder(id) {
    const updatedAt = new Date().toISOString();

    await deleteReminderInCloud(id);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, status: "deleted", updatedAt } : r,
      ),
    }));
  },

  async markDone(id, date) {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) return;

    const doneDate =
      date ?? calcNextDate(target.currentPrescriptionDate, target.intervalDays);

    const updatedAt = new Date().toISOString();
    const prescriptionHistory = [doneDate, ...target.prescriptionHistory].slice(
      0,
      HISTORY_MAX,
    );
    const nextPayload = {
      currentPrescriptionDate: doneDate,
      prescriptionHistory,
      updatedAt,
    };

    await updateReminderInCloud(id, nextPayload);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...nextPayload } : r,
      ),
    }));
  },

  async togglePause(id) {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) return;

    const updatedAt = new Date().toISOString();
    const status: Reminder["status"] =
      target.status === "paused" ? "active" : "paused";
    const nextPayload = { status, updatedAt };

    await updateReminderInCloud(id, nextPayload);

    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...nextPayload } : r,
      ),
    }));
  },

  getDerivedList() {
    return deriveAll(get().reminders);
  },

  getById(id) {
    const r = get().reminders.find(
      (r) => r.id === id && r.status !== "deleted",
    );
    return r ? derive(r) : null;
  },

  async loadFromCloud() {
    const cloudList = await fetchReminders();
    set({ reminders: cloudList });
  },
}));
