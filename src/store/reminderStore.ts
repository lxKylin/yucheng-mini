import { createStore } from "zustand/vanilla";
import type { Reminder, DerivedReminder } from "@/types";
import {
  DEFAULT_REMIND_TIME,
  DEFAULT_INTERVAL,
  DEFAULT_BEFORE,
  HISTORY_MAX,
} from "@/constants";
import { loadReminders, saveReminders } from "@/utils/storage";
import {
  fetchReminders,
  addReminderToCloud,
  updateReminderInCloud,
  deleteReminderInCloud,
} from "@/services/reminder";
import { derive, deriveAll, today } from "@/utils/dateUtils";

const MOCK_TIMESTAMP = "2026-05-14T09:00:00.000Z";

const MOCK_REMINDERS: Reminder[] = [
  {
    id: "mock-danger-overdue",
    medicineName: "洛拉替尼",
    medicineSpec: "100mg",
    currentPrescriptionDate: "2026-04-13",
    intervalDays: 30,
    remindAdvanceDays: 3,
    remindTime: "09:00",
    status: "active",
    note: "今天优先处理复诊开药，避免断药。",
    prescriptionHistory: ["2026-04-13", "2026-03-14", "2026-02-12"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-danger-today",
    medicineName: "瑞舒伐他汀",
    medicineSpec: "10mg",
    currentPrescriptionDate: "2026-05-07",
    intervalDays: 28,
    remindAdvanceDays: 7,
    remindTime: "09:00",
    status: "active",
    note: "适合验证今天到期与已开药按钮刷新。",
    prescriptionHistory: ["2026-05-07", "2026-04-30", "2026-04-23"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-warning",
    medicineName: "地舒单抗",
    medicineSpec: "120mg",
    currentPrescriptionDate: "2026-04-22",
    intervalDays: 28,
    remindAdvanceDays: 7,
    remindTime: "08:30",
    status: "active",
    note: "用于验证 7 天内提醒与时间线日期展示。",
    prescriptionHistory: ["2026-04-22", "2026-03-23"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-good",
    medicineName: "维生素D3",
    medicineSpec: "400IU",
    currentPrescriptionDate: "2026-05-10",
    intervalDays: 30,
    remindAdvanceDays: 3,
    remindTime: "10:00",
    status: "active",
    note: "用于验证普通 good 状态不会挤掉更紧急卡片。",
    prescriptionHistory: ["2026-05-10", "2026-04-10"],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "mock-paused",
    medicineName: "优甲乐",
    medicineSpec: "50ug",
    currentPrescriptionDate: "2026-05-01",
    intervalDays: 45,
    remindAdvanceDays: 7,
    remindTime: "08:30",
    status: "paused",
    note: "用于验证 paused 标签颜色和首页过滤。",
    prescriptionHistory: ["2026-05-01", "2026-03-17"],
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

  /** 从云数据库拉取最新数据，覆盖本地缓存；云端为空时不覆盖 */
  loadFromCloud: () => Promise<void>;
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
      remindTime: DEFAULT_REMIND_TIME,
      intervalDays: DEFAULT_INTERVAL,
      remindAdvanceDays: DEFAULT_BEFORE,
      note: "",
      prescriptionHistory: [],
      status: "active",
      ...payload,
    };
    set((state) => {
      const next = [...state.reminders, newItem];
      saveReminders(next);
      return { reminders: next };
    });
    // 异步同步到云端，不阻塞
    addReminderToCloud(newItem).catch((err) =>
      console.error("[store] addReminder 云端同步失败：", err),
    );
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
    updateReminderInCloud(id, {
      ...payload,
      updatedAt: new Date().toISOString(),
    }).catch((err) =>
      console.error("[store] updateReminder 云端同步失败：", err),
    );
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
    deleteReminderInCloud(id).catch((err) =>
      console.error("[store] deleteReminder 云端同步失败：", err),
    );
  },

  markDone(id, date) {
    const doneDate = date ?? today();
    set((state) => {
      const next = state.reminders.map((r) => {
        if (r.id !== id) return r;
        const prescriptionHistory = [doneDate, ...r.prescriptionHistory].slice(
          0,
          HISTORY_MAX,
        );
        return {
          ...r,
          currentPrescriptionDate: doneDate,
          prescriptionHistory,
          updatedAt: new Date().toISOString(),
        };
      });
      saveReminders(next);
      return { reminders: next };
    });
    updateReminderInCloud(id, {
      currentPrescriptionDate: doneDate,
      prescriptionHistory: [
        doneDate,
        ...(get().reminders.find((r) => r.id === id)?.prescriptionHistory ??
          []),
      ].slice(0, HISTORY_MAX),
      updatedAt: new Date().toISOString(),
    }).catch((err) => console.error("[store] markDone 云端同步失败：", err));
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
    const updatedStatus =
      get().reminders.find((r) => r.id === id)?.status ?? "active";
    updateReminderInCloud(id, {
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    }).catch((err) => console.error("[store] togglePause 云端同步失败：", err));
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
    if (cloudList.length === 0) return; // 云端为空时不覆盖本地数据（兼容离线首次启动）
    set({ reminders: cloudList });
    saveReminders(cloudList);
  },
}));
