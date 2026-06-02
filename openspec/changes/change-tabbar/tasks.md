## 1. 自定义 TabBar 基础

- [x] 1.1 建立集中的 TabBar 配置，覆盖首页、提醒、药箱、我的四个主 Tab 的页面路径、文案和现有图标资源。
- [x] 1.2 在 `src/app.config.ts` 中启用自定义 tabBar，同时保留当前四个主 Tab 页面。
- [x] 1.3 实现自定义 TabBar 组件，支持四个导航项、选中态渲染和 `Taro.switchTab` 跳转。
- [x] 1.4 增加中央 `+` 主操作按钮，将其实现为非 Tab 导航项，并提供可访问标签和稳定尺寸。
- [x] 1.5 补充 TabBar 样式，覆盖底部安全区、中央按钮位置、图标/文字状态和底部布局稳定性。

## 2. 全局新增提醒协调

- [x] 2.1 新增轻量 Zustand store 或等价共享协调层，管理全局新增提醒的打开/关闭状态和打开请求 key。
- [x] 2.2 实现 `GlobalReminderComposerHost`，在当前页面上下文中渲染 `BottomSheet` + `UnifiedReminderComposer`。
- [x] 2.3 将自定义 TabBar 中央 `+` 接入共享新增提醒打开动作，且不改变当前选中的 Tab。
- [x] 2.4 确保保存成功或取消时，Host 能关闭 Sheet 并重置相关状态。
- [x] 2.5 确保新增提醒 BottomSheet 打开期间，中央 `+` 被隐藏或禁用，避免重复触发。

## 3. 页面接入

- [x] 3.1 在首页、提醒、药箱、我的四个主 Tab 页面挂载 `GlobalReminderComposerHost`。
- [x] 3.2 移除首页页面级 `FloatingAddReminder` 新增提醒按钮。
- [x] 3.3 移除提醒页页面级 `FloatingAddReminder` 新增提醒按钮。
- [x] 3.4 更新首页和提醒页空状态文案，避免继续提示用户点击“右下角 +”。
- [x] 3.5 保持药箱页内部新增药品或药品管理入口独立，不复用中央 `+`。

## 4. 布局与交互打磨

- [x] 4.1 新增或调整页面底部留白，确保首页卡片和提醒列表内容不会被自定义 TabBar 或中央 `+` 遮挡。
- [x] 4.2 验证中央 `+` 会直接打开新增提醒，默认进入开药提醒表单，且不会出现前置类型选择弹窗。
- [x] 4.3 验证 `UnifiedReminderComposer` 仍可在 Sheet 内从开药提醒切换到检查提醒。
- [x] 4.4 验证四个主 Tab 切换时，TabBar 选中态始终正确。
- [x] 4.5 验证首页和提醒页靠近底部的卡片操作区完整可见且可点击。

## 5. 验证

- [x] 5.1 运行 `pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true`。
- [x] 5.2 运行 `openspec validate --changes --json`，确认 `change-tabbar` 通过校验。
- [x] 5.3 尝试运行 `pnpm build:weapp`；如果被已知本地 `system-configuration` / `NULL object` 环境问题阻塞，则记录为环境阻塞。
- [ ] 5.4 在小程序模拟器或可用运行环境中手动验证：四 Tab 切换、每个 Tab 的中央新增提醒、保存/取消关闭行为和底部安全区布局。
