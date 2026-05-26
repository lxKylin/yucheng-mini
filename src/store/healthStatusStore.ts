import { createStore } from 'zustand/vanilla';

import { DEFAULT_HEALTH_MEDICATION_ADHERENCE } from '@/constants';
import {
  fetchHealthStatuses,
  saveHealthStatusToCloud
} from '@/services/healthStatus';
import type {
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthStatusRecord,
  HealthSymptomTag
} from '@/types';
import { genId } from '@/utils/commonUtils';
import { today } from '@/utils/dateUtils';

export interface SaveHealthStatusPayload {
  date?: string;
  overallStatus: HealthOverallStatus;
  symptomTags?: HealthSymptomTag[];
  medicationAdherence?: HealthMedicationAdherence;
  relatedMedicineIds?: string[];
  note?: string;
}

interface HealthStatusStore {
  records: HealthStatusRecord[];
  loadRange: (startDate: string, endDate: string) => Promise<void>;
  saveTodayStatus: (payload: SaveHealthStatusPayload) => Promise<void>;
  getByDate: (date: string) => HealthStatusRecord | null;
}

export const healthStatusStore = createStore<HealthStatusStore>((set, get) => ({
  records: [],

  async loadRange(startDate, endDate) {
    const cloudList = await fetchHealthStatuses(startDate, endDate);
    set({ records: cloudList });
  },

  async saveTodayStatus(payload) {
    const date = payload.date || today();
    const now = new Date().toISOString();
    const existing = get().records.find((record) => record.date === date);
    const nextRecord: HealthStatusRecord = {
      id: existing?.id || genId(),
      date,
      overallStatus: payload.overallStatus,
      symptomTags: payload.symptomTags || [],
      medicationAdherence:
        payload.medicationAdherence || DEFAULT_HEALTH_MEDICATION_ADHERENCE,
      relatedMedicineIds: payload.relatedMedicineIds || [],
      note: payload.note?.trim() || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    await saveHealthStatusToCloud(nextRecord);

    set((state) => {
      const hasExisting = state.records.some((record) => record.date === date);
      const records = hasExisting
        ? state.records.map((record) =>
            record.date === date ? nextRecord : record
          )
        : [nextRecord, ...state.records];

      return {
        records: records.sort((a, b) => b.date.localeCompare(a.date))
      };
    });
  },

  getByDate(date) {
    return get().records.find((record) => record.date === date) ?? null;
  }
}));
