## Context

当前应用使用 Taro 原生 tabBar，底部主导航为首页、提醒、药箱、我的四个 Tab。首页和提醒页各自渲染 `FloatingAddReminder`，点击后打开“新增提醒” BottomSheet，并复用 `UnifiedReminderComposer` 来创建开药提醒或检查提醒。

这个页面级 FAB 已经承载了正确的产品心智：它不是“新增药品”，也不是“选择开药或检查”的入口，而是统一的“新增提醒”。问题在于 FAB 分散在页面内部，且右下角位置会遮挡提醒卡片底部操作。将它迁移到自定义 TabBar 中央后，新增提醒可以成为全局稳定主操作，同时保持四 Tab 信息架构不变。

## Goals / Non-Goals

**Goals:**

- 使用自定义 TabBar 继续呈现首页、提醒、药箱、我的四个主 Tab。
- 在 TabBar 中央提供固定、突出的全局 `+` 新增提醒按钮。
- 中央 `+` 点击后直接打开“新增提醒” BottomSheet，默认开药提醒，并继续允许在 `UnifiedReminderComposer` 内切换到检查提醒。
- 移除首页和提醒页原页面级右下角新增提醒 FAB，避免重复入口和卡片操作遮挡。
- 让中央按钮在所有主 Tab 上行为一致：始终新增提醒，而不是根据当前页面切换成新增药品或其他动作。
- 保持开药提醒和检查提醒的数据域、store、service、云函数独立。

**Non-Goals:**

- 不新增“选择开药还是检查”的前置弹窗。
- 不将中央按钮定义为第五个 Tab 或可选中的导航项。
- 不复用中央按钮承载药箱页的新增药品、健康状态记录或个人页设置动作。
- 不重构 `UnifiedReminderComposer` 的业务表单结构。
- 不改变四个主 Tab 的路由或检查提醒与开药提醒的业务模型。

## Decisions

### 中央按钮是全局主操作，不是 Tab

自定义 TabBar SHALL 保留四个可选中导航项：首页、提醒、药箱、我的。中央 `+` 位于 TabBar 中间视觉位置，但不对应页面路由，也不参与选中态。

选择该方案是因为用户点击 `+` 的目标是“新增提醒”，不是切换页面。把它做成第五个 Tab 会导致选中态、返回路径和当前页面上下文变复杂，也会弱化四 Tab 信息架构。

备选方案是新增一个中间 Tab 或跳转到提醒页后再打开表单。该方案会产生额外导航动作，且用户在药箱页或我的页点击 `+` 时会被强制带离当前上下文，因此不采用。

### 复用统一新增提醒表单，不增加类型选择弹窗

中央 `+` SHALL 直接打开现有“新增提醒” BottomSheet，Sheet 内继续使用 `UnifiedReminderComposer`。默认类型为开药提醒，用户需要检查提醒时在表单顶部切换。

选择该方案是因为现有统一新增入口已经采用“先进入新增上下文，再在表单内切换类型”的路径。额外弹出类型选择会增加一步决策，并与当前首页/提醒页的新增按钮行为不一致。

### 使用共享新增提醒宿主协调 TabBar 与页面

自定义 TabBar 位于页面外层，不能依赖某个页面的本地 `useState` 直接打开 Sheet。本次设计 SHALL 引入一个轻量共享协调层，例如 `useGlobalReminderComposerStore` 或等价事件协调：

- 中央按钮触发全局“打开新增提醒”意图。
- 当前可见主 Tab 页面渲染一个共享 `GlobalReminderComposerHost`。
- Host 接收到打开意图后，在当前页面上下文中打开 BottomSheet，并挂载 `UnifiedReminderComposer`。
- 保存或取消后关闭 Sheet，并重置本次打开 key。

实现时优先使用 Zustand，因为项目已经用 Zustand 管理全局状态，且比散落事件监听更容易测试和清理。

### 首页和提醒页移除页面级新增提醒 FAB

首页和提醒页 SHALL 停止渲染原右下角 `FloatingAddReminder`。它们可以继续通过共享 Host 响应中央按钮，但不再各自放置页面内 FAB。

选择该方案是为了消除重复入口和遮挡。若保留页面 FAB，用户会同时看到 TabBar 中央按钮和右下角按钮，新增提醒入口变得冗余。

### 中央按钮不承载药箱局部新增动作

药箱页的新增药品或药品管理入口 SHALL 保留在药箱页内部。中央 `+` 在药箱页仍然打开新增提醒。

选择该方案是为了避免“全局提醒创建”和“当前页面资料管理”混淆。药箱是药品资料管理空间，新增药品不是全局主操作。

### 自定义 TabBar 负责安全区和遮挡控制

TabBar 样式 SHALL 适配底部安全区，并为中央按钮预留稳定尺寸。页面内容底部需要保留足够 padding，确保列表末尾、卡片操作区和加载状态不会被 TabBar 或中央按钮遮挡。

当新增提醒 Sheet 或其他全屏/底部弹层打开时，中央按钮 SHALL 隐藏或禁用，避免重复触发和层级冲突。

## Risks / Trade-offs

- [Risk] 自定义 TabBar 需要手动维护选中态，容易和 `switchTab` 路由不同步。→ Mitigation: 将 Tab 配置集中定义，页面显示时根据当前路由同步 active key，并用回归检查覆盖四个 Tab。
- [Risk] 中央按钮从 TabBar 打开页面内 Sheet，跨组件通信可能导致多个页面同时响应。→ Mitigation: 使用共享 store 记录打开请求和当前路由，Host 仅在当前可见主 Tab 响应。
- [Risk] 自定义 TabBar 底部安全区适配不当，影响 iPhone 底部手势区域。→ Mitigation: 使用 safe-area inset padding，并在样式中为 TabBar 和页面底部内容设置明确高度/留白。
- [Risk] 弹层打开时中央按钮仍可点击，造成重复打开或视觉叠层。→ Mitigation: Host 打开 Sheet 时同步 composer open 状态，TabBar 按钮在 open 状态隐藏或禁用。
- [Risk] 移除页面级 FAB 后，非主 Tab 页面或兼容路由无法打开新增提醒。→ Mitigation: 明确本次能力覆盖四个主 Tab；兼容页面如需新增入口，继续使用页面自身动作或后续单独评估。

## Migration Plan

1. 新增自定义 TabBar 组件和集中 Tab 配置，保持四个主 Tab 与现有图标资源一致。
2. 将 `src/app.config.ts` 的 tabBar 切换为 custom 模式，并保留四个 Tab 页面声明。
3. 新增共享新增提醒协调层和 `GlobalReminderComposerHost`，复用 `BottomSheet` 与 `UnifiedReminderComposer`。
4. 在四个主 Tab 页面接入 Host，使中央 `+` 可在当前页面上下文打开新增提醒。
5. 移除首页和提醒页原页面级 `FloatingAddReminder` 新增提醒入口，调整空状态文案中对右下角 `+` 的描述。
6. 调整页面底部 padding、TabBar 安全区样式和弹层打开时中央按钮隐藏/禁用状态。
7. 回归验证四个 Tab 切换、中央新增提醒、默认开药提醒、切换检查提醒、保存/取消关闭、列表底部操作无遮挡。

如果自定义 TabBar 在目标小程序环境出现不可接受的问题，可回滚 `app.config.ts` 到原生 tabBar，并恢复首页/提醒页页面级 FAB；业务数据不受影响。

## Open Questions

- 中央按钮在“我的”页打开新增提醒后是否需要记录来源页用于埋点或后续分析；当前版本可以不做。
