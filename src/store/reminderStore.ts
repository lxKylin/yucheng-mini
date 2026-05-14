import { createStore } from "zustand/vanilla";
import type { Reminder, DerivedReminder } from "@/types";
import {
  DEFAULT_REMIND_TIME,
  DEFAULT_INTERVAL,
  DEFAULT_BEFORE,
  HISTORY_MAX,
} from "@/constants";
import { loadReminders, saveReminders } from "@/utils/storage";
import { derive, deriveAll, today } from "@/utils/dateUtils";

const MOCK_TIMESTAMP = "2026-05-14T09:00:00.000Z";

const MOCK_REMINDERS: Reminder[] = [
  {
    id: "mock-danger-overdue",
    name: "洛拉替尼",
    spec: "100mg",
    lastDate: "2026-04-13",
    interval: 30,
    before: 3,
    time: "09:00",
    status: "active",
    note: "今天优先处理复诊开药，避免断药。",
    history: ["2026-04-13", "2026-03-14", "2026-02-12"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-danger-today",
    name: "瑞舒伐他汀",
    spec: "10mg",
    lastDate: "2026-05-07",
    interval: 28,
    before: 7,
    time: "09:00",
    status: "active",
    note: "适合验证今天到期与已开药按钮刷新。",
    history: ["2026-05-07", "2026-04-30", "2026-04-23"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-warning",
    name: "地舒单抗",
    spec: "120mg",
    lastDate: "2026-04-22",
    interval: 28,
    before: 7,
    time: "08:30",
    status: "active",
    note: "用于验证 7 天内提醒与时间线日期展示。",
    history: ["2026-04-22", "2026-03-23"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-good",
    name: "维生素D3",
    spec: "400IU",
    lastDate: "2026-05-10",
    interval: 30,
    before: 3,
    time: "10:00",
    status: "active",
    note: "用于验证普通 good 状态不会挤掉更紧急卡片。",
    history: ["2026-05-10", "2026-04-10"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-paused",
    name: "优甲乐",
    spec: "50ug",
    lastDate: "2026-05-01",
    interval: 45,
    before: 7,
    time: "08:30",
    status: "paused",
    note: "用于验证 paused 标签颜色和首页过滤。",
    history: ["2026-05-01", "2026-03-17"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];

const initialReminders = (() => {
  const loadedReminders = loadReminders();
  return loadedReminders.length > 0 ? loadedReminders : MOCK_REMINDERS;
})();

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

export const reminderStore = createStore<ReminderStore>((set, get) => ({
  reminders: initialReminders,

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
