## ADDED Requirements

### Requirement: 四 Tab 自定义导航

系统 SHALL 使用自定义 TabBar 呈现首页、提醒、药箱、我的四个主导航项，并保持这些导航项的页面路由语义不变。

#### Scenario: 渲染四个主导航项

- **WHEN** 应用渲染底部自定义 TabBar
- **THEN** 系统展示「首页」「提醒」「药箱」「我的」四个导航项

#### Scenario: 切换主导航项

- **WHEN** 用户点击任一主导航项
- **THEN** 系统 SHALL 切换到对应 Tab 页面，并更新该导航项的选中态

#### Scenario: 不展示检查独立 Tab

- **WHEN** 应用渲染底部自定义 TabBar
- **THEN** 系统 SHALL NOT 展示独立「检查」Tab

### Requirement: 中央新增提醒主操作

系统 SHALL 在自定义 TabBar 中央展示一个全局 `+` 主操作按钮，用于新增提醒。

#### Scenario: 渲染中央新增按钮

- **WHEN** 应用渲染底部自定义 TabBar
- **THEN** 系统在四个主导航项之间展示一个视觉突出的中央 `+` 按钮

#### Scenario: 中央按钮不是导航项

- **WHEN** 用户点击中央 `+` 按钮
- **THEN** 系统 SHALL NOT 将中央按钮设置为选中的 Tab 导航项

#### Scenario: 中央按钮语义一致

- **WHEN** 用户位于首页、提醒、药箱或我的任一主 Tab
- **THEN** 中央 `+` 按钮 SHALL 始终表示新增提醒

### Requirement: 直接打开新增提醒表单

系统 SHALL 在用户点击中央 `+` 后直接打开新增提醒 BottomSheet，并复用统一新增提醒表单。

#### Scenario: 点击中央按钮打开表单

- **WHEN** 用户点击自定义 TabBar 中央 `+`
- **THEN** 系统直接打开标题为「新增提醒」或等价文案的 BottomSheet

#### Scenario: 不展示类型选择弹窗

- **WHEN** 用户点击自定义 TabBar 中央 `+`
- **THEN** 系统 SHALL NOT 先展示“选择开药提醒或检查提醒”的前置弹窗

#### Scenario: 默认创建开药提醒

- **WHEN** 新增提醒 BottomSheet 首次打开
- **THEN** 系统默认选中开药提醒类型，并展示开药提醒表单

#### Scenario: 表单内切换检查提醒

- **WHEN** 用户在新增提醒 BottomSheet 顶部选择「检查提醒」
- **THEN** 系统展示检查提醒表单

### Requirement: 当前页面承载新增提醒弹层

系统 SHALL 让中央 `+` 在当前可见主 Tab 页面上下文中打开新增提醒 BottomSheet。

#### Scenario: 在首页打开新增提醒

- **WHEN** 用户位于首页并点击中央 `+`
- **THEN** 系统在首页上下文中打开新增提醒 BottomSheet

#### Scenario: 在提醒页打开新增提醒

- **WHEN** 用户位于提醒页并点击中央 `+`
- **THEN** 系统在提醒页上下文中打开新增提醒 BottomSheet

#### Scenario: 在药箱页打开新增提醒

- **WHEN** 用户位于药箱页并点击中央 `+`
- **THEN** 系统在药箱页上下文中打开新增提醒 BottomSheet

#### Scenario: 在我的页打开新增提醒

- **WHEN** 用户位于我的页并点击中央 `+`
- **THEN** 系统在我的页上下文中打开新增提醒 BottomSheet

### Requirement: 移除重复页面级新增提醒 FAB

系统 SHALL 移除首页和提醒页原页面级右下角新增提醒悬浮按钮，避免与中央 `+` 重复。

#### Scenario: 首页不再渲染页面级新增提醒 FAB

- **WHEN** 用户进入首页
- **THEN** 系统 SHALL NOT 展示额外的右下角页面级新增提醒悬浮按钮

#### Scenario: 提醒页不再渲染页面级新增提醒 FAB

- **WHEN** 用户进入提醒页
- **THEN** 系统 SHALL NOT 展示额外的右下角页面级新增提醒悬浮按钮

#### Scenario: 空状态文案不引用右下角按钮

- **WHEN** 首页或提醒页展示空状态引导
- **THEN** 文案 SHALL NOT 引导用户点击“右下角 +”

### Requirement: 药箱局部动作保持独立

系统 SHALL 保持药箱页局部药品管理动作独立，不得将中央 `+` 改为新增药品。

#### Scenario: 药箱页点击中央按钮

- **WHEN** 用户位于药箱页并点击中央 `+`
- **THEN** 系统打开新增提醒 BottomSheet，而不是新增药品表单

#### Scenario: 药箱页新增药品入口

- **WHEN** 用户需要新增药品资料
- **THEN** 系统 SHALL 通过药箱页内部入口提供新增药品或药品管理动作

### Requirement: 弹层期间防止重复触发

系统 SHALL 在新增提醒 BottomSheet 打开期间隐藏或禁用中央 `+`，避免重复打开。

#### Scenario: 新增提醒表单打开

- **WHEN** 新增提醒 BottomSheet 处于打开状态
- **THEN** 中央 `+` SHALL 被隐藏或禁用

#### Scenario: 新增提醒表单关闭

- **WHEN** 新增提醒 BottomSheet 保存成功或取消关闭
- **THEN** 中央 `+` SHALL 恢复可点击状态

### Requirement: 底部操作无遮挡

系统 SHALL 为自定义 TabBar 和中央 `+` 预留底部空间，避免遮挡页面列表内容和卡片操作区。

#### Scenario: 提醒列表滚动到底部

- **WHEN** 用户在提醒页滚动到列表底部
- **THEN** 最后一条提醒卡片的底部操作区 SHALL 完整可见且可点击

#### Scenario: 首页待办卡片靠近底部

- **WHEN** 首页待办卡片靠近屏幕底部
- **THEN** 卡片的查看详情、完成检查或已开药等操作 SHALL 不被中央 `+` 或 TabBar 遮挡

#### Scenario: 适配底部安全区

- **WHEN** 用户在具有底部安全区的设备上使用应用
- **THEN** 自定义 TabBar SHALL 保留安全区空间，且中央 `+` 不压住系统手势区域
