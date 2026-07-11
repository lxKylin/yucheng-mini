import type {
  InventoryDisplayStatus,
  Medicine
} from '../types';

export const LOW_INVENTORY_DAYS = 7;

export interface InventoryDerivation {
  plannedDailyDosage: number;
  estimatedRemainingQuantity: number | null;
  estimatedAvailableDays: number | null;
  inventoryDisplayStatus: InventoryDisplayStatus;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatQuantity(value: number): string {
  return String(roundQuantity(value));
}

export function formatDosage(value: number, unit: string): string {
  if (unit === '片' && value === 0.25) return '1/4 片';
  if (unit === '片' && value === 0.5) return '1/2 片';
  return `${formatQuantity(value)}${unit}`;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function diffNaturalDays(from: string, to: string): number {
  return Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86400000
  );
}

export function canAutomaticallyEstimate(
  medicine: Pick<
    Medicine,
    | 'inventoryTrackingEnabled'
    | 'inventoryEstimateMode'
    | 'inventoryNeedsCalibration'
    | 'inventoryBaseDate'
    | 'dosagePerUse'
    | 'timesPerDay'
    | 'scheduleTiming'
  >
): boolean {
  return (
    medicine.inventoryTrackingEnabled &&
    medicine.inventoryEstimateMode === 'automatic' &&
    !medicine.inventoryNeedsCalibration &&
    isValidDateString(medicine.inventoryBaseDate) &&
    medicine.dosagePerUse > 0 &&
    medicine.timesPerDay > 0 &&
    medicine.scheduleTiming !== '按医嘱'
  );
}

export function deriveMedicineInventory(
  medicine: Medicine,
  asOfDate: string
): InventoryDerivation {
  const plannedDailyDosage = roundQuantity(
    Math.max(0, medicine.dosagePerUse) * Math.max(0, medicine.timesPerDay)
  );

  if (!medicine.inventoryTrackingEnabled) {
    return {
      plannedDailyDosage,
      estimatedRemainingQuantity: null,
      estimatedAvailableDays: null,
      inventoryDisplayStatus: 'disabled'
    };
  }

  if (medicine.inventoryNeedsCalibration) {
    return {
      plannedDailyDosage,
      estimatedRemainingQuantity: null,
      estimatedAvailableDays: null,
      inventoryDisplayStatus: 'needs_calibration'
    };
  }

  if (!canAutomaticallyEstimate(medicine)) {
    return {
      plannedDailyDosage,
      estimatedRemainingQuantity: roundQuantity(
        Math.max(0, medicine.inventoryBaseQuantity)
      ),
      estimatedAvailableDays: null,
      inventoryDisplayStatus: 'manual'
    };
  }

  const elapsedDays = Math.max(
    0,
    diffNaturalDays(medicine.inventoryBaseDate, asOfDate)
  );
  const remaining = roundQuantity(
    Math.max(
      0,
      medicine.inventoryBaseQuantity - plannedDailyDosage * elapsedDays
    )
  );
  const availableDays = Math.floor(remaining / plannedDailyDosage);
  const inventoryDisplayStatus: InventoryDisplayStatus =
    remaining === 0
      ? 'depleted'
      : availableDays <= LOW_INVENTORY_DAYS
        ? 'low'
        : 'automatic';

  return {
    plannedDailyDosage,
    estimatedRemainingQuantity: remaining,
    estimatedAvailableDays: availableDays,
    inventoryDisplayStatus
  };
}

export function settleInventoryForDosageChange(
  medicine: Medicine,
  effectiveDate: string
): Pick<Medicine, 'inventoryBaseQuantity' | 'inventoryBaseDate'> {
  if (
    !isValidDateString(effectiveDate) ||
    effectiveDate < medicine.inventoryBaseDate
  ) {
    throw new Error('剂量生效日期不能早于当前库存基准日期');
  }

  const derivation = deriveMedicineInventory(medicine, effectiveDate);
  if (derivation.estimatedRemainingQuantity === null) {
    throw new Error('当前库存状态不能自动结算，请先重新盘点');
  }

  return {
    inventoryBaseQuantity: derivation.estimatedRemainingQuantity,
    inventoryBaseDate: effectiveDate
  };
}
