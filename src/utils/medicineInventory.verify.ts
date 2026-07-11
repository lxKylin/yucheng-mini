import type { Medicine } from '../types';
import {
  canAutomaticallyEstimate,
  deriveMedicineInventory,
  formatDosage,
  formatQuantity,
  settleInventoryForDosageChange
} from './medicineInventory';

const sampleMedicine: Medicine = {
  id: 'medicine_1',
  name: '测试片剂',
  spec: '',
  form: 'tablet',
  expiryDate: '',
  note: '',
  dosagePerUse: 0.5,
  dosageUnit: '片',
  timesPerDay: 2,
  scheduleTiming: '饭后',
  scheduleTime: '',
  inventoryTrackingEnabled: true,
  inventoryEstimateMode: 'automatic',
  inventoryBaseQuantity: 60,
  inventoryBaseDate: '2026-07-01',
  inventoryNeedsCalibration: false,
  inventoryUpdatedAt: '2026-07-01T08:00:00.000Z',
  reminderEnabled: false,
  currentPrescriptionDate: '2026-07-01',
  intervalDays: 30,
  remindAdvanceDays: 7,
  remindTime: '09:00',
  status: 'active',
  prescriptionHistory: [],
  lastWechatReminderDate: '',
  lastWechatReminderAt: '',
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z'
};

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[medicineInventory.verify] ${message}`);
}

export function verifyMedicineInventory() {
  assert(formatDosage(0.25, '片') === '1/4 片', '四分之一片格式错误');
  assert(formatDosage(0.5, '片') === '1/2 片', '半片格式错误');
  assert(formatQuantity(0.1 + 0.2) === '0.3', '浮点精度格式错误');

  const baseDay = deriveMedicineInventory(sampleMedicine, '2026-07-01');
  assert(baseDay.estimatedRemainingQuantity === 60, '基准日不应扣减');

  const afterTenDays = deriveMedicineInventory(sampleMedicine, '2026-07-11');
  assert(afterTenDays.plannedDailyDosage === 1, '每日计划用量错误');
  assert(afterTenDays.estimatedRemainingQuantity === 50, '多日消耗错误');
  assert(afterTenDays.estimatedAvailableDays === 50, '预计可用天数错误');

  const depleted = deriveMedicineInventory(sampleMedicine, '2027-01-01');
  assert(depleted.estimatedRemainingQuantity === 0, '余量不得为负数');
  assert(depleted.inventoryDisplayStatus === 'depleted', '归零状态错误');

  const lowInventory = deriveMedicineInventory(
    { ...sampleMedicine, inventoryBaseQuantity: 8 },
    '2026-07-02'
  );
  assert(lowInventory.estimatedAvailableDays === 7, '七天阈值天数错误');
  assert(lowInventory.inventoryDisplayStatus === 'low', '七天阈值状态错误');

  const manualMedicine = {
    ...sampleMedicine,
    inventoryEstimateMode: 'manual' as const
  };
  assert(!canAutomaticallyEstimate(manualMedicine), '手动模式不应自动估算');
  assert(
    deriveMedicineInventory(manualMedicine, '2026-07-11')
      .estimatedAvailableDays === null,
    '手动模式不得输出可用天数'
  );

  const prescribedMedicine = {
    ...sampleMedicine,
    scheduleTiming: '按医嘱' as const
  };
  assert(!canAutomaticallyEstimate(prescribedMedicine), '按医嘱不应自动估算');

  const needsCalibration = {
    ...sampleMedicine,
    inventoryNeedsCalibration: true
  };
  assert(
    deriveMedicineInventory(needsCalibration, '2026-07-11')
      .inventoryDisplayStatus === 'needs_calibration',
    '待盘点状态错误'
  );

  const settled = settleInventoryForDosageChange(
    sampleMedicine,
    '2026-07-11'
  );
  assert(settled.inventoryBaseQuantity === 50, '剂量变更结算数量错误');
  assert(settled.inventoryBaseDate === '2026-07-11', '剂量结算日期错误');

  const quarterDose = deriveMedicineInventory(
    { ...sampleMedicine, dosagePerUse: 0.25, timesPerDay: 1 },
    '2026-07-03'
  );
  assert(quarterDose.estimatedRemainingQuantity === 59.5, '四分之一片消耗错误');
}

verifyMedicineInventory();
