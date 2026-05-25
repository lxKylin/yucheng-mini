# Add List Refresh Incremental Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「提醒」「药箱」「检查」三个底部标签页增加下拉刷新和前端分批展示，默认展示 10 条，上拉每次追加 10 条。

**Architecture:** 保留现有 Zustand store、云端拉取、派生排序和筛选统计语义，只在渲染层控制可见列表项数量。新增一个共享增量列表 hook 和一个共享底部状态组件，三个页面分别接入 Taro 下拉刷新和触底加载。

**Tech Stack:** React 18、TypeScript 5.4、Taro 4.2、Zustand、Sass、微信小程序页面生命周期。

---

## 规范输入与审查依据

- 技术方案：`openspec/changes/add-list-refresh-incremental-rendering/design.md`
- 测试依据：当前仓库实际存在的是 `openspec/changes/add-list-refresh-incremental-rendering/specs/tab-list-loading/spec.md`，用户消息里的 `spec/` 目录不存在。
- 审查依据：`openspec/changes/add-list-refresh-incremental-rendering/process.md` 当前不存在；本计划使用 `design.md` 的「非目标」作为排除范围：不做云端分页、不改数据库/索引/云函数/后端接口、不改排序规则、不改首页风险流。
- 任务列表：`openspec/changes/add-list-refresh-incremental-rendering/tasks.md`

## 文件结构

- Create: `src/hooks/useIncrementalList.ts`
  - 负责首批数量、追加数量、可见列表切片、是否还有更多、筛选变化重置。
- Create: `src/components/ListLoadStatus/index.tsx`
  - 负责展示“已显示 X / Y 条，上拉查看更多”或“已显示全部 X 条”。
- Create: `src/components/ListLoadStatus/index.scss`
  - 负责底部状态样式，避免与悬浮新增按钮和底部 TabBar 冲突。
- Modify: `src/pages/list/index.config.ts`
  - 启用提醒页下拉刷新。
- Modify: `src/pages/medicines/index.config.ts`
  - 启用药箱页下拉刷新。
- Modify: `src/pages/checkups/index.config.ts`
  - 启用检查页下拉刷新。
- Modify: `src/pages/list/index.tsx`
  - 接入提醒页刷新、触底加载、增量渲染和底部状态。
- Modify: `src/pages/medicines/index.tsx`
  - 接入药箱页刷新、触底加载、增量渲染和底部状态。
- Modify: `src/pages/checkups/index.tsx`
  - 接入检查页刷新、触底加载、增量渲染和底部状态。
- No change: `src/store/reminderStore.ts`
  - 已有 `loadFromCloud()`，本次复用，不改 store 合约。
- No change: `src/store/checkupStore.ts`
  - 已有 `loadFromCloud()`，本次复用，不改 store 合约。

### Task 1: 共享增量列表 Hook

**Files:**
- Create: `src/hooks/useIncrementalList.ts`

- [ ] **Step 1: 写入共享 hook**

Create `src/hooks/useIncrementalList.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';

export const INCREMENTAL_LIST_INITIAL_COUNT = 10;
export const INCREMENTAL_LIST_STEP = 10;

interface IncrementalListSnapshot<T> {
  visibleItems: T[];
  totalCount: number;
  visibleCount: number;
  hasMore: boolean;
}

export function getIncrementalListSnapshot<T>(
  items: T[],
  requestedVisibleCount: number
): IncrementalListSnapshot<T> {
  const totalCount = items.length;
  const visibleCount = Math.min(
    Math.max(0, requestedVisibleCount),
    totalCount
  );

  return {
    visibleItems: items.slice(0, visibleCount),
    totalCount,
    visibleCount,
    hasMore: visibleCount < totalCount
  };
}

export function useIncrementalList<T>(items: T[], resetKey: string) {
  const [visibleLimit, setVisibleLimit] = useState(
    INCREMENTAL_LIST_INITIAL_COUNT
  );

  useEffect(() => {
    setVisibleLimit(INCREMENTAL_LIST_INITIAL_COUNT);
  }, [resetKey]);

  const snapshot = useMemo(
    () => getIncrementalListSnapshot(items, visibleLimit),
    [items, visibleLimit]
  );

  const loadMore = useCallback(() => {
    setVisibleLimit((current) =>
      Math.min(current + INCREMENTAL_LIST_STEP, items.length)
    );
  }, [items.length]);

  return {
    ...snapshot,
    loadMore
  };
}
```

- [ ] **Step 2: 运行类型检查，确认新 hook 没有类型错误**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本次新 hook 无关的既有错误。若出现 `useIncrementalList.ts` 相关错误，先修复再继续。

- [ ] **Step 3: 提交共享 hook**

Run:

```bash
git diff -- src/hooks/useIncrementalList.ts
git add src/hooks/useIncrementalList.ts
git commit -m "feat: add incremental list hook"
```

Expected: commit 只包含 `src/hooks/useIncrementalList.ts`。如果当前工作区有用户未提交改动，执行者必须只 stage 本步骤文件。

### Task 2: 共享底部状态组件

**Files:**
- Create: `src/components/ListLoadStatus/index.tsx`
- Create: `src/components/ListLoadStatus/index.scss`

- [ ] **Step 1: 创建底部状态组件**

Create `src/components/ListLoadStatus/index.tsx`:

```tsx
import { Text, View } from '@tarojs/components';

import './index.scss';

interface ListLoadStatusProps {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
}

export default function ListLoadStatus({
  visibleCount,
  totalCount,
  hasMore
}: ListLoadStatusProps) {
  if (totalCount === 0) {
    return null;
  }

  const text = hasMore
    ? `已显示 ${visibleCount} / ${totalCount} 条，上拉查看更多`
    : `已显示全部 ${totalCount} 条`;

  return (
    <View className="list-load-status" aria-label={text}>
      <Text className="list-load-status__text">{text}</Text>
    </View>
  );
}
```

- [ ] **Step 2: 创建底部状态样式**

Create `src/components/ListLoadStatus/index.scss`:

```scss
@use '@/assets/styles/variables' as *;

.list-load-status {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px 20px;
}

.list-load-status__text {
  color: $quiet;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
}
```

- [ ] **Step 3: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本次新增组件无关的既有错误。

- [ ] **Step 4: 提交底部状态组件**

Run:

```bash
git diff -- src/components/ListLoadStatus/index.tsx src/components/ListLoadStatus/index.scss
git add src/components/ListLoadStatus/index.tsx src/components/ListLoadStatus/index.scss
git commit -m "feat: add list load status"
```

Expected: commit 只包含共享底部状态组件。

### Task 3: 页面配置启用下拉刷新

**Files:**
- Modify: `src/pages/list/index.config.ts`
- Modify: `src/pages/medicines/index.config.ts`
- Modify: `src/pages/checkups/index.config.ts`

- [ ] **Step 1: 修改提醒页配置**

Replace `src/pages/list/index.config.ts` with:

```ts
export default definePageConfig({
  navigationBarTitleText: '提醒列表',
  navigationBarBackgroundColor: '#edf7f4',
  enableShareAppMessage: true,
  enableShareTimeline: true,
  enablePullDownRefresh: true
});
```

- [ ] **Step 2: 修改药箱页配置**

Replace `src/pages/medicines/index.config.ts` with:

```ts
export default definePageConfig({
  navigationBarTitleText: '药箱',
  navigationBarBackgroundColor: '#edf7f4',
  enableShareAppMessage: true,
  enableShareTimeline: true,
  enablePullDownRefresh: true
});
```

- [ ] **Step 3: 修改检查页配置**

Replace `src/pages/checkups/index.config.ts` with:

```ts
export default definePageConfig({
  navigationBarTitleText: '检查',
  navigationBarBackgroundColor: '#edf7f4',
  enableShareAppMessage: true,
  enableShareTimeline: true,
  enablePullDownRefresh: true
});
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与页面配置无关的既有错误。

- [ ] **Step 5: 提交页面配置**

Run:

```bash
git diff -- src/pages/list/index.config.ts src/pages/medicines/index.config.ts src/pages/checkups/index.config.ts
git add src/pages/list/index.config.ts src/pages/medicines/index.config.ts src/pages/checkups/index.config.ts
git commit -m "feat: enable pull refresh on list tabs"
```

Expected: commit 只包含三个页面配置。

### Task 4: 提醒页接入刷新、触底和增量渲染

**Files:**
- Modify: `src/pages/list/index.tsx`

- [ ] **Step 1: 更新 imports**

In `src/pages/list/index.tsx`, change imports near the top to include Taro hooks, shared component, hook, and store:

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

import ListLoadStatus from '@/components/ListLoadStatus';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { reminderStore } from '@/store/reminderStore';
```

Keep the existing imports for constants, sheets, cards, composer, `useDerivedList`, `useReminderActions`, types, `useTabScrollToTop`, and `useReminderSheet`.

- [ ] **Step 2: 增加刷新和增量状态**

After `filteredItems` is computed, add:

```tsx
  const listResetKey = `${activeFilter}:${searchTerm.trim()}`;
  const {
    visibleItems,
    visibleCount,
    totalCount,
    hasMore,
    loadMore
  } = useIncrementalList(filteredItems, listResetKey);

  const refreshReminders = async () => {
    try {
      await reminderStore.getState().loadFromCloud();
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

  usePullDownRefresh(() => {
    void refreshReminders();
  });

  useReachBottom(() => {
    if (hasMore) {
      loadMore();
    }
  });
```

- [ ] **Step 3: 替换渲染列表数据源并加入底部状态**

In the `list-content` block, replace `filteredItems.map` with `visibleItems.map`, and render `ListLoadStatus` after the mapped cards:

```tsx
      <View className="list-content">
        {filteredItems.length > 0 ? (
          <>
            {visibleItems.map((item) => (
              <MedicineCard
                key={item.id}
                item={item}
                showActions
                onDone={() => handleMarkDone(item.id)}
                onDetail={() => openDetail(item.id)}
              />
            ))}
            <ListLoadStatus
              visibleCount={visibleCount}
              totalCount={totalCount}
              hasMore={hasMore}
            />
          </>
        ) : (
          <View className="list-empty">
            <Text className="list-empty__icon">💊</Text>
            <Text className="list-empty__text">
              {searchTerm.trim()
                ? '没有符合条件的提醒'
                : '暂无提醒，点击下方 + 添加'}
            </Text>
          </View>
        )}
      </View>
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本页无关的既有错误。若出现 JSX fragment 或 hook import 错误，修正本页后重跑。

- [ ] **Step 5: 提交提醒页接入**

Run:

```bash
git diff -- src/pages/list/index.tsx
git add src/pages/list/index.tsx
git commit -m "feat: add incremental refresh to reminders tab"
```

Expected: commit 只包含提醒页接入。

### Task 5: 药箱页接入刷新、触底和增量渲染

**Files:**
- Modify: `src/pages/medicines/index.tsx`

- [ ] **Step 1: 更新 imports**

In `src/pages/medicines/index.tsx`, update imports to include Taro hooks, shared component, hook, and store:

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

import ListLoadStatus from '@/components/ListLoadStatus';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { reminderStore } from '@/store/reminderStore';
```

Keep the existing imports for constants, sheets, cards, composer, reminder hooks, `useTabScrollToTop`, and types.

- [ ] **Step 2: 增加刷新和增量状态**

After `filteredMedicines` is computed, add:

```tsx
  const listResetKey = `${activeFilter}:${searchTerm.trim()}`;
  const {
    visibleItems,
    visibleCount,
    totalCount,
    hasMore,
    loadMore
  } = useIncrementalList(filteredMedicines, listResetKey);

  const refreshMedicines = async () => {
    try {
      await reminderStore.getState().loadFromCloud();
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

  usePullDownRefresh(() => {
    void refreshMedicines();
  });

  useReachBottom(() => {
    if (hasMore) {
      loadMore();
    }
  });
```

- [ ] **Step 3: 替换渲染列表数据源并加入底部状态**

In the `medicines-content` block, replace `filteredMedicines.map` with `visibleItems.map`, and render `ListLoadStatus` after the mapped cards:

```tsx
      <View className="medicines-content">
        {filteredMedicines.length > 0 ? (
          <>
            {visibleItems.map((medicine) => (
              <MedicineInventoryCard
                key={medicine.id}
                medicine={medicine}
                onClick={() => openEdit(medicine.id)}
              />
            ))}
            <ListLoadStatus
              visibleCount={visibleCount}
              totalCount={totalCount}
              hasMore={hasMore}
            />
          </>
        ) : (
          <View className="medicines-empty">
            <Text className="medicines-empty__title">{emptyTitle}</Text>
            <Text className="medicines-empty__desc">{emptyDesc}</Text>
          </View>
        )}
      </View>
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本页无关的既有错误。

- [ ] **Step 5: 提交药箱页接入**

Run:

```bash
git diff -- src/pages/medicines/index.tsx
git add src/pages/medicines/index.tsx
git commit -m "feat: add incremental refresh to medicines tab"
```

Expected: commit 只包含药箱页接入。

### Task 6: 检查页接入刷新、触底和增量渲染

**Files:**
- Modify: `src/pages/checkups/index.tsx`

- [ ] **Step 1: 更新 imports**

In `src/pages/checkups/index.tsx`, update imports to include Taro hooks, shared component, hook, and stores:

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

import ListLoadStatus from '@/components/ListLoadStatus';
import { useIncrementalList } from '@/hooks/useIncrementalList';
import { checkupStore } from '@/store/checkupStore';
import { reminderStore } from '@/store/reminderStore';
```

Keep the existing imports for constants, sheets, cards, composer, `useDerivedCheckups`, `useTabScrollToTop`, and types.

- [ ] **Step 2: 增加刷新和增量状态**

After `filteredCheckups` is computed, add:

```tsx
  const listResetKey = `${activeStatus}:${activeType}:${searchTerm.trim()}`;
  const {
    visibleItems,
    visibleCount,
    totalCount,
    hasMore,
    loadMore
  } = useIncrementalList(filteredCheckups, listResetKey);

  const refreshCheckups = async () => {
    try {
      await Promise.all([
        checkupStore.getState().loadFromCloud(),
        reminderStore.getState().loadFromCloud()
      ]);
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

  usePullDownRefresh(() => {
    void refreshCheckups();
  });

  useReachBottom(() => {
    if (hasMore) {
      loadMore();
    }
  });
```

- [ ] **Step 3: 替换渲染列表数据源并加入底部状态**

In the `checkups-content` block, replace `filteredCheckups.map` with `visibleItems.map`, and render `ListLoadStatus` after the mapped cards:

```tsx
      <View className="checkups-content">
        {filteredCheckups.length > 0 ? (
          <>
            {visibleItems.map((item) => (
              <CheckupCard
                key={item.id}
                item={item}
                onClick={() => openDetail(item.id)}
                onComplete={() => openCompletion(item.id)}
              />
            ))}
            <ListLoadStatus
              visibleCount={visibleCount}
              totalCount={totalCount}
              hasMore={hasMore}
            />
          </>
        ) : (
          <View className="checkups-empty">
            <Text className="checkups-empty__title">
              {checkups.length === 0 ? '还没有检查提醒' : '当前筛选没有结果'}
            </Text>
            <Text className="checkups-empty__desc">
              {checkups.length === 0
                ? '新增复诊或化验提醒后，这里会按紧急程度自动排序。'
                : '换个关键词，或切换筛选查看其他检查任务。'}
            </Text>
          </View>
        )}
      </View>
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS，或只暴露与本页无关的既有错误。

- [ ] **Step 5: 提交检查页接入**

Run:

```bash
git diff -- src/pages/checkups/index.tsx
git add src/pages/checkups/index.tsx
git commit -m "feat: add incremental refresh to checkups tab"
```

Expected: commit 只包含检查页接入。

### Task 7: 场景验收与 OpenSpec 验证

**Files:**
- Read: `openspec/changes/add-list-refresh-incremental-rendering/specs/tab-list-loading/spec.md`
- Read: `openspec/changes/add-list-refresh-incremental-rendering/design.md`

- [ ] **Step 1: 运行 OpenSpec change 校验**

Run:

```bash
openspec validate --changes --json
```

Expected:

```json
{
  "summary": {
    "totals": {
      "failed": 0
    }
  }
}
```

- [ ] **Step 2: 运行 TypeScript 校验**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，输出中不应包含本次新增或修改文件的类型错误。

- [ ] **Step 3: 尝试小程序构建**

Run:

```bash
pnpm run build:weapp
```

Expected: PASS。如果本机继续出现此前已知的 `system-configuration-0.5.1` / `Attempted to create a NULL object.` 环境问题，记录为环境阻塞，不把它伪装成本次代码通过。

- [ ] **Step 4: 手动验收提醒页场景**

在微信开发者工具或可运行的小程序环境中准备 11 条以上开药提醒，验证：

```text
1. 打开「提醒」页，首屏只看到 10 张 MedicineCard。
2. 底部显示“已显示 10 / N 条，上拉查看更多”。
3. 上拉触底后追加最多 10 条，不发起新的云端分页请求。
4. 切换「逾期·今日」「7天内」「正常」「暂停」后，结果回到首批 10 条以内。
5. 下拉刷新成功后列表、筛选数量、底部状态更新。
6. 模拟刷新失败时停止刷新动画，并展示“刷新失败，请稍后重试”。
```

- [ ] **Step 5: 手动验收药箱页场景**

准备 11 条以上药箱记录，验证：

```text
1. 打开「药箱」页，首屏只看到 10 张 MedicineInventoryCard。
2. 底部显示“已显示 10 / N 条，上拉查看更多”。
3. 上拉触底后追加最多 10 条，不发起新的云端分页请求。
4. 切换「已开提醒」「未开提醒」后，结果回到首批 10 条以内。
5. 下拉刷新成功后药箱列表、筛选数量、底部状态更新。
6. 空结果时保留原有空态，不显示加载更多入口。
```

- [ ] **Step 6: 手动验收检查页场景**

准备 11 条以上检查提醒，验证：

```text
1. 打开「检查」页，首屏只看到 10 张 CheckupCard。
2. 底部显示“已显示 10 / N 条，上拉查看更多”。
3. 上拉触底后追加最多 10 条，不发起新的云端分页请求。
4. 切换状态筛选或类型筛选后，结果回到首批 10 条以内。
5. 下拉刷新成功后检查列表、筛选数量、关联药品名称、底部状态更新。
6. 空结果时保留原有空态，不显示加载更多入口。
```

- [ ] **Step 7: 审查排除范围**

Run:

```bash
git diff -- src/services src/store cloudfunctions src/hooks/useHomeRiskFeed.ts src/utils/dateUtils.ts src/utils/checkupUtils.ts
```

Expected:

```text
无 diff，或只有执行者明确解释且与本 change 直接相关的 diff。
```

本 change 不应修改云端分页、数据库结构、云函数、首页风险流、提醒/药箱/检查既有排序函数。

- [ ] **Step 8: 最终提交**

Run:

```bash
git status --short
git add src/hooks/useIncrementalList.ts \
  src/components/ListLoadStatus/index.tsx \
  src/components/ListLoadStatus/index.scss \
  src/pages/list/index.config.ts \
  src/pages/medicines/index.config.ts \
  src/pages/checkups/index.config.ts \
  src/pages/list/index.tsx \
  src/pages/medicines/index.tsx \
  src/pages/checkups/index.tsx
git commit -m "feat: incrementally render list tabs"
```

Expected: commit 只包含本计划列出的实现文件。不要 stage 用户已有的 `src/store/reminderStore.ts`、`src/store/checkupStore.ts`、`src/utils/commonUtils.ts` 或其他无关文件。

## 自检

- Spec 覆盖：
  - 管理标签页下拉刷新：Task 3、Task 4、Task 5、Task 6、Task 7 覆盖。
  - 管理标签页首批展示数量：Task 1、Task 2、Task 4、Task 5、Task 6、Task 7 覆盖。
  - 上拉追加展示：Task 1、Task 4、Task 5、Task 6、Task 7 覆盖。
  - 搜索和筛选重置展示数量：Task 1、Task 4、Task 5、Task 6、Task 7 覆盖。
  - 保持现有排序和统计语义：Task 4、Task 5、Task 6、Task 7 覆盖。
- 占位符扫描：没有未填写内容、延后实现提示或跨任务省略说明。
- 类型一致性：共享 hook 返回 `visibleItems`、`visibleCount`、`totalCount`、`hasMore`、`loadMore`；三页都使用相同属性名。
- 排除范围：计划不改云服务、不改 store 合约、不改派生排序、不改首页风险流。
