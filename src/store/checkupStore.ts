import { createStore } from 'zustand/vanilla';

import {
  CHECKUP_STATUS,
  DEFAULT_BEFORE,
  DEFAULT_REMIND_TIME,
  HISTORY_MAX
} from '@/constants';
import {
  addCheckupToCloud,
  deleteCheckupInCloud,
  fetchCheckups,
  updateCheckupInCloud
} from '@/services/checkup';
import type { CheckupReminder, Medicine } from '@/types';
import { deriveAllCheckups, deriveCheckup } from '@/utils/checkupUtils';
import { today } from '@/utils/dateUtils';

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type AddPayload = Partial<Omit<CheckupReminder, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<CheckupReminder, 'title'>;

interface CompleteOptions {
  doneDate?: string;
  nextTargetDate?: string;
  note?: string;
}

interface CheckupStore {
  checkups: CheckupReminder[];
  addCheckup: (payload: AddPayload) => Promise<void>;
  updateCheckup: (
    id: string,
    payload: Partial<CheckupReminder>
  ) => Promise<void>;
  deleteCheckup: (id: string) => Promise<void>;
  togglePause: (id: string) => Promise<void>;
  completeCheckup: (id: string, options?: CompleteOptions) => Promise<void>;
  getDerivedList: (medicines?: Medicine[]) => ReturnType<typeof deriveAllCheckups>;
  getById: (
    id: string,
    medicines?: Medicine[]
  ) => ReturnType<typeof deriveCheckup> | null;
  loadFromCloud: () => Promise<void>;
}

export const checkupStore = createStore<CheckupStore>((set, get) => ({
  checkups: [],

  async addCheckup(payload) {
    const now = new Date().toISOString();
    const newItem: CheckupReminder = {
      id: genId(),
      title: payload.title || '',
      type: payload.type || 'follow_up',
      targetDate: payload.targetDate || today(),
      remindAdvanceDays: payload.remindAdvanceDays ?? DEFAULT_BEFORE,
      remindTime: payload.remindTime || DEFAULT_REMIND_TIME,
      status: payload.status || CHECKUP_STATUS.ACTIVE,
      relatedMedicineIds: payload.relatedMedicineIds || [],
      hospital: payload.hospital || '',
      note: payload.note || '',
      completionHistory: payload.completionHistory || [],
      lastWechatReminderDate: payload.lastWechatReminderDate || '',
      lastWechatReminderAt: payload.lastWechatReminderAt || '',
      createdAt: now,
      updatedAt: now
    };

    await addCheckupToCloud(newItem);
    set((state) => ({ checkups: [...state.checkups, newItem] }));
  },

  async updateCheckup(id, payload) {
    const target = get().checkups.find((item) => item.id === id);
    if (!target) return;

    const nextPayload = { ...payload, updatedAt: new Date().toISOString() };
    await updateCheckupInCloud(id, nextPayload);

    set((state) => ({
      checkups: state.checkups.map((item) =>
        item.id === id ? { ...item, ...nextPayload } : item
      )
    }));
  },

  async deleteCheckup(id) {
    const updatedAt = new Date().toISOString();
    await deleteCheckupInCloud(id);

    set((state) => ({
      checkups: state.checkups.map((item) =>
        item.id === id
          ? { ...item, status: CHECKUP_STATUS.DELETED, updatedAt }
          : item
      )
    }));
  },

  async togglePause(id) {
    const target = get().checkups.find((item) => item.id === id);
    if (!target) return;

    const status =
      target.status === CHECKUP_STATUS.PAUSED
        ? CHECKUP_STATUS.ACTIVE
        : CHECKUP_STATUS.PAUSED;
    await get().updateCheckup(id, { status });
  },

  async completeCheckup(id, options = {}) {
    const target = get().checkups.find((item) => item.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    const doneDate = options.doneDate || today();
    const completionHistory = [
      {
        date: doneDate,
        note: options.note || '',
        createdAt: now
      },
      ...target.completionHistory
    ].slice(0, HISTORY_MAX);
    const nextPayload: Partial<CheckupReminder> = {
      completionHistory,
      status: options.nextTargetDate ? CHECKUP_STATUS.ACTIVE : CHECKUP_STATUS.DONE,
      targetDate: options.nextTargetDate || target.targetDate,
      lastWechatReminderDate: options.nextTargetDate
        ? ''
        : target.lastWechatReminderDate,
      lastWechatReminderAt: options.nextTargetDate
        ? ''
        : target.lastWechatReminderAt
    };

    await get().updateCheckup(id, nextPayload);
  },

  getDerivedList(medicines = []) {
    return deriveAllCheckups(get().checkups, medicines);
  },

  getById(id, medicines = []) {
    const target = get().checkups.find(
      (item) => item.id === id && item.status !== CHECKUP_STATUS.DELETED
    );
    return target ? deriveCheckup(target, medicines) : null;
  },

  async loadFromCloud() {
    const cloudList = await fetchCheckups();
    set({ checkups: cloudList });
  }
}));
