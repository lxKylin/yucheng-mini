# Change TabBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页/提醒页页面级新增提醒 FAB 收敛为自定义 TabBar 中央全局 `+`，点击后直接打开现有“新增提醒” Sheet，默认开药提醒，不出现开药/检查前置选择弹窗。

**Architecture:** 继续保留首页、提醒、药箱、我的四个主 Tab，`src/app.config.ts` 只切换到自定义 tabBar。新增一个轻量 `zustand/vanilla` 协调层，让 `src/custom-tab-bar/index.tsx` 触发全局新增提醒意图，再由当前可见主 Tab 页面挂载的 `GlobalReminderComposerHost` 在页面上下文中打开 `BottomSheet + UnifiedReminderComposer`。药箱页新增药品入口保持页面内部行为，中央 `+` 始终是新增提醒。

**Tech Stack:** React 18、TypeScript 5.4、Taro 4.2、Zustand vanilla store、taroify Popup、Sass、微信小程序 custom tabBar。

---

## 规范输入与审查依据

- Change: `change-tabbar`
- Proposal: `openspec/changes/change-tabbar/proposal.md`
- Design: `openspec/changes/change-tabbar/design.md`
- Spec: `openspec/changes/change-tabbar/specs/central-tabbar-reminder-action/spec.md`
- Task source: `openspec/changes/change-tabbar/tasks.md`
- 当前源码证据：
  - `src/app.config.ts` 当前 `tabBar.custom` 为 `false`，已有四个主 Tab：首页、提醒、药箱、我的。
  - `src/pages/home/index.tsx` 当前导入并渲染 `FloatingAddReminder`，点击 `openCreate(true)` 后打开 `BottomSheet + UnifiedReminderComposer`。
  - `src/pages/list/index.tsx` 当前导入并渲染 `FloatingAddReminder`，点击后打开本页本地 `createOpen` 管理的“新增提醒” Sheet。
  - `src/pages/medicines/index.tsx` 当前的 `FloatingAddReminder` 是药箱页局部“新增药品”入口，不能被中央 `+` 替代。
  - `src/pages/profile/index.tsx` 当前没有新增提醒入口，但需要挂载全局新增提醒 Host 以响应中央 `+`。
  - `src/components/UnifiedReminderComposer/index.tsx` 已支持 `defaultType = 'medicine'`，并在表单内切换“开药提醒 / 检查提醒”。
  - `src/components/BottomSheet/index.tsx` 会在打开时调用 `Taro.hideTabBar()`，但自定义 TabBar 场景还需要共享 store 控制中央按钮隐藏或禁用。
  - 现有 store 模式使用 `zustand/vanilla`，hooks 通过 `useSyncExternalStore` 订阅，例如 `src/store/healthStatusStore.ts` 和 `src/hooks/useHealthStatus.ts`。

## 文件结构

- Create: `src/constants/tabBar.ts`
  - 集中维护四个主 Tab 的 key、pagePath、text、iconPath、selectedIconPath。
- Create: `src/store/globalReminderComposerStore.ts`
  - 管理当前可见主 Tab、全局新增提醒打开请求、Sheet 打开状态。
- Create: `src/hooks/useGlobalReminderComposer.ts`
  - 用 `useSyncExternalStore` 暴露 store 状态和 actions，供页面 Host 与自定义 TabBar 使用。
- Create: `src/components/GlobalReminderComposerHost/index.tsx`
  - 当前主 Tab 页面内的新增提醒宿主，渲染 `BottomSheet + UnifiedReminderComposer`。
- Create: `src/custom-tab-bar/index.tsx`
  - Taro 自定义 TabBar 入口，渲染四个主 Tab 和中央 `+`。
- Create: `src/custom-tab-bar/index.scss`
  - 自定义 TabBar 样式、中央按钮、安全区、选中态。
- Modify: `src/app.config.ts`
  - 将 `tabBar.custom` 改为 `true`，Tab 列表继续使用四个主 Tab。
- Modify: `src/pages/home/index.tsx`
  - 挂载 `GlobalReminderComposerHost`，移除页面级新增提醒 FAB 和本地新增提醒 Sheet，更新空状态文案。
- Modify: `src/pages/list/index.tsx`
  - 挂载 `GlobalReminderComposerHost`，移除页面级新增提醒 FAB 和本地新增提醒 Sheet。
- Modify: `src/pages/medicines/index.tsx`
  - 挂载 `GlobalReminderComposerHost`，保留药箱页内部 `FloatingAddReminder` 新增药品入口。
- Modify: `src/pages/profile/index.tsx`
  - 挂载 `GlobalReminderComposerHost`。
- Modify: `src/pages/home/index.scss`
  - 确认底部留白与空状态样式不被自定义 TabBar 遮挡。
- Modify: `src/pages/list/index.scss`
  - 确认提醒列表底部操作无遮挡。
- Modify: `src/pages/medicines/index.scss`
  - 确认药箱局部新增药品按钮仍有足够底部留白。
- Modify: `src/pages/profile/index.scss`
  - 增加或确认个人页底部安全区留白。
- No change: `src/components/UnifiedReminderComposer/index.tsx`
  - 已符合默认开药提醒、表单内切换检查提醒、不加前置弹窗的要求。
- No change: `src/store/reminderStore.ts`
  - 开药提醒数据域保持独立。
- No change: `src/store/checkupStore.ts`
  - 检查提醒数据域保持独立。

### Task 1: 自定义 TabBar 配置与 app.config

**Files:**

- Create: `src/constants/tabBar.ts`
- Modify: `src/app.config.ts`

- [ ] **Step 1: 新增四 Tab 集中配置**

Create `src/constants/tabBar.ts`:

```ts
export type AppTabKey = 'home' | 'list' | 'medicines' | 'profile';

export interface AppTabBarItem {
  key: AppTabKey;
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
}

export const APP_TAB_BAR_ITEMS: AppTabBarItem[] = [
  {
    key: 'home',
    pagePath: 'pages/home/index',
    text: '首页',
    iconPath: 'assets/tabbar/home.png',
    selectedIconPath: 'assets/tabbar/home-active.png'
  },
  {
    key: 'list',
    pagePath: 'pages/list/index',
    text: '提醒',
    iconPath: 'assets/tabbar/list.png',
    selectedIconPath: 'assets/tabbar/list-active.png'
  },
  {
    key: 'medicines',
    pagePath: 'pages/medicines/index',
    text: '药箱',
    iconPath: 'assets/tabbar/medicines.png',
    selectedIconPath: 'assets/tabbar/medicines-active.png'
  },
  {
    key: 'profile',
    pagePath: 'pages/profile/index',
    text: '我的',
    iconPath: 'assets/tabbar/user.png',
    selectedIconPath: 'assets/tabbar/user-active.png'
  }
];

export function normalizeTabPath(path: string) {
  return path.replace(/^\//, '');
}

export function findTabByPath(path: string) {
  const normalizedPath = normalizeTabPath(path);
  return APP_TAB_BAR_ITEMS.find((item) => item.pagePath === normalizedPath);
}
```

- [ ] **Step 2: 启用自定义 tabBar**

Modify `src/app.config.ts` so the `tabBar` block keeps the same four items and changes `custom` to `true`:

```ts
  tabBar: {
    custom: true,
    color: '#8aa0a7',
    selectedColor: '#157a66',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
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
    ]
  }
```

- [ ] **Step 3: 验证配置文件类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，错误应集中在新增 `tabBar.ts` 导出或 `app.config.ts` 配置语法，修复后继续。

- [ ] **Step 4: 提交配置基础变更**

Run:

```bash
git add src/constants/tabBar.ts src/app.config.ts
git commit -m "feat: configure custom tabbar entries"
```

Expected: commit 成功。

### Task 2: 全局新增提醒协调层

**Files:**

- Create: `src/store/globalReminderComposerStore.ts`
- Create: `src/hooks/useGlobalReminderComposer.ts`

- [ ] **Step 1: 新增全局新增提醒 store**

Create `src/store/globalReminderComposerStore.ts`:

```ts
import { createStore } from 'zustand/vanilla';

interface GlobalReminderComposerStore {
  activePagePath: string;
  openRequestKey: number;
  composerOpen: boolean;
  setActivePage: (pagePath: string) => void;
  requestOpen: () => void;
  setComposerOpen: (open: boolean) => void;
  closeComposer: () => void;
}

export const globalReminderComposerStore =
  createStore<GlobalReminderComposerStore>((set) => ({
    activePagePath: '',
    openRequestKey: 0,
    composerOpen: false,
    setActivePage(pagePath) {
      set({ activePagePath: pagePath });
    },
    requestOpen() {
      set((state) => ({
        openRequestKey: state.openRequestKey + 1
      }));
    },
    setComposerOpen(open) {
      set({ composerOpen: open });
    },
    closeComposer() {
      set({ composerOpen: false });
    }
  }));
```

- [ ] **Step 2: 新增订阅 hook 和 actions**

Create `src/hooks/useGlobalReminderComposer.ts`:

```ts
import { useMemo, useSyncExternalStore } from 'react';

import { globalReminderComposerStore } from '@/store/globalReminderComposerStore';

function useGlobalReminderComposerStore() {
  return useSyncExternalStore(
    globalReminderComposerStore.subscribe,
    globalReminderComposerStore.getState,
    globalReminderComposerStore.getInitialState
  );
}

export function useGlobalReminderComposerState() {
  return useGlobalReminderComposerStore();
}

export function useGlobalReminderComposerActions() {
  const state = useGlobalReminderComposerStore();

  return useMemo(
    () => ({
      setActivePage: state.setActivePage,
      requestOpen: state.requestOpen,
      setComposerOpen: state.setComposerOpen,
      closeComposer: state.closeComposer
    }),
    [state]
  );
}
```

- [ ] **Step 3: 验证全局协调层类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若失败，错误应集中在 `zustand/vanilla` 类型或 hook 导出名称，按现有 `src/hooks/useHealthStatus.ts` 模式修复。

- [ ] **Step 4: 提交协调层**

Run:

```bash
git add src/store/globalReminderComposerStore.ts src/hooks/useGlobalReminderComposer.ts
git commit -m "feat: add global reminder composer coordinator"
```

Expected: commit 成功。

### Task 3: 新增提醒 Host

**Files:**

- Create: `src/components/GlobalReminderComposerHost/index.tsx`

- [ ] **Step 1: 实现当前页面内的新增提醒宿主**

Create `src/components/GlobalReminderComposerHost/index.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useDidHide, useDidShow } from '@tarojs/taro';

import BottomSheet from '@/components/BottomSheet';
import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';
import {
  useGlobalReminderComposerActions,
  useGlobalReminderComposerState
} from '@/hooks/useGlobalReminderComposer';
import { normalizeTabPath } from '@/constants/tabBar';

interface GlobalReminderComposerHostProps {
  pagePath: string;
}

export default function GlobalReminderComposerHost({
  pagePath
}: GlobalReminderComposerHostProps) {
  const normalizedPagePath = normalizeTabPath(pagePath);
  const { activePagePath, openRequestKey } = useGlobalReminderComposerState();
  const { setActivePage, setComposerOpen, closeComposer } =
    useGlobalReminderComposerActions();
  const handledRequestKeyRef = useRef(openRequestKey);
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useDidShow(() => {
    setActivePage(normalizedPagePath);
  });

  useDidHide(() => {
    if (open) {
      setOpen(false);
      closeComposer();
    }
  });

  useEffect(() => {
    if (openRequestKey === handledRequestKeyRef.current) {
      return;
    }

    handledRequestKeyRef.current = openRequestKey;

    if (activePagePath !== normalizedPagePath) {
      return;
    }

    setResetKey((value) => value + 1);
    setOpen(true);
    setComposerOpen(true);
  }, [
    activePagePath,
    normalizedPagePath,
    openRequestKey,
    setComposerOpen
  ]);

  const handleClose = () => {
    setOpen(false);
    closeComposer();
  };

  return (
    <BottomSheet open={open} title="新增提醒" onClose={handleClose}>
      <UnifiedReminderComposer
        resetKey={resetKey}
        onSuccess={handleClose}
        onCancel={handleClose}
      />
    </BottomSheet>
  );
}
```

- [ ] **Step 2: 验证 Host 类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若 `useDidShow` / `useDidHide` 类型报错，按项目当前 `@tarojs/taro` hooks 导入方式修正导入。

- [ ] **Step 3: 提交 Host**

Run:

```bash
git add src/components/GlobalReminderComposerHost/index.tsx
git commit -m "feat: add global reminder composer host"
```

Expected: commit 成功。

### Task 4: 自定义 TabBar 组件与样式

**Files:**

- Create: `src/custom-tab-bar/index.tsx`
- Create: `src/custom-tab-bar/index.scss`

- [ ] **Step 1: 实现自定义 TabBar 组件**

Create `src/custom-tab-bar/index.tsx`:

```tsx
import { useMemo } from 'react';
import { Image, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import {
  APP_TAB_BAR_ITEMS,
  findTabByPath,
  normalizeTabPath
} from '@/constants/tabBar';
import {
  useGlobalReminderComposerActions,
  useGlobalReminderComposerState
} from '@/hooks/useGlobalReminderComposer';

import './index.scss';

function getCurrentPagePath() {
  const pages = Taro.getCurrentPages();
  const currentPage = pages[pages.length - 1];
  return normalizeTabPath(currentPage?.route ?? APP_TAB_BAR_ITEMS[0].pagePath);
}

export default function CustomTabBar() {
  const { activePagePath, composerOpen } = useGlobalReminderComposerState();
  const { setActivePage, requestOpen } = useGlobalReminderComposerActions();

  useDidShow(() => {
    setActivePage(getCurrentPagePath());
  });

  const currentPath = useMemo(
    () => activePagePath || getCurrentPagePath(),
    [activePagePath]
  );

  const handleSwitchTab = (pagePath: string) => {
    const normalizedPath = normalizeTabPath(pagePath);
    setActivePage(normalizedPath);
    void Taro.switchTab({ url: `/${normalizedPath}` });
  };

  const handleCreate = () => {
    if (composerOpen) {
      return;
    }

    setActivePage(getCurrentPagePath());
    requestOpen();
  };

  return (
    <View className="custom-tabbar">
      <View className="custom-tabbar__bar">
        {APP_TAB_BAR_ITEMS.map((item, index) => {
          const selected = findTabByPath(currentPath)?.key === item.key;

          return (
            <View
              key={item.key}
              className={`custom-tabbar__item${selected ? ' custom-tabbar__item--active' : ''}${index === 2 ? ' custom-tabbar__item--after-action' : ''}`}
              role="button"
              aria-label={`切换到${item.text}`}
              aria-pressed={selected}
              onClick={() => handleSwitchTab(item.pagePath)}
            >
              <Image
                className="custom-tabbar__icon"
                src={selected ? item.selectedIconPath : item.iconPath}
                mode="aspectFit"
              />
              <Text className="custom-tabbar__text">{item.text}</Text>
            </View>
          );
        })}

        {!composerOpen ? (
          <View
            className="custom-tabbar__action"
            role="button"
            aria-label="新增提醒"
            onClick={handleCreate}
          >
            <Text className="custom-tabbar__action-icon">+</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 实现自定义 TabBar 样式**

Create `src/custom-tab-bar/index.scss`:

```scss
@use '@/assets/styles/variables' as *;

.custom-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid $line-soft;
  box-shadow: 0 -12px 30px rgba(16, 59, 50, 0.08);

  &__bar {
    position: relative;
    min-height: 112px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr)) 120px repeat(2, minmax(0, 1fr));
    align-items: center;
    padding: 0 10px;
  }

  &__item {
    min-width: 0;
    min-height: 92px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: $quiet;
  }

  &__item--after-action {
    grid-column: 4;
  }

  &__item--active {
    color: $primary;
  }

  &__icon {
    width: 40px;
    height: 40px;
    display: block;
  }

  &__text {
    display: block;
    font-size: 20px;
    font-weight: 800;
    line-height: 1.2;
  }

  &__action {
    position: absolute;
    left: 50%;
    top: -30px;
    width: 92px;
    height: 92px;
    margin-left: -46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary, $primary-deep);
    box-shadow: 0 18px 34px rgba(12, 91, 75, 0.3);
    color: #fff;
  }

  &__action-icon {
    display: block;
    color: #fff;
    font-size: 38px;
    font-weight: 300;
    line-height: 1;
  }
}
```

- [ ] **Step 3: 验证 TabBar 类型与样式引用**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若 `Taro.getCurrentPages()` 类型不可用，改用全局 `getCurrentPages()` 并加最小类型声明。

- [ ] **Step 4: 提交自定义 TabBar**

Run:

```bash
git add src/custom-tab-bar/index.tsx src/custom-tab-bar/index.scss
git commit -m "feat: add centered custom tabbar action"
```

Expected: commit 成功。

### Task 5: 四个主 Tab 页面接入 Host

**Files:**

- Modify: `src/pages/home/index.tsx`
- Modify: `src/pages/list/index.tsx`
- Modify: `src/pages/medicines/index.tsx`
- Modify: `src/pages/profile/index.tsx`

- [ ] **Step 1: 首页接入 Host 并移除全局新增 FAB**

Modify `src/pages/home/index.tsx`:

```tsx
// Remove these imports:
// import FloatingAddReminder from '@/components/FloatingAddReminder';
// import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';

// Add this import near other component imports:
import GlobalReminderComposerHost from '@/components/GlobalReminderComposerHost';
```

Remove the `<FloatingAddReminder ... onClick={() => openCreate(true)} />` block and remove the create-mode branch inside the existing `BottomSheet`:

```tsx
        {sheetMode === 'form' && !editReminderId ? (
          <UnifiedReminderComposer
            resetKey={formKey}
            onSuccess={handleFormSuccess}
            onCancel={closeSheet}
          />
        ) : null}
```

Keep medicine edit/detail and checkup sheets unchanged. Add Host before the final closing root `</View>`:

```tsx
      <GlobalReminderComposerHost pagePath="pages/home/index" />
```

Change the empty hint text:

```tsx
<Text className="home-empty__hint">点击底部 + 新增提醒</Text>
```

- [ ] **Step 2: 提醒页接入 Host 并移除本地新增 Sheet**

Modify `src/pages/list/index.tsx`:

```tsx
// Remove these imports:
// import FloatingAddReminder from '@/components/FloatingAddReminder';
// import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';

// Add this import near other component imports:
import GlobalReminderComposerHost from '@/components/GlobalReminderComposerHost';
```

Remove these local states and functions:

```tsx
const [createOpen, setCreateOpen] = useState(false);
const [createKey, setCreateKey] = useState(0);

const openCreate = () => {
  setCreateKey((key) => key + 1);
  setCreateOpen(true);
};

const closeCreate = () => {
  setCreateOpen(false);
};
```

Remove the `<FloatingAddReminder ... />` block and the create `BottomSheet` block:

```tsx
      <BottomSheet open={createOpen} title="新增提醒" onClose={closeCreate}>
        <UnifiedReminderComposer
          resetKey={createKey}
          onSuccess={closeCreate}
          onCancel={closeCreate}
        />
      </BottomSheet>
```

Add Host near the other bottom-level sheets:

```tsx
      <GlobalReminderComposerHost pagePath="pages/list/index" />
```

- [ ] **Step 3: 药箱页挂载 Host 但保留新增药品 FAB**

Modify `src/pages/medicines/index.tsx`:

```tsx
import GlobalReminderComposerHost from '@/components/GlobalReminderComposerHost';
```

Keep the existing drug-management FAB unchanged:

```tsx
      <FloatingAddReminder
        ariaLabel="新增药品"
        hidden={sheetActive}
        onClick={() => openCreate(false)}
      />
```

Add Host near the bottom of the page root:

```tsx
      <GlobalReminderComposerHost pagePath="pages/medicines/index" />
```

- [ ] **Step 4: 我的页挂载 Host**

Modify `src/pages/profile/index.tsx`:

```tsx
import GlobalReminderComposerHost from '@/components/GlobalReminderComposerHost';
```

Add Host near the bottom of the page root, outside existing settings sheets:

```tsx
      <GlobalReminderComposerHost pagePath="pages/profile/index" />
```

- [ ] **Step 5: 验证页面接入类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。若出现未使用变量，删除首页/list 页中仅为旧新增 Sheet 服务的 import、state 或函数。

- [ ] **Step 6: 提交页面接入**

Run:

```bash
git add src/pages/home/index.tsx src/pages/list/index.tsx src/pages/medicines/index.tsx src/pages/profile/index.tsx
git commit -m "feat: route tabbar create action to pages"
```

Expected: commit 成功。

### Task 6: 底部布局与遮挡修正

**Files:**

- Modify: `src/pages/home/index.scss`
- Modify: `src/pages/list/index.scss`
- Modify: `src/pages/medicines/index.scss`
- Modify: `src/pages/profile/index.scss`

- [ ] **Step 1: 统一主 Tab 页面底部安全留白**

Ensure these root page styles reserve enough space for the custom TabBar and central button:

```scss
.home-page {
  padding-bottom: calc(230px + env(safe-area-inset-bottom));
}

.list-page {
  padding-bottom: calc(230px + env(safe-area-inset-bottom));
}

.medicines-page {
  padding-bottom: calc(230px + env(safe-area-inset-bottom));
}

.profile-page {
  padding-bottom: calc(180px + env(safe-area-inset-bottom));
}
```

Keep existing top/side padding values unchanged; only replace each page root’s `padding-bottom` or shorthand bottom value.

- [ ] **Step 2: 检查空状态文案没有旧方向**

Run:

```bash
rg -n "右下角 \\+|点击右下角" src/pages src/components
```

Expected: no output。若还有输出，改成“点击底部 + 新增提醒”或移除方向性文案。

- [ ] **Step 3: 检查页面级新增提醒 FAB 已收敛**

Run:

```bash
rg -n "FloatingAddReminder|UnifiedReminderComposer" src/pages/home/index.tsx src/pages/list/index.tsx src/pages/medicines/index.tsx src/pages/profile/index.tsx
```

Expected:

```text
src/pages/medicines/index.tsx:...:import FloatingAddReminder from '@/components/FloatingAddReminder';
src/pages/medicines/index.tsx:...:<FloatingAddReminder
```

Allowed additional output: `GlobalReminderComposerHost` imports/usages. Disallowed output: `FloatingAddReminder` in `home/index.tsx` or `list/index.tsx`, `UnifiedReminderComposer` directly imported by those pages for create flow.

- [ ] **Step 4: 验证布局相关类型检查**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。

- [ ] **Step 5: 提交布局修正**

Run:

```bash
git add src/pages/home/index.scss src/pages/list/index.scss src/pages/medicines/index.scss src/pages/profile/index.scss
git commit -m "style: reserve space for custom tabbar"
```

Expected: commit 成功。

### Task 7: OpenSpec 与运行验证

**Files:**

- Read: `openspec/changes/change-tabbar/specs/central-tabbar-reminder-action/spec.md`
- Read: `openspec/changes/change-tabbar/tasks.md`

- [ ] **Step 1: 验证 OpenSpec artifacts**

Run:

```bash
openspec validate --changes --json
```

Expected: JSON summary shows `change-tabbar` valid and total failed count is `0`.

- [ ] **Step 2: 验证 TypeScript**

Run:

```bash
pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true
```

Expected: PASS。

- [ ] **Step 3: 尝试微信小程序构建**

Run:

```bash
pnpm build:weapp
```

Expected: PASS in a healthy environment. If it fails with the known local `system-configuration` / `Attempted to create a NULL object.` panic, record as environment-blocked and continue with TypeScript + OpenSpec evidence.

- [ ] **Step 4: 手动验证四 Tab 和中央新增提醒**

In the mini-program simulator or available runtime:

1. Open 首页, tap central `+`.
2. Expected: opens “新增提醒” BottomSheet directly, default “开药提醒”, no pre-type modal.
3. Switch to “检查提醒” inside the Sheet.
4. Expected: checkup form appears in the same Sheet.
5. Cancel.
6. Repeat on 提醒、药箱、我的.
7. Expected: central `+` always opens新增提醒; 药箱 page’s own新增药品入口 still opens药品表单.

- [ ] **Step 5: 手动验证遮挡与选中态**

In the mini-program simulator or available runtime:

1. Switch among 首页、提醒、药箱、我的.
2. Expected: only the current Tab is selected; central `+` is never selected as a Tab.
3. Scroll 首页待办列表 and 提醒列表 to the bottom.
4. Expected: final card actions such as 查看详情、完成检查、已开药 remain visible and tappable.
5. Open新增提醒 Sheet.
6. Expected: central `+` is hidden or disabled while Sheet is open and returns after save/cancel.

- [ ] **Step 6: 更新 OpenSpec tasks 勾选状态**

After implementation and validation, update `openspec/changes/change-tabbar/tasks.md` to mark completed items. The final state should keep the same checkbox format:

```md
- [x] 1.1 建立集中的 TabBar 配置，覆盖首页、提醒、药箱、我的四个主 Tab 的页面路径、文案和现有图标资源。
```

Run:

```bash
openspec status --change "change-tabbar"
```

Expected: artifact status remains complete; implementation task checkboxes reflect actual progress.

## 需求覆盖自查

- 四 Tab 自定义导航：Task 1、Task 4、Task 7 覆盖。
- 中央新增提醒主操作：Task 4、Task 5、Task 7 覆盖。
- 直接打开新增提醒表单且不出现类型选择弹窗：Task 3、Task 5、Task 7 覆盖。
- 当前页面承载新增提醒弹层：首页、提醒、药箱、我的均由 Task 5 覆盖。
- 移除重复页面级新增提醒 FAB：Task 5、Task 6 覆盖。
- 药箱局部动作保持独立：Task 5、Task 7 覆盖。
- 弹层期间防止重复触发：Task 2、Task 3、Task 4、Task 7 覆盖。
- 底部操作无遮挡和安全区：Task 4、Task 6、Task 7 覆盖。
- 非目标：未改变 `UnifiedReminderComposer` 表单业务结构，未合并 medicine/checkup store、service、云函数，未将中央 `+` 做成第五个 Tab。

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-06-01-change-tabbar.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
