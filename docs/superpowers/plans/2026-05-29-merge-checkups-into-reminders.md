# Merge Checkups Into Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将独立「检查」Tab 收敛进「提醒」Tab，形成统一提醒中心，并通过新增提醒表单内的开药/检查类型切换创建不同提醒，同时让开药和检查卡片在混合列表中保持一致的视觉骨架。

**Architecture:** 保留 `Medicine` 和 `CheckupReminder` 两个独立业务域，只在页面入口、混合列表、卡片展示和新增表单层统一用户心智。统一提醒列表 hook 负责混合数据适配，统一新增提醒组件负责表单内类型切换，`pages/list` 负责承载混合列表、详情、完成检查和重新安排流程；`MedicineCard` 与 `CheckupCard` 共享列表卡片骨架但保留各自业务字段和主操作。

**Tech Stack:** React 18、TypeScript 5.4、Taro 4.2、Zustand、taroify icons、Sass、微信小程序 TabBar 和页面生命周期。

---

## 规范输入与审查依据

- Change: `merge-checkups-into-reminders`
- Proposal: `openspec/changes/merge-checkups-into-reminders/proposal.md`
- Design: `openspec/changes/merge-checkups-into-reminders/design.md`
- Specs:
  - `openspec/changes/merge-checkups-into-reminders/specs/unified-reminder-center/spec.md`
  - `openspec/changes/merge-checkups-into-reminders/specs/checkup-reminders/spec.md`
  - `openspec/changes/merge-checkups-into-reminders/specs/home-risk-feed/spec.md`
- Task source: `openspec/changes/merge-checkups-into-reminders/tasks.md`
- 当前源码证据（2026-05-31 快照；若执行者从较早分支开始，可按下方端到端任务完整实现）：
  - `src/app.config.ts` 当前 TabBar 已展示首页、提醒、药箱、我的四个 Tab，并保留 `pages/checkups/index` 页面路由作为兼容内部页面。
  - `src/pages/list/index.tsx` 当前已经接入 `useUnifiedReminderCenter`、`UnifiedReminderComposer`、`MedicineCard`、`CheckupCard`、检查详情、完成检查和重新安排 Sheet。
  - `src/components/MedicineCard/index.tsx` 已有进度条和「已开药 / 查看详情」双按钮，但缺少显式业务类型标签。
  - `src/components/CheckupCard/index.tsx` 当前仍使用灰色日期块和单胶囊「完成检查」动作，与 `MedicineCard` 的列表节奏不一致，且详情主要依赖整卡点击。
  - `src/components/CheckupCard/index.scss` 当前有独立的 `date-row/date-block/footer` 结构，需要收敛到与 `MedicineCard` 一致的标题、关键时间、进度和双动作骨架。

## 文件结构

- Create: `src/hooks/useUnifiedReminderCenter.ts`
  - 负责把 `DerivedMedicine` 和 `DerivedCheckupReminder` 适配成统一提醒项，提供类型筛选、状态筛选、搜索、计数、排序和列表 reset key。
- Create: `src/components/UnifiedReminderComposer/index.tsx`
  - 负责新增模式下的开药提醒 / 检查提醒分段切换，并分别渲染 `MedicineComposer` 和 `CheckupComposer`。
- Create: `src/components/UnifiedReminderComposer/index.scss`
  - 负责新增提醒类型切换控件和表单容器样式。
- Modify: `src/pages/list/index.tsx`
  - 升级为统一提醒中心，混合渲染 `MedicineCard` 和 `CheckupCard`，接入检查详情、完成检查、重新安排和统一新增提醒。
- Modify: `src/pages/list/index.scss`
  - 增加类型筛选、检查卡片混排间距和统一新增提醒样式适配。
- Modify: `src/components/MedicineCard/index.tsx`
  - 增加轻量业务类型标签「开药」，保持风险状态标签、关键时间、进度条和底部动作区位置稳定。
- Modify: `src/components/MedicineCard/index.scss`
  - 补充业务类型标签和标题行样式，避免标题、状态标签和长药名挤压。
- Modify: `src/components/CheckupCard/index.tsx`
  - 将检查卡片收敛到与开药卡片一致的卡片骨架，加入进度条和显式「查看详情」入口，主操作仍为「完成检查」。
- Modify: `src/components/CheckupCard/index.scss`
  - 移除独立灰色日期块样式，改为与开药卡片一致的 meta、progress、actions、button 样式。
- Modify: `src/app.config.ts`
  - 从底部 TabBar 移除「检查」Tab，保留 `pages/checkups/index` 页面路由作为兼容内部页面。
- Modify: `src/pages/home/index.tsx`
  - 首页完整入口收敛到统一提醒中心，移除「检查」Tab 跳转和空状态中的检查页提示。
- Modify: `docs/1.产品设计.md`
  - 将当前五 Tab / 独立检查 Tab 表述更新为四 Tab / 统一提醒中心。
- Modify: `docs/3.开发计划.md`
  - 同步四 Tab 导航、统一提醒中心、表单内开药/检查类型切换和检查业务域独立边界。
- No change: `src/store/reminderStore.ts`
  - 开药提醒仍写入药品数据域。
- No change: `src/store/checkupStore.ts`
  - 检查提醒仍写入检查提醒数据域。
- No change: `cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/reminder/index.js`
  - 开药提醒云函数保持独立。
- No change: `cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/checkupReminder/index.js`
  - 检查提醒云函数保持独立。

### Task 1: 统一提醒中心 Hook

**Files:**

- Create: `src/hooks/useUnifiedReminderCenter.ts`

- [ ] **Step 1: 创建统一提醒中心 hook**

Create `src/hooks/useUnifiedReminderCenter.ts`:

```ts
import { useMemo } from 'react';

import { CHECKUP_STATUS, REMINDER_LEVEL, REMINDER_STATUS } from '@/constants';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useDerivedList } from '@/hooks/useReminders';
import type {
  DerivedCheckupReminder,
  DerivedReminder,
  ReminderLevel
} from '@/types';

export type UnifiedReminderType = 'all' | 'medicine' | 'checkup';
export type UnifiedReminderStatus = 'all' | ReminderLevel | 'done';

interface UnifiedReminderBase {
  id: string;
  type: 'medicine' | 'checkup';
  title: string;
  searchText: string;
  statusFilter: Exclude<UnifiedReminderStatus, 'all'>;
  daysLeft: number;
  targetDate: string;
  level: ReminderLevel;
}

export type UnifiedReminderItem =
  | (UnifiedReminderBase & {
      type: 'medicine';
      item: DerivedReminder;
    })
  | (UnifiedReminderBase & {
      type: 'checkup';
      item: DerivedCheckupReminder;
    });

export interface UnifiedReminderFilters {
  type: UnifiedReminderType;
  status: UnifiedReminderStatus;
  searchTerm: string;
}

export const UNIFIED_TYPE_FILTERS: {
  key: UnifiedReminderType;
  label: string;
}[] = [
  { key: 'all', label: '全部' },
  { key: 'medicine', label: '开药' },
  { key: 'checkup', label: '检查' }
];

export const UNIFIED_STATUS_FILTERS: {
  key: UnifiedReminderStatus;
  label: string;
}[] = [
  { key: 'all', label: '全部' },
  { key: REMINDER_LEVEL.DANGER, label: '逾期今日' },
  { key: REMINDER_LEVEL.WARNING, label: '7天内' },
  { key: REMINDER_LEVEL.GOOD, label: '正常' },
  { key: REMINDER_LEVEL.PAUSED, label: '暂停' },
  { key: 'done', label: '已完成' }
];

function getMedicineSearchText(item: DerivedReminder) {
  return [
    item.name,
    item.spec,
    item.form,
    item.scheduleTiming,
    item.scheduleTime,
    item.scheduleLabel,
    item.expiryDate,
    item.note
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getCheckupSearchText(item: DerivedCheckupReminder) {
  return [
    item.title,
    item.typeLabel,
    item.hospital,
    item.note,
    item.relatedMedicineNames.join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getMedicineStatusFilter(item: DerivedReminder) {
  return item.level;
}

function getCheckupStatusFilter(item: DerivedCheckupReminder) {
  if (item.status === CHECKUP_STATUS.DONE) return 'done';
  if (item.status === CHECKUP_STATUS.PAUSED) return REMINDER_LEVEL.PAUSED;
  return item.level;
}

function getSortRank(item: UnifiedReminderItem) {
  if (item.type === 'checkup' && item.item.status === CHECKUP_STATUS.DONE) {
    return 5;
  }

  if (item.level === REMINDER_LEVEL.PAUSED) return 4;
  if (item.daysLeft < 0) return 0;
  if (item.daysLeft === 0) return 1;
  if (item.level === REMINDER_LEVEL.WARNING) return 2;
  return 3;
}

function buildUnifiedItems(
  medicines: DerivedReminder[],
  checkups: DerivedCheckupReminder[]
): UnifiedReminderItem[] {
  const medicineItems: UnifiedReminderItem[] = medicines.map((item) => ({
    id: item.id,
    type: 'medicine',
    title: item.name,
    searchText: getMedicineSearchText(item),
    statusFilter: getMedicineStatusFilter(item),
    daysLeft: item.daysLeft,
    targetDate: item.nextPrescriptionDate,
    level: item.level,
    item
  }));

  const checkupItems: UnifiedReminderItem[] = checkups.map((item) => ({
    id: item.id,
    type: 'checkup',
    title: item.title,
    searchText: getCheckupSearchText(item),
    statusFilter: getCheckupStatusFilter(item),
    daysLeft: item.daysLeft,
    targetDate: item.targetDate,
    level: item.level,
    item
  }));

  return [...medicineItems, ...checkupItems].sort((a, b) => {
    const rankDiff = getSortRank(a) - getSortRank(b);
    if (rankDiff !== 0) return rankDiff;

    const dateDiff = a.targetDate.localeCompare(b.targetDate);
    if (dateDiff !== 0) return dateDiff;

    return a.title.localeCompare(b.title);
  });
}

function filterUnifiedItems(
  items: UnifiedReminderItem[],
  filters: UnifiedReminderFilters
) {
  const term = filters.searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    const byType = filters.type === 'all' || item.type === filters.type;
    const byStatus =
      filters.status === 'all' || item.statusFilter === filters.status;
    const bySearch = !term || item.searchText.includes(term);

    return byType && byStatus && bySearch;
  });
}

export function useUnifiedReminderCenter(filters: UnifiedReminderFilters) {
  const medicines = useDerivedList();
  const checkups = useDerivedCheckups();

  return useMemo(() => {
    const items = buildUnifiedItems(medicines, checkups);
    const filteredItems = filterUnifiedItems(items, filters);
    const counts = {
      type: {
        all: items.length,
        medicine: items.filter((item) => item.type === 'medicine').length,
        checkup: items.filter((item) => item.type === 'checkup').length
      },
      status: UNIFIED_STATUS_FILTERS.reduce(
        (map, filter) => {
          map[filter.key] =
            filter.key === 'all'
              ? items.length
              : items.filter((item) => item.statusFilter === filter.key).length;
          return map;
        },
        {} as Record<UnifiedReminderStatus, number>
      )
    };
    const resetKey = `${filters.type}:${filters.status}:${filters.searchTerm.trim()}`;

    return {
      items,
      filteredItems,
      counts,
      resetKey,
      sourceTotal: medicines.length + checkups.length
    };
  }, [checkups, filters, medicines]);
}
```

- [ ] **Step 2: 运行类型检查，确认新 hook 可编译**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，错误应指向本步骤新增 hook 的字段或类型，修复后继续。

- [ ] **Step 3: 提交统一提醒中心 hook**

Run:

```bash
git add src/hooks/useUnifiedReminderCenter.ts
git commit -m "feat: add unified reminder center hook"
```

Expected: 只提交 `src/hooks/useUnifiedReminderCenter.ts`。

### Task 2: 统一新增提醒组件

**Files:**

- Create: `src/components/UnifiedReminderComposer/index.tsx`
- Create: `src/components/UnifiedReminderComposer/index.scss`

- [ ] **Step 1: 创建统一新增提醒组件**

Create `src/components/UnifiedReminderComposer/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';

import CheckupComposer from '@/components/CheckupComposer';
import MedicineComposer from '@/components/MedicineComposer';

import './index.scss';

type ComposerType = 'medicine' | 'checkup';

interface UnifiedReminderComposerProps {
  defaultType?: ComposerType;
  resetKey: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: { key: ComposerType; label: string }[] = [
  { key: 'medicine', label: '开药提醒' },
  { key: 'checkup', label: '检查提醒' }
];

export default function UnifiedReminderComposer({
  defaultType = 'medicine',
  resetKey,
  onSuccess,
  onCancel
}: UnifiedReminderComposerProps) {
  const [activeType, setActiveType] = useState<ComposerType>(defaultType);
  const [medicineKey, setMedicineKey] = useState(0);
  const [checkupKey, setCheckupKey] = useState(0);

  useEffect(() => {
    setActiveType(defaultType);
    setMedicineKey((current) => current + 1);
    setCheckupKey((current) => current + 1);
  }, [defaultType, resetKey]);

  const handleSuccess = () => {
    onSuccess();
  };

  return (
    <View className="unified-reminder-composer">
      <View className="unified-reminder-composer__switch">
        {TYPE_OPTIONS.map((option) => (
          <View
            key={option.key}
            className={`unified-reminder-composer__switch-item${
              activeType === option.key
                ? ' unified-reminder-composer__switch-item--active'
                : ''
            }`}
            role="button"
            aria-label={`选择${option.label}`}
            aria-pressed={activeType === option.key}
            onClick={() => setActiveType(option.key)}
          >
            <Text className="unified-reminder-composer__switch-text">
              {option.label}
            </Text>
          </View>
        ))}
      </View>

      <View
        className={`unified-reminder-composer__panel${
          activeType === 'medicine'
            ? ''
            : ' unified-reminder-composer__panel--hidden'
        }`}
      >
        <MedicineComposer
          key={`medicine-${medicineKey}`}
          defaultReminderEnabled={true}
          onSuccess={handleSuccess}
          onCancel={onCancel}
        />
      </View>

      <View
        className={`unified-reminder-composer__panel${
          activeType === 'checkup'
            ? ''
            : ' unified-reminder-composer__panel--hidden'
        }`}
      >
        <CheckupComposer
          key={`checkup-${checkupKey}`}
          onSuccess={handleSuccess}
          onCancel={onCancel}
        />
      </View>
    </View>
  );
}
```

说明：本组件采用“两个表单独立挂载、只显示当前类型”的策略，切换时保留各类型内部草稿状态，满足类型切换保护要求。

- [ ] **Step 2: 创建组件样式**

Create `src/components/UnifiedReminderComposer/index.scss`:

```scss
@use '@/assets/styles/variables' as *;

.unified-reminder-composer {
  display: grid;
  gap: $spacing-4;
}

.unified-reminder-composer__switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 6px;
  border-radius: 22px;
  border: 1px solid $line-soft;
  background: rgba(255, 255, 255, 0.78);
}

.unified-reminder-composer__switch-item {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  transition:
    background 180ms ease,
    transform 180ms ease;

  &:active {
    transform: scale(0.985);
  }

  &--active {
    background: $primary;
  }
}

.unified-reminder-composer__switch-text {
  color: $muted;
  font-size: $text-base;
  font-weight: 900;
  line-height: 1.25;
}

.unified-reminder-composer__switch-item--active
  .unified-reminder-composer__switch-text {
  color: #fff;
}

.unified-reminder-composer__panel {
  display: block;

  &--hidden {
    display: none;
  }
}
```

- [ ] **Step 3: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，错误应只来自新组件 props 或 Taro 组件属性，修复后继续。

- [ ] **Step 4: 提交统一新增提醒组件**

Run:

```bash
git add src/components/UnifiedReminderComposer/index.tsx src/components/UnifiedReminderComposer/index.scss
git commit -m "feat: add unified reminder composer"
```

Expected: 只提交统一新增提醒组件。

### Task 3: 混合列表卡片视觉统一

**Files:**

- Modify: `src/components/MedicineCard/index.tsx`
- Modify: `src/components/MedicineCard/index.scss`
- Modify: `src/components/CheckupCard/index.tsx`
- Modify: `src/components/CheckupCard/index.scss`
- Modify: `src/pages/list/index.tsx`
- Modify: `src/pages/checkups/index.tsx`

- [ ] **Step 1: 给开药卡片增加业务类型标签**

Modify `src/components/MedicineCard/index.tsx` header block:

```tsx
<View className="medicine-card__header">
  <View className="medicine-card__title-wrap">
    <View className="medicine-card__type-tag">
      <Text className="medicine-card__type-tag-text">开药</Text>
    </View>
    <Text className="medicine-card__name">{item.name}</Text>
  </View>
  <StatusTag level={item.level} label={item.levelLabel} />
</View>
```

Expected: 开药卡片仍展示原有药名和状态，但标题行能明确标识业务类型。

- [ ] **Step 2: 补充开药卡片标题标签样式**

Modify `src/components/MedicineCard/index.scss` inside `.medicine-card`:

```scss
&__title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

&__type-tag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 34px;
  padding: 0 12px;
  border-radius: $radius-pill;
  background: $primary-soft;
}

&__type-tag-text {
  color: $primary-deep;
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
}
```

Also keep `medicine-card__name` with `flex: 1` and `min-width: 0` so long drug names shrink safely.

- [ ] **Step 3: 替换检查卡片为统一列表骨架**

Replace `src/components/CheckupCard/index.tsx` with:

```tsx
import { EyeOutlined, Success } from '@taroify/icons';
import { Text, View } from '@tarojs/components';

import { CHECKUP_STATUS, REMINDER_LEVEL } from '@/constants';
import ProgressBar from '@/components/ProgressBar';
import StatusTag from '@/components/StatusTag';
import type { DerivedCheckupReminder } from '@/types';

import './index.scss';

interface CheckupCardProps {
  item: DerivedCheckupReminder;
  onDetail?: () => void;
  onComplete?: () => void;
}

export default function CheckupCard({
  item,
  onDetail,
  onComplete
}: CheckupCardProps) {
  const accent =
    item.status === CHECKUP_STATUS.DONE
      ? 'done'
      : item.level === REMINDER_LEVEL.DANGER
        ? 'danger'
        : item.level === REMINDER_LEVEL.WARNING
          ? 'warning'
          : item.level === REMINDER_LEVEL.PAUSED
            ? 'paused'
            : 'success';
  const relatedText = item.relatedMedicineNames.length
    ? item.relatedMedicineNames.join('、')
    : '未关联药品';
  const canComplete = item.status === CHECKUP_STATUS.ACTIVE;
  const doneColor =
    item.level === REMINDER_LEVEL.DANGER
      ? 'danger'
      : item.level === REMINDER_LEVEL.WARNING
        ? 'warning'
        : 'success';

  return (
    <View className={`checkup-card checkup-card--${accent}`}>
      <View className="checkup-card__header">
        <View className="checkup-card__title-wrap">
          <View className="checkup-card__type-tag">
            <Text className="checkup-card__type-tag-text">检查</Text>
          </View>
          <Text className="checkup-card__title">{item.title}</Text>
        </View>
        <StatusTag level={item.level} label={item.levelLabel} />
      </View>

      <Text className="checkup-card__meta">
        {item.typeLabel} · {item.hospital || '医院未填'}
      </Text>
      <Text className="checkup-card__meta">关联：{relatedText}</Text>
      <Text
        className={`checkup-card__meta checkup-card__meta--accent checkup-card__meta--${accent}`}
      >
        检查日期: {item.targetDate}
      </Text>
      <Text
        className={`checkup-card__meta checkup-card__meta--accent checkup-card__meta--${accent}`}
      >
        提醒时间: {item.remindDate} {item.remindTime}
      </Text>

      <View className="checkup-card__progress">
        <ProgressBar progress={item.progress} level={item.level} />
      </View>

      <View className="checkup-card__actions">
        {canComplete ? (
          <View
            className={`checkup-card__btn checkup-card__btn--${doneColor}`}
            role="button"
            aria-label={`完成${item.title}`}
            onClick={onComplete}
          >
            <Success className="checkup-card__btn-icon" />
            <Text className="checkup-card__btn-text">完成检查</Text>
          </View>
        ) : null}
        <View
          className={`checkup-card__btn checkup-card__btn--ghost${canComplete ? '' : ' checkup-card__btn--wide'}`}
          role="button"
          aria-label={`查看${item.title}详情`}
          onClick={onDetail}
        >
          <EyeOutlined className="checkup-card__btn-icon" />
          <Text className="checkup-card__btn-text">查看详情</Text>
        </View>
      </View>
    </View>
  );
}
```

Expected: 检查卡片不再使用灰色日期块和单胶囊动作；与开药卡片一样有类型标签、关键时间、进度条和底部动作区。

- [ ] **Step 4: 替换检查卡片样式**

Replace `src/components/CheckupCard/index.scss` with:

```scss
@use '@/assets/styles/variables' as *;

.checkup-card {
  padding: 24px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(216, 235, 239, 0.92);
  box-shadow: 0 12px 28px rgba(16, 74, 91, 0.08);
  transition:
    transform $duration ease,
    box-shadow $duration ease;

  &:active {
    transform: scale(0.985);
  }

  &--danger {
    border-color: rgba(202, 78, 65, 0.22);
    box-shadow: 0 12px 28px rgba(202, 78, 65, 0.08);
  }

  &--warning {
    border-color: rgba(184, 108, 30, 0.2);
    box-shadow: 0 12px 28px rgba(184, 108, 30, 0.08);
  }

  &--success {
    border-color: rgba(31, 134, 87, 0.18);
    box-shadow: 0 12px 28px rgba(31, 134, 87, 0.07);
  }

  &--paused,
  &--done {
    opacity: 0.76;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__title-wrap {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__type-tag {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    height: 34px;
    padding: 0 12px;
    border-radius: $radius-pill;
    background: $primary-soft;
  }

  &__type-tag-text {
    color: $primary-deep;
    font-size: 20px;
    font-weight: 900;
    line-height: 1;
  }

  &__title {
    flex: 1;
    min-width: 0;
    color: $ink-strong;
    font-size: 32px;
    font-weight: 900;
    line-height: 1.3;
  }

  &__meta {
    display: block;
    margin-top: 6px;
    color: $muted;
    font-size: 24px;
    line-height: 1.65;

    &--accent {
      font-weight: 700;
    }

    &--danger {
      color: $danger;
    }

    &--warning {
      color: $warning;
    }

    &--success {
      color: $success;
    }

    &--paused,
    &--done {
      color: $violet;
    }
  }

  &__progress {
    margin-top: 18px;
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 18px;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 72px;
    padding: 0 18px;
    border-radius: 24px;
    box-sizing: border-box;

    &--wide {
      grid-column: 1 / -1;
    }

    &-icon {
      font-size: 28px;
      line-height: 1;
      display: flex;
      align-items: center;
    }

    &-text {
      font-size: 28px;
      font-weight: 900;
      line-height: 1;
    }

    &--danger {
      color: #fff;
      background: $danger;
    }

    &--success {
      color: #fff;
      background: $success;
    }

    &--warning {
      color: #fff;
      background: $warning;
    }

    &--ghost {
      color: $primary-deep;
      background: $primary-soft;
    }
  }
}
```

Expected: 样式不再包含 `date-row`、`date-block`、`footer`、`done` 等独立检查卡片结构；检查卡片与开药卡片在列表中的视觉节奏一致。

- [ ] **Step 5: 同步 CheckupCard 调用方**

Modify `src/pages/list/index.tsx` and `src/pages/checkups/index.tsx` so `CheckupCard` uses the explicit detail prop:

```tsx
<CheckupCard
  key={entry.listKey}
  item={entry.item}
  onDetail={() => openCheckupDetail(entry.id)}
  onComplete={() => openCompletion(entry.id)}
/>
```

For `src/pages/checkups/index.tsx`, keep the same local ids:

```tsx
<CheckupCard
  key={item.id}
  item={item}
  onDetail={() => openDetail(item.id)}
  onComplete={() => openCompletion(item.id)}
/>
```

Run:

```bash
rg -n "onClick=\\{\\(\\) => openCheckupDetail|onClick=\\{\\(\\) => openDetail" src/pages/list/index.tsx src/pages/checkups/index.tsx
```

Expected: 不再有 `CheckupCard` 调用使用 `onClick` 作为详情入口。

- [ ] **Step 6: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，错误应集中在 `CheckupCard` props 或调用方 prop 名称，修复后继续。

- [ ] **Step 7: 提交卡片视觉统一**

Run:

```bash
git add src/components/MedicineCard/index.tsx src/components/MedicineCard/index.scss src/components/CheckupCard/index.tsx src/components/CheckupCard/index.scss src/pages/list/index.tsx src/pages/checkups/index.tsx
git commit -m "style: unify reminder card layout"
```

Expected: 提交只包含开药/检查卡片视觉统一和必要调用方同步。

### Task 4: 提醒页升级为统一提醒中心

**Files:**

- Modify: `src/pages/list/index.tsx`
- Modify: `src/pages/list/index.scss`

- [ ] **Step 1: 替换提醒页导入和筛选类型**

Modify `src/pages/list/index.tsx` imports and local types:

```tsx
import { useMemo, useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import Taro, {
  usePullDownRefresh,
  useReachBottom,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';
import { Search } from '@taroify/icons';

import {
  CHECKUP_STATUS,
  REMINDER_STATUS,
  SHARE_IMAGE,
  SHARE_PATH
} from '@/constants';
import BottomSheet from '@/components/BottomSheet';
import CheckupCard from '@/components/CheckupCard';
import CheckupCompletionSheet from '@/components/CheckupCompletionSheet';
import CheckupComposer from '@/components/CheckupComposer';
import CheckupDetail from '@/components/CheckupDetail';
import CheckupRestartSheet from '@/components/CheckupRestartSheet';
import DoneDateSheet from '@/components/DoneDateSheet';
import FloatingAddReminder from '@/components/FloatingAddReminder';
import ListLoadStatus from '@/components/ListLoadStatus';
import MedicineCard from '@/components/MedicineCard';
import MedicineComposer from '@/components/MedicineComposer';
import ReminderDetail from '@/components/ReminderDetail';
import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';
import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { useDerivedList, useReminderActions } from '@/hooks/useReminders';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import {
  type UnifiedReminderItem,
  type UnifiedReminderStatus,
  type UnifiedReminderType,
  UNIFIED_STATUS_FILTERS,
  UNIFIED_TYPE_FILTERS,
  useUnifiedReminderCenter
} from '@/hooks/useUnifiedReminderCenter';
import { fetchCheckups } from '@/services/checkup';
import { fetchReminders } from '@/services/reminder';
import { checkupStore } from '@/store/checkupStore';
import { reminderStore } from '@/store/reminderStore';
import { withPageShare } from '@/utils/pageShare';

import './index.scss';

type MedicineSheetMode = 'form' | 'detail' | null;
type CheckupSheetMode = 'form' | 'detail' | null;
type PendingCheckupAction =
  | { type: 'completion'; id: string }
  | { type: 'restart'; id: string };
```

- [ ] **Step 2: 替换页面状态和数据来源**

Inside `ListPage`, replace the old `activeFilter`, `useReminderSheet()` block and `filteredItems` logic with explicit unified state:

```tsx
const [searchTerm, setSearchTerm] = useState('');
const [activeType, setActiveType] = useState<UnifiedReminderType>('all');
const [activeStatus, setActiveStatus] = useState<UnifiedReminderStatus>('all');
const [createOpen, setCreateOpen] = useState(false);
const [createKey, setCreateKey] = useState(0);
const [medicineSheetOpen, setMedicineSheetOpen] = useState(false);
const [medicineSheetMode, setMedicineSheetMode] =
  useState<MedicineSheetMode>(null);
const [activeMedicineId, setActiveMedicineId] = useState<string | undefined>();
const [medicineFormKey, setMedicineFormKey] = useState(0);
const [checkupSheetOpen, setCheckupSheetOpen] = useState(false);
const [checkupSheetMode, setCheckupSheetMode] =
  useState<CheckupSheetMode>(null);
const [activeCheckupId, setActiveCheckupId] = useState<string | undefined>();
const [checkupFormKey, setCheckupFormKey] = useState(0);
const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
const [completionId, setCompletionId] = useState<string | null>(null);
const [restartId, setRestartId] = useState<string | null>(null);
const [pendingCheckupAction, setPendingCheckupAction] =
  useState<PendingCheckupAction | null>(null);
useTabScrollToTop();

const allMedicines = useDerivedList();
const allCheckups = useDerivedCheckups();
const { filteredItems, counts, resetKey } = useUnifiedReminderCenter({
  type: activeType,
  status: activeStatus,
  searchTerm
});
const { markDone } = useReminderActions();
const { visibleItems, visibleCount, totalCount, hasMore, loadMore } =
  useIncrementalList(filteredItems, resetKey);
```

- [ ] **Step 3: 实现刷新、打开和关闭处理函数**

Add the following handlers inside `ListPage`:

```tsx
const refreshUnifiedReminders = async () => {
  try {
    const [nextMedicines, nextCheckups] = await Promise.all([
      fetchReminders(),
      fetchCheckups()
    ]);

    reminderStore.setState({ reminders: nextMedicines });
    checkupStore.setState({ checkups: nextCheckups });
  } catch {
    Taro.showToast({
      title: '刷新失败，请稍后重试',
      icon: 'none',
      duration: 1800
    });
  } finally {
    Taro.stopPullDownRefresh();
  }
};

const openCreate = () => {
  setCreateKey((key) => key + 1);
  setCreateOpen(true);
};

const closeCreate = () => {
  setCreateOpen(false);
};

const openMedicineDetail = (id: string) => {
  setActiveMedicineId(id);
  setMedicineSheetMode('detail');
  setMedicineSheetOpen(true);
};

const openMedicineEdit = (id: string) => {
  setActiveMedicineId(id);
  setMedicineSheetMode('form');
  setMedicineFormKey((key) => key + 1);
  setMedicineSheetOpen(true);
};

const closeMedicineSheet = () => {
  setMedicineSheetOpen(false);
};

const handleMedicineSheetExited = () => {
  setMedicineSheetMode(null);
  setActiveMedicineId(undefined);
};

const openCheckupDetail = (id: string) => {
  setActiveCheckupId(id);
  setCheckupSheetMode('detail');
  setCheckupSheetOpen(true);
};

const openCheckupEdit = (id: string) => {
  setActiveCheckupId(id);
  setCheckupSheetMode('form');
  setCheckupFormKey((key) => key + 1);
  setCheckupSheetOpen(true);
};

const closeCheckupSheet = () => {
  setCheckupSheetOpen(false);
};

const handleCheckupSheetExited = () => {
  const nextAction = pendingCheckupAction;

  setCheckupSheetMode(null);
  setActiveCheckupId(undefined);

  if (!nextAction) {
    return;
  }

  setPendingCheckupAction(null);

  if (nextAction.type === 'completion') {
    setCompletionId(nextAction.id);
    return;
  }

  setRestartId(nextAction.id);
};

const openCompletion = (id: string) => {
  if (checkupSheetOpen) {
    setPendingCheckupAction({ type: 'completion', id });
    closeCheckupSheet();
    return;
  }

  setCompletionId(id);
};

const openRestart = (id: string) => {
  if (checkupSheetOpen) {
    setPendingCheckupAction({ type: 'restart', id });
    closeCheckupSheet();
    return;
  }

  setRestartId(id);
};
```

- [ ] **Step 4: 保留已开药逻辑并改为使用 `allMedicines`**

Update `handleMarkDone` so it searches `allMedicines`:

```tsx
const handleMarkDone = (id: string) => {
  const target = allMedicines.find((item) => item.id === id);

  if (!target || target.status === REMINDER_STATUS.PAUSED) {
    return;
  }

  if (target.daysLeft < 0) {
    setDoneReminderId(id);
    return;
  }

  Taro.showModal({
    title: '确认已开药',
    content: `确认已完成「${target.name}」本次开药吗？系统会更新最近一盒日期并推算下一次提醒。`,
    confirmText: '确认',
    cancelText: '取消',
    confirmColor: '#157a66',
    success: async (result) => {
      if (!result.confirm) {
        return;
      }

      try {
        await markDone(id);
        Taro.showToast({
          title: `${target.name} 已进入下一轮周期`,
          icon: 'success',
          duration: 1500
        });
      } catch {
        Taro.showToast({
          title: '更新失败，请稍后重试',
          icon: 'none',
          duration: 1800
        });
      }
    }
  });
};
```

- [ ] **Step 5: 替换提醒页筛选 UI**

Replace the old single `.list-filters` block with:

```tsx
<View className="list-type-filters">
  {UNIFIED_TYPE_FILTERS.map(({ key, label }) => (
    <View
      key={key}
      className={`list-type-filter${
        activeType === key ? ' list-type-filter--active' : ''
      }`}
      role="button"
      aria-label={`${label} ${counts.type[key]}`}
      onClick={() => setActiveType(key)}
    >
      <Text className="list-type-filter__text">
        {label} {counts.type[key]}
      </Text>
    </View>
  ))}
</View>

<View className="list-filters">
  {UNIFIED_STATUS_FILTERS.map(({ key, label }) => (
    <View
      key={key}
      className={`list-filter${activeStatus === key ? ' list-filter--active' : ''}`}
      role="button"
      aria-label={`${label} ${counts.status[key]}`}
      onClick={() => setActiveStatus(key)}
    >
      <Text className="list-filter__text">
        {label} {counts.status[key]}
      </Text>
    </View>
  ))}
</View>
```

- [ ] **Step 6: 替换列表渲染**

Add this renderer helper before `return`:

```tsx
const renderUnifiedItem = (entry: UnifiedReminderItem) => {
  if (entry.type === 'medicine') {
    return (
      <MedicineCard
        key={`medicine-${entry.id}`}
        item={entry.item}
        showActions
        onDone={() => handleMarkDone(entry.id)}
        onDetail={() => openMedicineDetail(entry.id)}
      />
    );
  }

  return (
    <CheckupCard
      key={`checkup-${entry.id}`}
      item={entry.item}
      onDetail={() => openCheckupDetail(entry.id)}
      onComplete={() => openCompletion(entry.id)}
    />
  );
};
```

Replace the old `visibleItems.map((item) => <MedicineCard ... />)` with:

```tsx
{
  visibleItems.map(renderUnifiedItem);
}
```

- [ ] **Step 7: 更新空状态文案**

Add:

```tsx
const emptyText = searchTerm.trim()
  ? '没有符合条件的提醒'
  : activeType === 'checkup'
    ? '还没有检查提醒，点击下方 + 添加'
    : activeType === 'medicine'
      ? '还没有开药提醒，点击下方 + 添加'
      : '暂无提醒，点击下方 + 添加';
```

Use it in `.list-empty__text`:

```tsx
<Text className="list-empty__text">{emptyText}</Text>
```

- [ ] **Step 8: 接入统一新增和检查 Sheet**

Add the unified create, medicine edit/detail, checkup edit/detail, completion and restart sheets near the bottom of `return`:

```tsx
<FloatingAddReminder
  ariaLabel="新增提醒"
  hidden={
    createOpen ||
    medicineSheetOpen ||
    checkupSheetOpen ||
    doneTarget !== null ||
    completionTarget !== null ||
    restartTarget !== null
  }
  onClick={openCreate}
/>

<BottomSheet open={createOpen} title="新增提醒" onClose={closeCreate}>
  <UnifiedReminderComposer
    resetKey={createKey}
    onSuccess={closeCreate}
    onCancel={closeCreate}
  />
</BottomSheet>

<BottomSheet
  open={medicineSheetOpen}
  title={medicineSheetMode === 'detail' ? '提醒详情' : '编辑药品'}
  onClose={closeMedicineSheet}
  onAfterClose={handleMedicineSheetExited}
>
  {medicineSheetMode === 'detail' && activeMedicineId ? (
    <ReminderDetail
      reminderId={activeMedicineId}
      onClose={closeMedicineSheet}
      onEdit={openMedicineEdit}
    />
  ) : null}
  {medicineSheetMode === 'form' ? (
    <MedicineComposer
      key={medicineFormKey}
      medicineId={activeMedicineId}
      defaultReminderEnabled={true}
      onSuccess={closeMedicineSheet}
      onCancel={closeMedicineSheet}
    />
  ) : null}
</BottomSheet>

<BottomSheet
  open={checkupSheetOpen}
  title={checkupSheetMode === 'detail' ? '检查详情' : '编辑检查提醒'}
  onClose={closeCheckupSheet}
  onAfterClose={handleCheckupSheetExited}
>
  {checkupSheetMode === 'detail' && activeCheckupId ? (
    <CheckupDetail
      checkupId={activeCheckupId}
      onClose={closeCheckupSheet}
      onEdit={openCheckupEdit}
      onComplete={openCompletion}
      onRestart={openRestart}
    />
  ) : null}
  {checkupSheetMode === 'form' ? (
    <CheckupComposer
      key={checkupFormKey}
      checkupId={activeCheckupId}
      onSuccess={closeCheckupSheet}
      onCancel={closeCheckupSheet}
    />
  ) : null}
</BottomSheet>
```

Ensure `doneTarget`, `completionTarget`, and `restartTarget` are derived:

```tsx
const doneTarget =
  doneReminderId === null
    ? null
    : (allMedicines.find((item) => item.id === doneReminderId) ?? null);
const completionTarget = useMemo(
  () =>
    completionId === null
      ? null
      : (allCheckups.find((item) => item.id === completionId) ?? null),
  [allCheckups, completionId]
);
const restartTarget = useMemo(
  () =>
    restartId === null
      ? null
      : (allCheckups.find((item) => item.id === restartId) ?? null),
  [allCheckups, restartId]
);
```

- [ ] **Step 9: 更新提醒页生命周期**

Update refresh and reach-bottom hooks:

```tsx
usePullDownRefresh(() => {
  void refreshUnifiedReminders();
});

useReachBottom(() => {
  if (hasMore) {
    loadMore();
  }
});
```

- [ ] **Step 10: 增加提醒页样式**

Modify `src/pages/list/index.scss`:

```scss
.list-type-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: $spacing-3;
  padding: 6px;
  border-radius: 24px;
  border: 1px solid $line-soft;
  background: rgba(255, 255, 255, 0.72);
}

.list-type-filter {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;

  &__text {
    color: $muted;
    font-size: 22px;
    font-weight: 900;
    line-height: 1.25;
    white-space: nowrap;
  }

  &--active {
    background: $primary;

    .list-type-filter__text {
      color: #fff;
    }
  }
}
```

- [ ] **Step 11: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，错误应集中在 `src/pages/list/index.tsx` 的导入、状态或 props 上，修复后继续。

- [ ] **Step 12: 提交统一提醒中心页面**

Run:

```bash
git add src/pages/list/index.tsx src/pages/list/index.scss
git commit -m "feat: merge checkups into reminder center"
```

Expected: 提交包含提醒中心页面和样式。

### Task 5: 导航和首页入口收敛

**Files:**

- Modify: `src/app.config.ts`
- Modify: `src/pages/home/index.tsx`

- [ ] **Step 1: 从 TabBar 移除检查 Tab**

Modify `src/app.config.ts` so `tabBar.list` becomes:

```ts
list: [
  {
    pagePath: 'pages/home/index',
    text: '首页',
    iconPath: 'assets/tabbar/home.png',
    selectedIconPath: 'assets/tabbar/home-active.png'
  },
  {
    pagePath: 'pages/list/index',
    text: '提醒',
    iconPath: 'assets/tabbar/list.png',
    selectedIconPath: 'assets/tabbar/list-active.png'
  },
  {
    pagePath: 'pages/medicines/index',
    text: '药箱',
    iconPath: 'assets/tabbar/medicines.png',
    selectedIconPath: 'assets/tabbar/medicines-active.png'
  },
  {
    pagePath: 'pages/profile/index',
    text: '我的',
    iconPath: 'assets/tabbar/user.png',
    selectedIconPath: 'assets/tabbar/user-active.png'
  }
];
```

Keep `'pages/checkups/index'` in `pages` for compatibility during this change.

- [ ] **Step 2: 首页完整入口统一跳转提醒中心**

In `src/pages/home/index.tsx`, remove `handleViewCheckups` and replace the subhead action area with a single action:

```tsx
<View className="home-subhead__actions">
  <View className="home-subhead__action" onClick={handleViewAll}>
    <Text>全部提醒</Text>
  </View>
</View>
```

- [ ] **Step 3: 更新首页空状态文案**

Replace the empty hint block with:

```tsx
{
  !hasRecords ? (
    <>
      <Text className="home-empty__hint">点击右下角 + 新增提醒</Text>
      <Text className="home-empty__link" onClick={handleViewAll}>
        也可前往提醒页管理全部提醒
      </Text>
    </>
  ) : null;
}
```

- [ ] **Step 4: 搜索旧检查 Tab 跳转**

Run:

```bash
rg -n "switchTab\\(\\{ url: '/pages/checkups/index'|检查/复诊提醒可在「检查」页新增|<Text>检查</Text>" src
```

Expected: no output.

- [ ] **Step 5: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。

- [ ] **Step 6: 提交导航和首页入口收敛**

Run:

```bash
git add src/app.config.ts src/pages/home/index.tsx
git commit -m "feat: consolidate reminder navigation"
```

Expected: 提交只包含 TabBar 和首页入口修改。

### Task 6: 检查业务域保护回归

**Files:**

- Inspect: `src/store/checkupStore.ts`
- Inspect: `src/store/reminderStore.ts`
- Inspect: `src/hooks/useCheckups.ts`
- Inspect: `src/hooks/useReminders.ts`
- Inspect: `cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/checkupReminder/index.js`

- [ ] **Step 1: 确认检查提醒仍走独立 store**

Run:

```bash
rg -n "addCheckup|updateCheckup|completeCheckup|fetchCheckups|checkupReminder" src cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/checkupReminder
```

Expected: 检查新增、更新、完成和云函数仍引用 `checkupStore`、`services/checkup` 或 `checkupReminder`，没有迁移到 `reminderStore`。

- [ ] **Step 2: 确认药箱没有展示检查提醒**

Run:

```bash
rg -n "Checkup|useDerivedCheckups|checkups" src/pages/medicines src/components/MedicineInventoryCard
```

Expected: no output.

- [ ] **Step 3: 确认统一中心只是页面层适配**

Run:

```bash
rg -n "useUnifiedReminderCenter|UnifiedReminderItem|type: 'checkup'|type: 'medicine'" src/hooks src/pages/list src/components/UnifiedReminderComposer
```

Expected: 输出只来自 `useUnifiedReminderCenter.ts`、`pages/list/index.tsx` 或统一新增提醒组件，不出现 store 或 service 层合并。

- [ ] **Step 4: 提交保护性检查结果**

Run:

```bash
git status --short
```

Expected: 没有因本任务产生的新文件变更。若前面任务已提交，工作区应保持干净或只剩用户已有改动。

### Task 7: 文档同步

**Files:**

- Modify: `docs/1.产品设计.md`
- Modify: `docs/3.开发计划.md`

- [ ] **Step 1: 更新产品设计文档中的当前状态**

In `docs/1.产品设计.md`, update current implementation wording so it describes:

```md
当前小程序已从单一开药提醒扩展为「开药 + 药箱 + 检查/复诊提醒」的统一风险待办工具。产品叙事仍以「不要断药」为核心；检查/复诊提醒不再作为独立底部 Tab，而是并入「提醒」Tab 的统一提醒中心，作为长期治疗任务的一类提醒事项。
```

- [ ] **Step 2: 更新 Tab 与路线图描述**

In `docs/1.产品设计.md`, replace current Tab description with:

```md
当前底部 Tab 为：首页 / 提醒 / 药箱 / 我的。

「提醒」Tab 是统一提醒中心，合并展示开药提醒和检查/复诊提醒，并通过类型筛选区分全部、开药、检查。「药箱」Tab 只承担药品资料管理，不展示检查提醒。
```

- [ ] **Step 3: 更新开发计划状态**

In `docs/3.开发计划.md`, update the current project status table rows:

```md
| 页面路由 | 已实现 | 当前底部 Tab 为 首页 / 提醒 / 药箱 / 我的，检查/复诊提醒并入提醒中心 |
| 检查提醒 | 已实现 | 独立检查业务域、详情、完成/重新安排和云函数保留，用户入口并入提醒中心 |
```

- [ ] **Step 4: 搜索旧主路径描述**

Run:

```bash
rg -n "独立.?检查.?Tab|检查 Tab|前往「检查」|检查页新增|首页 / 提醒 / 药箱 / 检查 / 我的" docs/1.产品设计.md docs/3.开发计划.md
```

Expected: 输出只保留历史说明或变更背景；当前主路径不得再表达为独立检查 Tab。

- [ ] **Step 5: 提交文档同步**

Run:

```bash
git add docs/1.产品设计.md docs/3.开发计划.md
git commit -m "docs: update unified reminder center plan"
```

Expected: 提交只包含产品与开发计划文档。

### Task 8: 静态验证与构建验证

**Files:**

- Verify: whole repo

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。

- [ ] **Step 2: 运行微信小程序构建**

Run:

```bash
pnpm build:weapp
```

Expected: PASS，生成或更新 `dist/`。若 Taro/Rust 本地环境报已知原生崩溃，记录完整错误，并至少保留 Step 1 的 TypeScript 通过结果。

- [ ] **Step 3: 验证 OpenSpec change 仍有效**

Run:

```bash
openspec validate --changes --json
```

Expected: JSON 输出中 `merge-checkups-into-reminders` 没有 validation errors。

- [ ] **Step 4: 验证关键路径文本**

Run:

```bash
rg -n "merge-checkups-into-reminders|统一提醒中心|UnifiedReminderComposer|useUnifiedReminderCenter|MedicineCard|CheckupCard|卡片视觉|查看详情|新增提醒|检查提醒" openspec/changes/merge-checkups-into-reminders docs/superpowers/plans/2026-05-29-merge-checkups-into-reminders.md src
```

Expected: 输出覆盖 OpenSpec change、计划文件、新 hook、新组件、提醒中心页面和开药/检查卡片视觉一致性要求。

### Task 9: 手动小程序验收

**Files:**

- Manual: 微信开发者工具或本地 Taro weapp 预览

- [ ] **Step 1: 验证四 Tab 导航**

Manual:

```text
打开小程序首页，观察底部 TabBar。
```

Expected: 只显示「首页」「提醒」「药箱」「我的」，没有「检查」Tab。

- [ ] **Step 2: 验证统一提醒中心类型筛选**

Manual:

```text
进入「提醒」Tab，分别点击「全部」「开药」「检查」。
```

Expected: 全部显示开药和检查；开药只显示药品提醒；检查只显示检查/复诊提醒。

- [ ] **Step 3: 验证状态筛选**

Manual:

```text
在「提醒」Tab 分别点击「逾期今日」「7天内」「正常」「暂停」「已完成」。
```

Expected: 每个筛选只展示对应状态；「已完成」只展示已完成检查提醒。

- [ ] **Step 4: 验证混合列表卡片视觉一致性**

Manual:

```text
在「提醒」Tab 的「全部」筛选下同时查看一条开药提醒和一条检查提醒。
```

Expected: 两类卡片的容器圆角、标题层级、类型标签、风险状态位置、关键时间表达、进度条位置和底部动作区一致；开药主操作为「已开药」，检查主操作为「完成检查」，两者都有「查看详情」入口。

- [ ] **Step 5: 验证新增提醒表单内切换**

Manual:

```text
点击「提醒」Tab 右下角 +，在 Sheet 顶部切换「开药提醒」和「检查提醒」。
```

Expected: 不出现额外类型选择弹窗；默认展示开药表单；切换后展示检查表单；切回开药表单仍可继续填写。

- [ ] **Step 6: 验证编辑类型锁定**

Manual:

```text
从列表打开一条开药提醒详情并编辑，再打开一条检查提醒详情并编辑。
```

Expected: 开药编辑只展示开药表单；检查编辑只展示检查表单；编辑状态下不显示开药/检查类型切换。

- [ ] **Step 7: 验证检查闭环**

Manual:

```text
在统一提醒中心打开检查提醒，执行完成检查；对已完成检查执行重新安排。
```

Expected: 完成检查 Sheet 和重新安排 Sheet 都可用；保存后列表和首页风险状态同步刷新。

- [ ] **Step 8: 验证首页入口**

Manual:

```text
回到首页，查看优先待办标题右侧入口和无数据空状态。
```

Expected: 首页进入完整管理页时跳转「提醒」Tab；文案不再引导用户去独立「检查」Tab。

### Task 10: 最终收尾

**Files:**

- Verify: git status

- [ ] **Step 1: 查看最终工作区**

Run:

```bash
git status --short
```

Expected: 只剩执行者明确要保留的改动；没有意外生成文件被 stage。

- [ ] **Step 2: 汇总验证结果**

Prepare final implementation note with:

```text
- TypeScript check result
- weapp build result
- OpenSpec validation result
- Manual validation completed items
- Any runtime validation blocked reason
```

Expected: 交付说明明确区分已验证、未验证和被环境阻塞的项目。
