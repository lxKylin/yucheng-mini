# Daily Health Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加每日身体/用药感受记录能力，在首页提供今日记录入口，在“我的”页展示近一个月摘要，并提供状态记录时间轴回看入口。

**Architecture:** 新增独立 `daily-health-status` 业务域，不把状态记录写入 `Medicine` 或 `CheckupReminder`。数据层按 `types -> constants -> utils -> service -> store -> hooks` 组织，UI 层复用当前 medical-green、light-card、BottomSheet 风格，在首页插入轻量卡片，在“我的”页插入趋势摘要。

**Tech Stack:** React 18、TypeScript 5.4、Taro 4.2、Zustand、taroify、Sass、微信云开发数据库。

---

## 规范输入与审查依据

- 技术方案：`openspec/changes/daily-health-status/design.md`
- 行为变化与测试依据：`openspec/changes/daily-health-status/specs/daily-health-status/spec.md`
- 为什么做与范围：`openspec/changes/daily-health-status/proposal.md`
- 任务列表：`openspec/changes/daily-health-status/tasks.md`

## 范围检查

本 change 包含一个独立能力：每日身体/用药感受记录。它跨数据层、首页和“我的”页，但不是多个互相独立的子系统；一个实现计划可以覆盖并保持每个任务可独立验证。

明确排除：

- 不新增底部 Tab。
- 不实现状态日历、全部历史、导出报告、图片上传、医生共享。
- 不提供副作用判定、诊断结论、AI 医嘱或治疗建议。
- 不修改开药提醒、检查提醒、首页优先待办排序的业务语义。

## 文件结构

- Modify: `src/types/index.ts`
  - 新增每日状态记录、整体状态、用药情况、感受标签和摘要类型。
- Modify: `src/constants/index.ts`
  - 新增每日状态选项、感受标签选项、默认用药情况和近一个月窗口常量。
- Create: `src/utils/healthStatusUtils.ts`
  - 负责云端记录迁移、今日摘要文案、近一个月摘要统计、药品名映射。
- Create: `src/services/healthStatus.ts`
  - 负责 `dailyHealthStatuses` 集合的查询、去重、保存今日记录和按日期查找文档。
- Create: `src/store/healthStatusStore.ts`
  - Zustand vanilla store，负责加载日期范围、保存今日记录、维护内存态。
- Create: `src/hooks/useHealthStatus.ts`
  - React hooks，负责订阅 store、暴露今日记录、近一个月摘要和保存动作。
- Modify: `src/app.ts`
  - 登录成功后并行加载近一个月每日状态数据。
- Create: `src/components/HealthStatusComposer/index.tsx`
  - 今日状态记录表单组件，放在 BottomSheet 内使用。
- Create: `src/components/HealthStatusComposer/index.scss`
  - 表单样式，复用现有 Composer 的表单密度和按钮风格。
- Modify: `src/pages/home/index.tsx`
  - 引入今日状态卡片、BottomSheet 和记录表单。
- Modify: `src/pages/home/index.scss`
  - 新增轻量今日状态卡片样式，位置在指标区后、优先待办前。
- Modify: `src/pages/profile/index.tsx`
  - 在用户资料卡和设置菜单之间插入近一个月状态摘要卡。
- Create: `src/components/ProfileHealthSummary/index.tsx`
  - 抽出“我的”页近一个月状态摘要卡，并作为状态记录页入口。
- Create: `src/components/ProfileHealthSummary/index.scss`
  - 摘要入口卡样式。
- Create: `src/pages/health-status-records/index.tsx`
  - 近一个月状态记录时间轴页。
- Create: `src/pages/health-status-records/index.scss`
  - 时间轴页样式。
- Create: `src/pages/health-status-records/index.config.ts`
  - 状态记录页页面配置。
- Modify: `src/pages/profile/index.scss`
  - 新增摘要卡样式。
- Create: `docs/daily-health-status-cloud-indexes.md`
  - 说明 `dailyHealthStatuses` 云集合和组合索引建议。

## 数据契约

使用这些稳定命名，后续任务不得另起同义字段：

```ts
export type HealthOverallStatus = 'good' | 'normal' | 'uncomfortable' | 'bad';

export type HealthMedicationAdherence =
  | 'normal'
  | 'missed'
  | 'delayed'
  | 'paused'
  | 'not_prescribed'
  | 'adjusted';

export type HealthSymptomTag =
  | 'dizzy'
  | 'fatigue'
  | 'stomach'
  | 'sleep'
  | 'appetite'
  | 'pain'
  | 'mood'
  | 'other';

export interface HealthStatusRecord {
  id: string;
  date: string;
  overallStatus: HealthOverallStatus;
  symptomTags: HealthSymptomTag[];
  medicationAdherence: HealthMedicationAdherence;
  relatedMedicineIds: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthStatusSummary {
  totalDays: number;
  uncomfortableDays: number;
  abnormalAdherenceDays: number;
  commonSymptomTags: {
    value: HealthSymptomTag;
    label: string;
    count: number;
  }[];
}
```

### Task 1: 类型、常量和纯函数

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/constants/index.ts`
- Create: `src/utils/healthStatusUtils.ts`

- [ ] **Step 1: 在 `src/types/index.ts` 追加每日状态类型**

Add this block after `DerivedCheckupReminder` and before `PrescriptionRecord`:

```ts
export type HealthOverallStatus = 'good' | 'normal' | 'uncomfortable' | 'bad';

export type HealthMedicationAdherence =
  | 'normal'
  | 'missed'
  | 'delayed'
  | 'paused'
  | 'not_prescribed'
  | 'adjusted';

export type HealthSymptomTag =
  | 'dizzy'
  | 'fatigue'
  | 'stomach'
  | 'sleep'
  | 'appetite'
  | 'pain'
  | 'mood'
  | 'other';

export interface HealthStatusRecord {
  id: string;
  date: string; // YYYY-MM-DD
  overallStatus: HealthOverallStatus;
  symptomTags: HealthSymptomTag[];
  medicationAdherence: HealthMedicationAdherence;
  relatedMedicineIds: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthStatusSummary {
  totalDays: number;
  uncomfortableDays: number;
  abnormalAdherenceDays: number;
  commonSymptomTags: {
    value: HealthSymptomTag;
    label: string;
    count: number;
  }[];
}
```

- [ ] **Step 2: 在 `src/constants/index.ts` 导入类型**

Change the first import to:

```ts
import type {
  CheckupType,
  DosageUnit,
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthSymptomTag,
  MedicineSchedule
} from '@/types';
```

- [ ] **Step 3: 在 `src/constants/index.ts` 追加每日状态常量**

Add this block after `CHECKUP_BEFORE_OPTIONS`:

```ts
export const HEALTH_STATUS_LOOKBACK_MONTHS = 1;

export const HEALTH_OVERALL_STATUS_OPTIONS: {
  value: HealthOverallStatus;
  label: string;
  tone: 'good' | 'normal' | 'warning' | 'danger';
}[] = [
  { value: 'good', label: '良好', tone: 'good' },
  { value: 'normal', label: '一般', tone: 'normal' },
  { value: 'uncomfortable', label: '不舒服', tone: 'warning' },
  { value: 'bad', label: '明显不适', tone: 'danger' }
];

export const HEALTH_SYMPTOM_TAG_OPTIONS: {
  value: HealthSymptomTag;
  label: string;
}[] = [
  { value: 'dizzy', label: '头晕' },
  { value: 'fatigue', label: '乏力' },
  { value: 'stomach', label: '胃不舒服' },
  { value: 'sleep', label: '睡眠差' },
  { value: 'appetite', label: '食欲变化' },
  { value: 'pain', label: '疼痛' },
  { value: 'mood', label: '情绪波动' },
  { value: 'other', label: '其他' }
];

export const HEALTH_MEDICATION_ADHERENCE_OPTIONS: {
  value: HealthMedicationAdherence;
  label: string;
}[] = [
  { value: 'normal', label: '正常服用' },
  { value: 'missed', label: '漏服' },
  { value: 'delayed', label: '延迟' },
  { value: 'paused', label: '暂停' },
  { value: 'not_prescribed', label: '未开药' },
  { value: 'adjusted', label: '医生调整' }
];

export const DEFAULT_HEALTH_MEDICATION_ADHERENCE: HealthMedicationAdherence =
  'normal';
```

- [ ] **Step 4: 创建 `src/utils/healthStatusUtils.ts`**

Create the file with this implementation:

```ts
import {
  DEFAULT_HEALTH_MEDICATION_ADHERENCE,
  HEALTH_MEDICATION_ADHERENCE_OPTIONS,
  HEALTH_OVERALL_STATUS_OPTIONS,
  HEALTH_SYMPTOM_TAG_OPTIONS
} from '@/constants';
import type {
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthStatusRecord,
  HealthStatusSummary,
  HealthSymptomTag,
  Medicine
} from '@/types';
import { today } from '@/utils/dateUtils';

const OVERALL_VALUES = HEALTH_OVERALL_STATUS_OPTIONS.map(
  (option) => option.value
);
const SYMPTOM_VALUES = HEALTH_SYMPTOM_TAG_OPTIONS.map((option) => option.value);
const ADHERENCE_VALUES = HEALTH_MEDICATION_ADHERENCE_OPTIONS.map(
  (option) => option.value
);

function isOverallStatus(value: unknown): value is HealthOverallStatus {
  return OVERALL_VALUES.includes(value as HealthOverallStatus);
}

function isSymptomTag(value: unknown): value is HealthSymptomTag {
  return SYMPTOM_VALUES.includes(value as HealthSymptomTag);
}

function isMedicationAdherence(
  value: unknown
): value is HealthMedicationAdherence {
  return ADHERENCE_VALUES.includes(value as HealthMedicationAdherence);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function migrateHealthStatus(raw: any): HealthStatusRecord {
  const now = new Date().toISOString();
  const symptomTags = toStringArray(raw.symptomTags).filter(isSymptomTag);

  return {
    id: raw.id ?? raw._id ?? '',
    date: raw.date || today(),
    overallStatus: isOverallStatus(raw.overallStatus)
      ? raw.overallStatus
      : 'normal',
    symptomTags,
    medicationAdherence: isMedicationAdherence(raw.medicationAdherence)
      ? raw.medicationAdherence
      : DEFAULT_HEALTH_MEDICATION_ADHERENCE,
    relatedMedicineIds: toStringArray(raw.relatedMedicineIds),
    note: raw.note ?? '',
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? now
  };
}

export function getOverallStatusLabel(value: HealthOverallStatus): string {
  return (
    HEALTH_OVERALL_STATUS_OPTIONS.find((option) => option.value === value)
      ?.label ?? '一般'
  );
}

export function getSymptomTagLabel(value: HealthSymptomTag): string {
  return (
    HEALTH_SYMPTOM_TAG_OPTIONS.find((option) => option.value === value)
      ?.label ?? '其他'
  );
}

export function getMedicationAdherenceLabel(
  value: HealthMedicationAdherence
): string {
  return (
    HEALTH_MEDICATION_ADHERENCE_OPTIONS.find((option) => option.value === value)
      ?.label ?? '正常服用'
  );
}

export function buildTodayHealthStatusSummary(
  record: HealthStatusRecord | null
): string {
  if (!record) {
    return '今天身体感觉怎么样？';
  }

  const symptomText = record.symptomTags
    .slice(0, 2)
    .map(getSymptomTagLabel)
    .join('、');
  const overall = getOverallStatusLabel(record.overallStatus);
  return symptomText ? `${overall} · ${symptomText}` : overall;
}

export function buildRelatedMedicineNames(
  record: HealthStatusRecord,
  medicines: Medicine[]
): string[] {
  return record.relatedMedicineIds
    .map((id) => medicines.find((medicine) => medicine.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function buildHealthStatusSummary(
  records: HealthStatusRecord[]
): HealthStatusSummary {
  const tagCounts = new Map<HealthSymptomTag, number>();

  for (const record of records) {
    for (const tag of record.symptomTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    totalDays: records.length,
    uncomfortableDays: records.filter(
      (record) =>
        record.overallStatus === 'uncomfortable' ||
        record.overallStatus === 'bad'
    ).length,
    abnormalAdherenceDays: records.filter(
      (record) => record.medicationAdherence !== 'normal'
    ).length,
    commonSymptomTags: Array.from(tagCounts.entries())
      .map(([value, count]) => ({
        value,
        label: getSymptomTagLabel(value),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  };
}
```

- [ ] **Step 5: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本任务无关的既有环境错误。若出现 `HealthStatus` 类型、常量或 `healthStatusUtils.ts` 相关错误，先修复再继续。

- [ ] **Step 6: 提交类型与纯函数**

Run:

```bash
git diff -- src/types/index.ts src/constants/index.ts src/utils/healthStatusUtils.ts
git add src/types/index.ts src/constants/index.ts src/utils/healthStatusUtils.ts
git commit -m "feat: 添加状态记录相关类型定义和纯函数"
```

Expected: commit 只包含本任务 3 个文件。若工作区有用户未提交改动，只 stage 本任务文件。

### Task 2: 云端 Service、Store 和 Hooks

**Files:**

- Create: `src/services/healthStatus.ts`
- Create: `src/store/healthStatusStore.ts`
- Create: `src/hooks/useHealthStatus.ts`

- [ ] **Step 1: 创建云端 service**

Create `src/services/healthStatus.ts`:

```ts
import Taro from '@tarojs/taro';

import type { HealthStatusRecord } from '@/types';
import { migrateHealthStatus } from '@/utils/healthStatusUtils';
import { getUserId } from './auth';
import { getCollection } from './cloud';

const COL = 'dailyHealthStatuses';

async function queryUserHealthStatuses(
  field: '_openid' | 'userId',
  userId: string,
  startDate: string,
  endDate: string
) {
  const db = Taro.cloud.database();
  const _ = db.command;

  return getCollection(COL)
    .where({
      [field]: userId,
      date: _.gte(startDate).and(_.lte(endDate))
    })
    .limit(100)
    .orderBy('date', 'desc')
    .get();
}

async function findUserHealthStatusDocByDate(date: string) {
  const userId = getUserId();
  if (!userId) return '';

  const byOpenId = await getCollection(COL)
    .where({ date, _openid: userId })
    .limit(1)
    .get();
  if (byOpenId.data[0]?._id) {
    return byOpenId.data[0]._id;
  }

  const byUserId = await getCollection(COL)
    .where({ date, userId })
    .limit(1)
    .get();
  if (byUserId.data[0]?._id) {
    return byUserId.data[0]._id;
  }

  return '';
}

function dedupe(records: any[]): HealthStatusRecord[] {
  return records
    .filter(
      (item, index, list) =>
        index ===
        list.findIndex(
          (candidate) =>
            (candidate._id && candidate._id === item._id) ||
            (candidate.id && candidate.id === item.id) ||
            (candidate.date && candidate.date === item.date)
        )
    )
    .map((item) => migrateHealthStatus(item));
}

export async function fetchHealthStatuses(
  startDate: string,
  endDate: string
): Promise<HealthStatusRecord[]> {
  const userId = getUserId();
  if (!userId) return [];

  try {
    const [{ data: openIdData }, { data: userIdData }] = await Promise.all([
      queryUserHealthStatuses('_openid', userId, startDate, endDate),
      queryUserHealthStatuses('userId', userId, startDate, endDate)
    ]);

    return dedupe([...openIdData, ...userIdData]).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  } catch (err) {
    console.error('[healthStatusService] 拉取失败：', err);
    throw err;
  }
}

export async function saveHealthStatusToCloud(
  record: HealthStatusRecord
): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  try {
    const docId = await findUserHealthStatusDocByDate(record.date);
    if (docId) {
      await getCollection(COL).doc(docId).update({ data: record });
      return;
    }

    await getCollection(COL).add({
      data: { ...record, userId }
    });
  } catch (err) {
    console.error('[healthStatusService] 保存失败：', err);
    throw err;
  }
}
```

- [ ] **Step 2: 创建 Zustand store**

Create `src/store/healthStatusStore.ts`:

```ts
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
```

- [ ] **Step 3: 创建 React hooks**

Create `src/hooks/useHealthStatus.ts`:

```ts
import { useMemo, useSyncExternalStore } from 'react';

import { HEALTH_STATUS_LOOKBACK_MONTHS } from '@/constants';
import { healthStatusStore } from '@/store/healthStatusStore';
import { buildHealthStatusSummary } from '@/utils/healthStatusUtils';
import { addMonths, today } from '@/utils/dateUtils';

function useHealthStatusStore() {
  return useSyncExternalStore(
    healthStatusStore.subscribe,
    healthStatusStore.getState,
    healthStatusStore.getInitialState
  );
}

export function getHealthStatusLookbackRange() {
  const endDate = today();
  const startDate = addMonths(endDate, -HEALTH_STATUS_LOOKBACK_MONTHS);
  return { startDate, endDate };
}

export function useTodayHealthStatus() {
  const records = useHealthStatusStore().records;
  const todayStr = today();

  return useMemo(
    () => records.find((record) => record.date === todayStr) ?? null,
    [records, todayStr]
  );
}

export function useRecentHealthStatuses() {
  const records = useHealthStatusStore().records;
  const { startDate, endDate } = getHealthStatusLookbackRange();

  return useMemo(
    () =>
      records.filter(
        (record) => record.date >= startDate && record.date <= endDate
      ),
    [endDate, records, startDate]
  );
}

export function useHealthStatusSummary() {
  const records = useRecentHealthStatuses();

  return useMemo(() => buildHealthStatusSummary(records), [records]);
}

export function useHealthStatusActions() {
  const state = useHealthStatusStore();

  return useMemo(
    () => ({
      loadRange: state.loadRange,
      saveTodayStatus: state.saveTodayStatus
    }),
    [state]
  );
}
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本任务无关的既有环境错误。

- [ ] **Step 5: 提交数据层**

Run:

```bash
git diff -- src/services/healthStatus.ts src/store/healthStatusStore.ts src/hooks/useHealthStatus.ts
git add src/services/healthStatus.ts src/store/healthStatusStore.ts src/hooks/useHealthStatus.ts
git commit -m "feat: add health status data store"
```

Expected: commit 只包含 service、store、hooks。

### Task 3: 应用启动加载和云开发文档

**Files:**

- Modify: `src/app.ts`
- Create: `docs/daily-health-status-cloud-indexes.md`

- [ ] **Step 1: 在 `src/app.ts` 引入每日状态 store 和近一个月范围工具**

Add imports:

```ts
import { healthStatusStore } from '@/store/healthStatusStore';
import { getHealthStatusLookbackRange } from '@/hooks/useHealthStatus';
```

- [ ] **Step 2: 修改启动加载逻辑**

Replace the current reminder/checkup `Promise.all` block with:

```ts
const { startDate, endDate } = getHealthStatusLookbackRange();

await Promise.all([
  reminderStore.getState().loadFromCloud(),
  checkupStore.getState().loadFromCloud(),
  healthStatusStore.getState().loadRange(startDate, endDate)
]);
```

- [ ] **Step 3: 创建云开发索引说明**

Create `docs/daily-health-status-cloud-indexes.md`:

```md
# 每日状态记录云数据库索引

每日身体/用药感受记录使用独立集合 `dailyHealthStatuses`。

## 建议集合

- 集合名：`dailyHealthStatuses`
- 主要查询：当前用户近一个月记录
- 主要写入：按当前用户和 `date` 保存当天唯一记录

## 建议组合索引

建议在微信开发者工具的云开发控制台中为 `dailyHealthStatuses` 新建组合索引：

| 字段        | 排序 |
| ----------- | ---- |
| `userId`    | 升序 |
| `_openid`   | 升序 |
| `date`      | 降序 |
| `createdAt` | 降序 |

可读名称：`idx_daily_health_user_openid_date_created`

## 行为边界

- 记录是用户自我复盘材料，不是副作用判定。
- 药品通过 `relatedMedicineIds` 关联，页面文案应使用“相关药品”。
- 每个用户每天最多一条记录，保存今天记录时应更新已有同日期记录。
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本任务无关的既有环境错误。

- [ ] **Step 5: 提交启动加载和文档**

Run:

```bash
git diff -- src/app.ts docs/daily-health-status-cloud-indexes.md
git add src/app.ts docs/daily-health-status-cloud-indexes.md
git commit -m "feat: load daily health status records"
```

Expected: commit 只包含启动加载和云索引说明。

### Task 4: 今日状态记录组件

**Files:**

- Create: `src/components/HealthStatusComposer/index.tsx`
- Create: `src/components/HealthStatusComposer/index.scss`

- [ ] **Step 1: 创建组件实现**

Create `src/components/HealthStatusComposer/index.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Input, Textarea } from '@taroify/core';

import {
  DEFAULT_HEALTH_MEDICATION_ADHERENCE,
  HEALTH_MEDICATION_ADHERENCE_OPTIONS,
  HEALTH_OVERALL_STATUS_OPTIONS,
  HEALTH_SYMPTOM_TAG_OPTIONS
} from '@/constants';
import { useHealthStatusActions } from '@/hooks/useHealthStatus';
import { useAllDerivedMedicines } from '@/hooks/useReminders';
import type {
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthStatusRecord,
  HealthSymptomTag
} from '@/types';
import {
  getMedicationAdherenceLabel,
  getSymptomTagLabel
} from '@/utils/healthStatusUtils';

import './index.scss';

interface HealthStatusComposerProps {
  record: HealthStatusRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormValues {
  overallStatus: HealthOverallStatus | '';
  symptomTags: HealthSymptomTag[];
  medicationAdherence: HealthMedicationAdherence;
  relatedMedicineIds: string[];
  note: string;
}

type TextareaEvent = { detail: { value: string } };

function makeDefaults(record: HealthStatusRecord | null): FormValues {
  return {
    overallStatus: record?.overallStatus ?? '',
    symptomTags: record?.symptomTags ?? [],
    medicationAdherence:
      record?.medicationAdherence ?? DEFAULT_HEALTH_MEDICATION_ADHERENCE,
    relatedMedicineIds: record?.relatedMedicineIds ?? [],
    note: record?.note ?? ''
  };
}

export default function HealthStatusComposer({
  record,
  onSuccess,
  onCancel
}: HealthStatusComposerProps) {
  const medicines = useAllDerivedMedicines();
  const { saveTodayStatus } = useHealthStatusActions();
  const [values, setValues] = useState<FormValues>(() => makeDefaults(record));

  useEffect(() => {
    setValues(makeDefaults(record));
  }, [record]);

  const selectedMedicineNames = useMemo(
    () =>
      values.relatedMedicineIds
        .map((id) => medicines.find((medicine) => medicine.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [medicines, values.relatedMedicineIds]
  );

  const toggleSymptom = (tag: HealthSymptomTag) => {
    setValues((prev) => ({
      ...prev,
      symptomTags: prev.symptomTags.includes(tag)
        ? prev.symptomTags.filter((item) => item !== tag)
        : [...prev.symptomTags, tag]
    }));
  };

  const toggleMedicine = (id: string) => {
    setValues((prev) => ({
      ...prev,
      relatedMedicineIds: prev.relatedMedicineIds.includes(id)
        ? prev.relatedMedicineIds.filter((item) => item !== id)
        : [...prev.relatedMedicineIds, id]
    }));
  };

  const handleSubmit = async () => {
    if (!values.overallStatus) {
      Taro.showToast({
        title: '请选择今天整体状态',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    try {
      await saveTodayStatus({
        overallStatus: values.overallStatus,
        symptomTags: values.symptomTags,
        medicationAdherence: values.medicationAdherence,
        relatedMedicineIds: values.relatedMedicineIds,
        note: values.note
      });
      Taro.showToast({ title: '今日状态已记录', icon: 'success' });
      onSuccess();
    } catch {
      Taro.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    }
  };

  return (
    <View className="health-status-composer">
      <View className="health-status-composer__notice">
        <Text className="health-status-composer__notice-title">
          每天留一条状态
        </Text>
        <Text className="health-status-composer__notice-desc">
          这里只记录你的身体感受，方便以后回看；不做诊断或副作用判断。
        </Text>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">
          今天整体感觉
        </Text>
        <View className="health-status-composer__options">
          {HEALTH_OVERALL_STATUS_OPTIONS.map((option) => (
            <View
              key={option.value}
              className={`health-status-composer__option health-status-composer__option--${option.tone}${
                values.overallStatus === option.value
                  ? ' health-status-composer__option--active'
                  : ''
              }`}
              role="button"
              aria-label={`选择${option.label}`}
              onClick={() =>
                setValues((prev) => ({
                  ...prev,
                  overallStatus: option.value
                }))
              }
            >
              <Text className="health-status-composer__option-text">
                {option.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">
          有哪些感受
        </Text>
        <View className="health-status-composer__chips">
          {HEALTH_SYMPTOM_TAG_OPTIONS.map((option) => (
            <View
              key={option.value}
              className={`health-status-composer__chip${
                values.symptomTags.includes(option.value)
                  ? ' health-status-composer__chip--active'
                  : ''
              }`}
              role="button"
              aria-label={`选择${option.label}`}
              onClick={() => toggleSymptom(option.value)}
            >
              <Text>{option.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">用药情况</Text>
        <View className="health-status-composer__chips">
          {HEALTH_MEDICATION_ADHERENCE_OPTIONS.map((option) => (
            <View
              key={option.value}
              className={`health-status-composer__chip${
                values.medicationAdherence === option.value
                  ? ' health-status-composer__chip--active'
                  : ''
              }`}
              role="button"
              aria-label={`选择${option.label}`}
              onClick={() =>
                setValues((prev) => ({
                  ...prev,
                  medicationAdherence: option.value
                }))
              }
            >
              <Text>{option.label}</Text>
            </View>
          ))}
        </View>
        <Text className="health-status-composer__hint">
          默认是
          {getMedicationAdherenceLabel(DEFAULT_HEALTH_MEDICATION_ADHERENCE)}
          ，有异常时再修改。
        </Text>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">相关药品</Text>
        <View className="health-status-composer__chips">
          {medicines.length > 0 ? (
            medicines.map((medicine) => (
              <View
                key={medicine.id}
                className={`health-status-composer__chip${
                  values.relatedMedicineIds.includes(medicine.id)
                    ? ' health-status-composer__chip--active'
                    : ''
                }`}
                role="button"
                aria-label={`关联${medicine.name}`}
                onClick={() => toggleMedicine(medicine.id)}
              >
                <Text>{medicine.name}</Text>
              </View>
            ))
          ) : (
            <Text className="health-status-composer__empty">
              暂无可关联药品
            </Text>
          )}
        </View>
        {selectedMedicineNames.length > 0 ? (
          <Text className="health-status-composer__hint">
            已选择相关药品：{selectedMedicineNames.join('、')}
          </Text>
        ) : (
          <Text className="health-status-composer__hint">
            这里只做相关记录，不表示药品导致这些感受。
          </Text>
        )}
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">备注</Text>
        <View className="health-status-composer__textarea">
          <Textarea
            className="health-status-composer__textarea-control"
            value={values.note}
            maxlength={120}
            placeholder="可选：例如今天胃口一般，下午有点乏力"
            onChange={(event: TextareaEvent) =>
              setValues((prev) => ({ ...prev, note: event.detail.value }))
            }
          />
        </View>
      </View>

      <View className="health-status-composer__actions">
        <Button
          className="health-status-composer__cancel"
          variant="outlined"
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          className="health-status-composer__submit"
          color="primary"
          onClick={handleSubmit}
        >
          保存今日状态
        </Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 创建组件样式**

Create `src/components/HealthStatusComposer/index.scss`:

```scss
@use '@/assets/styles/variables' as *;

.health-status-composer {
  display: grid;
  gap: $spacing-5;
  padding-bottom: 136px;

  &__notice,
  &__section {
    padding: $spacing-4;
    border-radius: $radius;
    border: 1px solid $line-strong;
    background: rgba(251, 255, 253, 0.94);
  }

  &__notice {
    border-color: rgba(21, 122, 102, 0.12);
    background: $primary-soft;
  }

  &__notice-title,
  &__section-title {
    display: block;
    color: $ink-strong;
    font-size: $text-lg;
    font-weight: 900;
  }

  &__notice-desc,
  &__hint,
  &__empty {
    display: block;
    margin-top: 6px;
    color: $muted;
    font-size: $text-xs;
    line-height: 1.6;
  }

  &__section {
    display: grid;
    gap: $spacing-4;
    box-shadow: 0 10px 24px rgba(16, 59, 50, 0.04);
  }

  &__options,
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-3;
  }

  &__option,
  &__chip {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 $spacing-4;
    border-radius: $radius-pill;
    border: 1px solid $line-strong;
    background: #fff;
    color: $ink;
    font-size: $text-sm;
    font-weight: 800;
  }

  &__option--active,
  &__chip--active {
    color: $primary-deep;
    border-color: $primary;
    background: $primary-soft;
  }

  &__option--danger.health-status-composer__option--active {
    color: $danger;
    border-color: $danger;
    background: rgba(202, 78, 65, 0.1);
  }

  &__option--warning.health-status-composer__option--active {
    color: $warning;
    border-color: $warning;
    background: rgba(184, 108, 30, 0.12);
  }

  &__textarea {
    min-height: 128px;
    padding: $spacing-3 $spacing-4;
    border-radius: $radius;
    border: 1px solid $line-strong;
    background: #fff;
  }

  &__textarea-control {
    width: 100%;
    min-height: 96px;
    color: $ink;
    font-size: $text-md;
    line-height: 1.6;
  }

  &__actions {
    position: fixed;
    left: $spacing-8;
    right: $spacing-8;
    bottom: 0;
    z-index: 1030;
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: $spacing-3;
    padding: $spacing-4 0 calc(#{$spacing-2} + env(safe-area-inset-bottom));
    background: linear-gradient(
      180deg,
      rgba(248, 252, 250, 0),
      $paper 22%,
      $paper 100%
    );
  }

  &__cancel,
  &__submit {
    min-height: 52px !important;
    border-radius: $radius-pill !important;
    font-size: $text-md !important;
    font-weight: 900 !important;
  }
}
```

- [ ] **Step 3: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本任务无关的既有环境错误。若 `TextareaEvent` 类型不匹配 Taroify 版本，改用当前 `MedicineComposer` 的 `BaseEventOrig<{ value: string }>` 事件形态。

- [ ] **Step 4: 提交记录组件**

Run:

```bash
git diff -- src/components/HealthStatusComposer/index.tsx src/components/HealthStatusComposer/index.scss
git add src/components/HealthStatusComposer/index.tsx src/components/HealthStatusComposer/index.scss
git commit -m "feat: add health status composer"
```

Expected: commit 只包含 `HealthStatusComposer` 组件和样式。

### Task 5: 首页今日状态入口

**Files:**

- Modify: `src/pages/home/index.tsx`
- Modify: `src/pages/home/index.scss`

- [ ] **Step 1: 在首页导入组件和 hooks**

Add imports to `src/pages/home/index.tsx`:

```ts
import HealthStatusComposer from '@/components/HealthStatusComposer';
import { useTodayHealthStatus } from '@/hooks/useHealthStatus';
import {
  buildTodayHealthStatusSummary,
  getOverallStatusLabel
} from '@/utils/healthStatusUtils';
```

- [ ] **Step 2: 增加首页状态**

Inside `Home()`, near other `useState` calls, add:

```ts
const [healthStatusSheetOpen, setHealthStatusSheetOpen] = useState(false);
```

After `riskFeed` and actions hooks, add:

```ts
const todayHealthStatus = useTodayHealthStatus();
const healthStatusSummary = buildTodayHealthStatusSummary(todayHealthStatus);
```

Add handlers near `closeDoneSheet`:

```ts
const openHealthStatusSheet = () => {
  setHealthStatusSheetOpen(true);
};

const closeHealthStatusSheet = () => {
  setHealthStatusSheetOpen(false);
};
```

- [ ] **Step 3: 插入今日状态卡片**

Insert this JSX immediately after `</View>` closing `.home-metrics` and before `.home-subhead`:

```tsx
<View
  className={`home-health-status${
    todayHealthStatus ? ' home-health-status--done' : ''
  }`}
  role="button"
  aria-label={todayHealthStatus ? '修改今日状态' : '记录今日状态'}
  onClick={openHealthStatusSheet}
>
  <View className="home-health-status__copy">
    <Text className="home-health-status__eyebrow">
      {todayHealthStatus ? '今日已记录' : '今日状态'}
    </Text>
    <Text className="home-health-status__title">{healthStatusSummary}</Text>
    {todayHealthStatus?.overallStatus === 'bad' ? (
      <Text className="home-health-status__hint">
        明显不适时，必要时请咨询医生。
      </Text>
    ) : null}
  </View>
  <Text className="home-health-status__action">
    {todayHealthStatus ? '修改' : '记录'}
  </Text>
</View>
```

- [ ] **Step 4: 让悬浮新增按钮在状态 Sheet 打开时隐藏**

In `FloatingAddReminder hidden={...}`, add `healthStatusSheetOpen ||` to the hidden expression:

```tsx
        hidden={
          sheetActive ||
          healthStatusSheetOpen ||
          checkupSheetOpen ||
          completionTarget !== null ||
          restartTarget !== null
        }
```

- [ ] **Step 5: 加入今日状态 BottomSheet**

Insert before the existing reminder `BottomSheet`:

```tsx
<BottomSheet
  open={healthStatusSheetOpen}
  title={
    todayHealthStatus
      ? `修改今日状态：${getOverallStatusLabel(todayHealthStatus.overallStatus)}`
      : '记录今日状态'
  }
  onClose={closeHealthStatusSheet}
>
  <HealthStatusComposer
    record={todayHealthStatus}
    onSuccess={closeHealthStatusSheet}
    onCancel={closeHealthStatusSheet}
  />
</BottomSheet>
```

- [ ] **Step 6: 新增首页样式**

Append to `src/pages/home/index.scss` after `.home-metric`:

```scss
.home-health-status {
  min-height: 112px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-4;
  margin-top: $spacing-4;
  padding: 18px 20px;
  border-radius: $radius-card;
  border: 1px solid $line-soft;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 24px rgba(16, 74, 91, 0.06);

  &:active {
    transform: scale(0.985);
  }

  &--done {
    border-color: rgba(21, 122, 102, 0.18);
    background: linear-gradient(
      135deg,
      rgba(216, 241, 232, 0.92),
      rgba(255, 255, 255, 0.98)
    );
  }

  &__copy {
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  &__eyebrow {
    color: $primary-deep;
    font-size: 20px;
    font-weight: 900;
  }

  &__title {
    color: $ink-strong;
    font-size: 28px;
    font-weight: 900;
    line-height: 1.35;
  }

  &__hint {
    color: $muted;
    font-size: 20px;
    line-height: 1.5;
  }

  &__action {
    flex-shrink: 0;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    border-radius: $radius-pill;
    color: #fff;
    background: $primary;
    font-size: 22px;
    font-weight: 900;
  }
}
```

- [ ] **Step 7: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，且不出现 `home/index.tsx` 的未使用导入或未定义变量。

- [ ] **Step 8: 提交首页入口**

Run:

```bash
git diff -- src/pages/home/index.tsx src/pages/home/index.scss
git add src/pages/home/index.tsx src/pages/home/index.scss
git commit -m "feat: add home health status entry"
```

Expected: commit 只包含首页入口和样式。

### Task 6: 我的页近一个月摘要与状态记录入口

**Files:**

- Modify: `src/pages/profile/index.tsx`
- Modify: `src/pages/profile/index.scss`

- [ ] **Step 1: 导入摘要 hook**

Add imports to `src/pages/profile/index.tsx`:

```ts
import { useHealthStatusSummary } from '@/hooks/useHealthStatus';
```

- [ ] **Step 2: 在 `Profile()` 中读取摘要**

After `const stats = useProfileStats();`, add:

```ts
const healthStatusSummary = useHealthStatusSummary();
```

- [ ] **Step 3: 插入近一个月摘要卡**

Insert this JSX after the profile user card and before the commented metrics block:

```tsx
<View className="profile-page__health-summary">
  <View className="profile-page__health-summary-head">
    <View className="profile-page__health-summary-copy">
      <Text className="profile-page__health-summary-title">近一个月状态</Text>
      <Text className="profile-page__health-summary-desc">
        只展示你的记录统计，不做诊断判断
      </Text>
    </View>
  </View>

  {healthStatusSummary.totalDays > 0 ? (
    <>
      <View className="profile-page__health-summary-metrics">
        <View className="profile-page__health-summary-metric">
          <Text className="profile-page__health-summary-value">
            {healthStatusSummary.totalDays}
          </Text>
          <Text className="profile-page__health-summary-label">记录天数</Text>
        </View>
        <View className="profile-page__health-summary-metric">
          <Text className="profile-page__health-summary-value">
            {healthStatusSummary.uncomfortableDays}
          </Text>
          <Text className="profile-page__health-summary-label">不适天数</Text>
        </View>
        <View className="profile-page__health-summary-metric">
          <Text className="profile-page__health-summary-value">
            {healthStatusSummary.abnormalAdherenceDays}
          </Text>
          <Text className="profile-page__health-summary-label">用药异常</Text>
        </View>
      </View>
      <Text className="profile-page__health-summary-tags">
        {healthStatusSummary.commonSymptomTags.length > 0
          ? `常见感受：${healthStatusSummary.commonSymptomTags
              .map((item) => item.label)
              .join('、')}`
          : '暂未记录具体感受标签'}
      </Text>
    </>
  ) : (
    <Text className="profile-page__health-summary-empty">
      还没有近一个月状态记录，今天可以从首页记录一次。
    </Text>
  )}
</View>
```

- [ ] **Step 4: 新增我的页样式**

Append to `src/pages/profile/index.scss` after `&__card` block:

```scss
&__health-summary {
  display: grid;
  gap: $spacing-4;
  padding: $spacing-5;
  border-radius: $radius-lg;
  background: $surface-raised;
  border: 1px solid $line-soft;
  box-shadow: $shadow-card;
}

&__health-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-4;
}

&__health-summary-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

&__health-summary-title {
  display: block;
  color: $ink-strong;
  font-size: $text-md;
  font-weight: 900;
}

&__health-summary-desc,
&__health-summary-empty,
&__health-summary-tags {
  display: block;
  color: $muted;
  font-size: $text-xs;
  line-height: 1.6;
}

&__health-summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $spacing-3;
}

&__health-summary-metric {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-radius: $radius;
  background: $primary-soft;
}

&__health-summary-value {
  color: $ink-strong;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.1;
}

&__health-summary-label {
  margin-top: 6px;
  color: $muted;
  font-size: 20px;
  font-weight: 800;
}
```

- [ ] **Step 5: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，且“我的”页不出现未使用导入或 JSX 类型错误。

- [ ] **Step 6: 提交摘要卡**

Run:

```bash
git diff -- src/pages/profile/index.tsx src/pages/profile/index.scss
git add src/pages/profile/index.tsx src/pages/profile/index.scss
git commit -m "feat: show health status profile summary"
```

Expected: commit 只包含“我的”页摘要接入。

### Task 7: 手动验收和 OpenSpec 任务同步

**Files:**

- Modify: `openspec/changes/daily-health-status/tasks.md`

- [ ] **Step 1: 运行 OpenSpec 校验**

Run:

```bash
openspec validate --changes daily-health-status --json
```

Expected: JSON summary 中 `failed` 为 `0`。

- [ ] **Step 2: 运行最终类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若 Taro 生态依赖导致环境错误，记录完整错误；不得把与本次新增文件有关的类型错误留到最终报告。

- [ ] **Step 3: 手动验收首页未记录态**

Run:

```bash
pnpm run dev:weapp
```

Expected: 微信小程序构建启动。打开小程序首页后，风险指标区后、优先待办前出现“今日状态”卡片，文案为“今天身体感觉怎么样？”和“记录”。如果本地 Taro 构建因环境阻塞无法运行，记录阻塞原因，并至少完成 TypeScript 静态验证。

- [ ] **Step 4: 手动验收保存和修改当天记录**

Manual steps:

1. 点击首页“今日状态”卡片。
2. 在 BottomSheet 选择“良好”。
3. 不选择用药情况，保存。
4. 确认首页卡片变成“今日已记录”，摘要包含“良好”。
5. 再次点击卡片，选择“胃不舒服”和“漏服”，保存。
6. 确认首页摘要展示“良好 · 胃不舒服”，且“我的”页近一个月摘要中记录天数为 1、用药异常为 1。

Expected: 关闭 Sheet 后不跳页，不影响优先待办卡片；取消关闭时不新增或修改记录。

- [ ] **Step 5: 手动验收医疗判断边界**

Search user-facing health status text:

```bash
rg -n "副作用|诊断|治疗|导致|由.*药|医生" src/components/HealthStatusComposer src/pages/home src/pages/profile
```

Expected: 不出现“副作用判定”“诊断结论”“治疗建议”“药品导致”等表达；允许出现“必要时请咨询医生”和“医生调整”。

- [ ] **Step 6: 同步 OpenSpec 任务勾选**

After implementation and validation pass, update `openspec/changes/daily-health-status/tasks.md` so completed tasks are checked. Use the exact original task list and mark only completed items:

```md
- [x] 1.1 在类型定义中新增每日状态记录、整体状态、用药情况、感受标签等 TypeScript 类型，并保持药品/检查模型不变
```

Expected: all completed implementation and validation tasks are checked; unfinished manual runtime checks remain unchecked with a note in final report.

- [ ] **Step 7: 提交验收记录**

Run:

```bash
git diff -- openspec/changes/daily-health-status/tasks.md
git add openspec/changes/daily-health-status/tasks.md
git commit -m "chore: mark daily health status tasks"
```

Expected: commit 只包含 OpenSpec task status changes.

## 验收矩阵

- 每日状态记录数据模型：Task 1、Task 2。
- 每天唯一记录：Task 2、Task 4、Task 7 Step 4。
- 状态记录字段与默认值：Task 1、Task 4、Task 7 Step 4。
- 首页今日状态入口：Task 5、Task 7 Step 3。
- BottomSheet 记录流程：Task 4、Task 5、Task 7 Step 4。
- 近一个月状态摘要：Task 6、Task 7 Step 4。
- 医疗判断边界：Task 4、Task 5、Task 6、Task 7 Step 5。

## 自检结果

- 规格覆盖：所有 `daily-health-status` requirements 都映射到任务和验收步骤。
- 占位词扫描：未发现未完成标记、模糊实现项或缺少命令的验证步骤。
- 类型一致性：计划统一使用 `HealthStatusRecord`、`overallStatus`、`symptomTags`、`medicationAdherence`、`relatedMedicineIds`、`healthStatusStore`、`useTodayHealthStatus`、`useHealthStatusSummary`。
