import {
  DEFAULT_BEFORE,
  DEFAULT_INTERVAL,
  DEFAULT_REMIND_TIME
} from '@/constants';
import type {
  DosageUnit,
  InventoryEstimateMode,
  MedicineForm,
  MedicineSchedule
} from '@/types';
import { today } from '@/utils/dateUtils';
import { loadSettings } from '@/utils/storage';

export interface MedicineComposerValues {
  name: string;
  spec: string;
  form: MedicineForm;
  expiryDate: string;
  note: string;
  dosageUnit: DosageUnit;
  timesPerDay: number;
  scheduleTiming: MedicineSchedule;
  scheduleTime: string;
  inventoryTrackingEnabled: boolean;
  inventoryEstimateMode: InventoryEstimateMode;
  inventoryBaseDate: string;
  reminderEnabled: boolean;
  currentPrescriptionDate: string;
  intervalDays: number;
  remindAdvanceDays: number;
  remindTime: string;
}

export const DOSAGE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
export const QUANTITY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

export function makeDefaults(
  defaultReminderEnabled = false
): MedicineComposerValues {
  const settings = loadSettings();
  return {
    name: '',
    spec: '',
    form: 'tablet',
    expiryDate: '',
    note: '',
    dosageUnit: '片',
    timesPerDay: 1,
    scheduleTiming: '饭后',
    scheduleTime: '08:00',
    inventoryTrackingEnabled: false,
    inventoryEstimateMode: 'automatic',
    inventoryBaseDate: today(),
    reminderEnabled: defaultReminderEnabled,
    currentPrescriptionDate: today(),
    intervalDays: DEFAULT_INTERVAL,
    remindAdvanceDays: settings.defaultBefore || DEFAULT_BEFORE,
    remindTime: settings.defaultTime || DEFAULT_REMIND_TIME
  };
}

export function findIndexOrZero<T extends readonly unknown[]>(
  options: T,
  value: unknown
) {
  const index = options.findIndex((option) => option === value);
  return index >= 0 ? index : 0;
}

export function normalizeRange(
  value: number,
  fallback: number,
  min: number,
  max: number
) {
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return value;
}

export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex < 0) return cleaned;
  return `${cleaned.slice(0, dotIndex + 1)}${cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, '')}`;
}
