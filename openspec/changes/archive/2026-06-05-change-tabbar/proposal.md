## Why

当前首页和提醒页各自使用右下角悬浮 `+` 作为“新增提醒”入口，药箱页也有独立的“新增药品”入口，容易遮挡列表卡片底部操作，也让同一个核心新增动作分散在页面内部。将该动作收敛到自定义 TabBar 中央，可以让“新增”成为稳定、全局、低寻找成本的主操作，贴合“不要断药”的产品心智。

## What Changes

- 将底部导航从原生 tabBar 调整为自定义 TabBar 承载，但仍保持四个主导航 Tab：首页 / 提醒 / 药箱 / 我的。
- 在 TabBar 中央增加突出的全局 `+` 主操作按钮。
- 中央 `+` 点击后直接打开现有统一“新增” Sheet。
- 统一新增 Sheet 继续使用 `UnifiedReminderComposer`，默认展示药品面板，开药提醒开关默认关闭，并允许在表单顶部切换到检查提醒。
- 不新增“选择开药还是检查”的前置弹窗。
- 首页和提醒页移除或停用原页面级右下角悬浮新增提醒按钮，避免重复入口和遮挡操作区。
- 药箱页移除原页面级右下角新增药品按钮，避免与中央 `+` 重复。

## Capabilities

### New Capabilities

- `central-tabbar-reminder-action`: 定义自定义 TabBar 的四 Tab 导航与中央全局新增入口，包括直接打开新增 Sheet、默认药品且开药提醒关闭、不出现类型选择弹窗、以及页面级重复 FAB 的收敛规则。

### Modified Capabilities

- None.

## Impact

- 影响应用配置：`src/app.config.ts` 需要启用自定义 TabBar，并继续保留四个主 Tab 页面。
- 影响自定义 TabBar：新增或调整 `custom-tab-bar` 相关组件、样式、选中态同步、安全区适配和中央按钮交互。
- 影响首页、提醒页和药箱页：复用同一新增打开逻辑，并移除原页面级悬浮新增按钮。
- 影响新增 Sheet：继续复用 `UnifiedReminderComposer`，不改变 medicine/checkup 的 store、service、云函数或数据模型。
- 影响视觉和手动验证：需要检查不同 Tab、不同机型安全区、Sheet 打开时中央按钮隐藏或禁用、以及列表底部操作不再被遮挡。
