import { createStore } from 'zustand/vanilla';

import {
  CHECKUP_STATUS,
  DEFAULT_BEFORE,
  DEFAULT_REMIND_TIME
} from '@/constants';
import {
  addCheckupToCloud,
  CheckupMutationConflictError,
  completeCheckupInCloud,
  deleteCheckupInCloud,
  fetchCheckups,
  restartCheckupInCloud,
  updateCheckupInCloud
} from '@/services/checkup';
import type { CheckupReminder, Medicine } from '@/types';
import { deriveAllCheckups, deriveCheckup } from '@/utils/checkupUtils';
import { today } from '@/utils/dateUtils';
import { genId } from '@/utils/commonUtils';

type AddPayload = Partial<
  Omit<CheckupReminder, 'id' | 'createdAt' | 'updatedAt'>
> &
  Pick<CheckupReminder, 'title'>;

interface CompleteOptions {
  doneDate: string;
  nextTargetDate?: string;
  note?: string;
  mutationId: string;
}

interface RestartOptions {
  targetDate: string;
  remindAdvanceDays: number;
  remindTime: string;
  mutationId: string;
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
  completeCheckup: (id: string, options: CompleteOptions) => Promise<void>;
  restartCheckup: (id: string, options: RestartOptions) => Promise<void>;
  getDerivedList: (
    medicines?: Medicine[]
  ) => ReturnType<typeof deriveAllCheckups>;
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
      version: payload.version ?? 0,
      createdAt: now,
      updatedAt: now
    };

    await addCheckupToCloud(newItem);
    set((state) => ({ checkups: [...state.checkups, newItem] }));
  },

  async updateCheckup(id, payload) {
    const target = get().checkups.find((item) => item.id === id);
    if (!target) {
      throw new Error('检查提醒不存在或已删除');
    }

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
    const target = get().checkups.find((item) => item.id === id);
    if (!target) {
      throw new Error('检查提醒不存在或已删除');
    }
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
    if (!target) {
      throw new Error('检查提醒不存在或已删除');
    }

    const status =
      target.status === CHECKUP_STATUS.PAUSED
        ? CHECKUP_STATUS.ACTIVE
        : CHECKUP_STATUS.PAUSED;
    await get().updateCheckup(id, { status });
  },

  async completeCheckup(id, options) {
    const target = get().checkups.find((item) => item.id === id);
    if (!target) {
      throw new Error('检查提醒不存在或已删除');
    }

    try {
      const updated = await completeCheckupInCloud({
        checkupId: id,
        mutationId: options.mutationId,
        expectedVersion: target.version,
        doneDate: options.doneDate,
        nextTargetDate: options.nextTargetDate,
        note: options.note
      });
      set((state) => ({
        checkups: state.checkups.map((item) =>
          item.id === id ? updated : item
        )
      }));
    } catch (error) {
      if (error instanceof CheckupMutationConflictError) {
        set((state) => ({
          checkups: state.checkups.map((item) =>
            item.id === id ? error.checkup : item
          )
        }));
      }
      throw error;
    }
  },

  async restartCheckup(id, options) {
    const target = get().checkups.find((item) => item.id === id);
    if (!target) {
      throw new Error('检查提醒不存在或已删除');
    }

    try {
      const updated = await restartCheckupInCloud({
        checkupId: id,
        mutationId: options.mutationId,
        expectedVersion: target.version,
        targetDate: options.targetDate,
        remindAdvanceDays: options.remindAdvanceDays,
        remindTime: options.remindTime
      });
      set((state) => ({
        checkups: state.checkups.map((item) =>
          item.id === id ? updated : item
        )
      }));
    } catch (error) {
      if (error instanceof CheckupMutationConflictError) {
        set((state) => ({
          checkups: state.checkups.map((item) =>
            item.id === id ? error.checkup : item
          )
        }));
      }
      throw error;
    }
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
