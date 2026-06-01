## Why

当前小程序已经在首页把开药提醒和检查/复诊提醒聚合为统一风险待办，但底部导航仍拆成「提醒」和「检查」两个入口。对用户来说，开药和检查本质都是需要按目标日期提前处理的提醒事项，继续拆分会增加查找和新增提醒的心智负担。

本次变更将检查/复诊提醒并入「提醒」Tab 的统一提醒中心，收敛底部导航，同时保留检查提醒独立业务域，避免把检查数据强行混入药品模型。

## What Changes

- 将底部 Tab 从「首页 / 提醒 / 药箱 / 检查 / 我的」收敛为「首页 / 提醒 / 药箱 / 我的」，移除独立「检查」Tab。
- 将现有提醒列表升级为统一提醒中心，合并展示开药提醒和检查/复诊提醒。
- 统一开药提醒卡片和检查提醒卡片在混合列表中的视觉骨架，保留业务字段和主操作差异，避免同一信息流中出现两套不协调的卡片样式。
- 在统一提醒中心提供类型筛选：全部、开药、检查；并保留状态筛选、搜索、分页加载和下拉刷新能力。
- 统一新增入口文案为「新增提醒」。点击后直接打开新增提醒表单 Sheet，而不是先弹出类型选择。
- 新增提醒表单顶部提供类型切换：开药提醒 / 检查提醒；根据选中类型渲染 `MedicineComposer` 或 `CheckupComposer`。
- 新增模式允许切换提醒类型；编辑模式不允许切换已有记录类型，开药提醒仍进入开药表单，检查提醒仍进入检查表单。
- 首页「查看完整提醒」和空状态文案改为指向统一提醒中心，不再跳转或提示独立检查 Tab。
- 保留检查提醒独立模型、store、service、hook、云函数、详情、完成检查和重新安排流程，不将检查提醒嵌入药品实体。
- 不新增底部 Tab，不新增检查指标记录、报告归档、治疗时间线或健康平台能力。

## Capabilities

### New Capabilities

- `unified-reminder-center`: 管理统一提醒中心的信息架构、混合列表、类型筛选、统一新增提醒入口和表单内开药/检查类型切换。

### Modified Capabilities

- `checkup-reminders`: 检查/复诊提醒不再通过独立底部「检查」Tab 管理，而是作为独立业务域并入统一提醒中心。
- `home-risk-feed`: 首页进入完整管理页和空状态新增语义改为指向统一提醒中心，不再依赖独立检查 Tab。

## Impact

- 影响路由与 TabBar：更新 `src/app.config.ts` 底部 Tab 配置，保留检查页面作为内部复用页或迁移其能力到提醒中心，避免独立 Tab 入口。
- 影响提醒列表页：`src/pages/list/index.tsx` 需要承载开药与检查混合列表、类型筛选、检查详情/完成/重新安排 Sheet，以及统一新增提醒 Sheet。
- 影响检查页：`src/pages/checkups/index.tsx` 的列表能力需要迁移或降级为内部页面；最终用户路径不再依赖底部检查 Tab。
- 影响首页：`src/pages/home/index.tsx` 的「提醒 / 检查」双入口和空状态文案需要收敛到统一提醒中心。
- 影响组件复用：继续复用 `MedicineCard`、`CheckupCard`、`MedicineComposer`、`CheckupComposer`、`ReminderDetail`、`CheckupDetail`、`CheckupCompletionSheet` 和 `CheckupRestartSheet`，但需要让 `MedicineCard` 与 `CheckupCard` 在统一提醒中心遵循同一列表卡片骨架。
- 不影响云端数据模型和云函数：`medicines`、`checkups`、`reminder`、`checkupReminder` 等链路保持独立。
- 不新增第三方依赖；继续使用 React 18、Taro 4.2、TypeScript、Zustand、taroify 和 Sass。
