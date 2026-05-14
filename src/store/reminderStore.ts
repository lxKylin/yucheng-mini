import { create } from "zustand";
import type { Reminder, DerivedReminder } from "@/types";
import {
  DEFAULT_REMIND_TIME,
  DEFAULT_INTERVAL,
  DEFAULT_BEFORE,
  HISTORY_MAX,
} from "@/constants";
import { loadReminders, saveReminders } from "@/utils/storage";
import { derive, deriveAll, today } from "@/utils/dateUtils";

/** 生成唯一 ID（小程序环境不使用 crypto） */
function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type AddPayload = Omit<Reminder, "id" | "createdAt" | "updatedAt">;

interface ReminderStore {
  reminders: Reminder[];

  // ─── CRUD ───────────────────────────────────────────────────────
  addReminder: (payload: AddPayload) => void;
  updateReminder: (id: string, payload: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;

  // ─── 业务操作 ────────────────────────────────────────────────────
  /** 标记已开药：更新 lastDate，将今日日期插入 history 头部，最多保留 HISTORY_MAX 条 */
  markDone: (id: string, date?: string) => void;
  /** 切换暂停/启用 */
  togglePause: (id: string) => void;

  // ─── 查询（返回派生数据） ────────────────────────────────────────
  getDerivedList: () => DerivedReminder[];
  getById: (id: string) => DerivedReminder | null;
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: loadReminders(),

  addReminder(payload) {
    const now = new Date().toISOString();
    const newItem: Reminder = {
      id: genId(),
      createdAt: now,
      updatedAt: now,
      // 未传入字段使用默认值兜底
      time: DEFAULT_REMIND_TIME,
      interval: DEFAULT_INTERVAL,
      before: DEFAULT_BEFORE,
      note: "",
      history: [],
      status: "active",
      ...payload,
    };
    set((state) => {
      const next = [...state.reminders, newItem];
      saveReminders(next);
      return { reminders: next };
    });
  },

  updateReminder(id, payload) {
    set((state) => {
      const next = state.reminders.map((r) =>
        r.id === id
          ? { ...r, ...payload, updatedAt: new Date().toISOString() }
          : r,
      );
      saveReminders(next);
      return { reminders: next };
    });
  },

  deleteReminder(id) {
    // 软删除：标记 status=deleted，保留数据
    set((state) => {
      const next = state.reminders.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "deleted" as const,
              updatedAt: new Date().toISOString(),
            }
          : r,
      );
      saveReminders(next);
      return { reminders: next };
    });
  },

  markDone(id, date) {
    const doneDate = date ?? today();
    set((state) => {
      const next = state.reminders.map((r) => {
        if (r.id !== id) return r;
        const history = [doneDate, ...r.history].slice(0, HISTORY_MAX);
        return {
          ...r,
          lastDate: doneDate,
          history,
          updatedAt: new Date().toISOString(),
        };
      });
      saveReminders(next);
      return { reminders: next };
    });
  },

  togglePause(id) {
    set((state) => {
      const next = state.reminders.map((r) => {
        if (r.id !== id) return r;
        const status = r.status === "paused" ? "active" : "paused";
        return { ...r, status, updatedAt: new Date().toISOString() };
      });
      saveReminders(next);
      return { reminders: next };
    });
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
}));
