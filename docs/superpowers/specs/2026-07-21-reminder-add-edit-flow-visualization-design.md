# 提醒新增/编辑流程可视化设计

## 目标

在不修改业务代码、不引入新依赖的前提下，基于 `graphify-out/graph.json` 生成一个聚焦“提醒新增与编辑”的独立可视化页面，让读者能够快速理解入口、表单、状态层和云端分支之间的关系。

## 产物与范围

- 新增 `graphify-out/reminder-add-edit-flow.html`。
- 保留现有 `graphify-out/graph.html` 和 `graphify-out/graph.json`，不重建、不覆盖全局图谱。
- 页面只展示与下列链路直接相关的节点：
  - `list/index.tsx` 与 `medicines/index.tsx`
  - `MedicineComposer`
  - `useMedicineComposerForm`
  - `useDerivedById`、`makeDefaults`、`useSubmissionGuard`
  - `useReminderActions`、`useReminderStore`
  - `persistMedicineChange`
  - `addReminderToCloud`、`updateReminderInCloud`
  - `requireUserId`、`findUserMedicineDoc`、`getCollection`
- 不展开检查提醒、健康指标等旁支，不将共享 `today()` 依赖视为业务调用链。

## 视觉与交互

页面采用横向泳道式流程图，从左到右划分为五层：页面入口、表单组件、表单 Hook、Store/持久化、云端服务。

- 实线连线：`graph.json` 中存在的 `imports`、`calls`、`contains` 等 `EXTRACTED` 关系。
- 虚线连线：根据节点组合推断出的新增/编辑分支，必须显示“推断”标记。
- 节点点击后，右侧详情面板展示：节点名称、职责、源文件、行号、关系证据。
- 顶部提供“全部 / 仅新增 / 仅编辑”三个视图切换。
- 在小屏幕上改为纵向流程，确保节点文字和详情面板可读。

美术方向采用“医疗工作台 + 工程蓝图”：暖白底色、深青结构线、琥珀色强调点，避免通用渐变卡片风格。

## 数据与实现约束

- 生成时从现有 `graphify-out/graph.json` 筛选节点和边，将所需子图数据内嵌到 HTML，使页面可离线打开。
- 使用原生 HTML、CSS 和 JavaScript，不访问网络，不引入 CDN 或 npm 依赖。
- 所有用于说明流程的关系必须能追溯到图谱节点或明确标记为推断，不伪造调用边。
- HTML 不依赖开发服务器，直接双击即可使用。

## 状态与降级

- 正常状态：显示完整子图和节点详情。
- 空状态：当某个视图没有匹配节点时，显示明确的空提示和“返回全部”操作。
- 错误状态：如果内嵌数据结构缺失，页面显示可读错误信息，而不是空白页。
- 加载状态：离线数据内嵌，无异步请求；保留短暂的入场骨架动画，并遵守 `prefers-reduced-motion`。

## 验收标准

1. `reminder-add-edit-flow.html` 可以在无网络和无开发服务器时直接打开。
2. 可切换全部、新增、编辑三种视图。
3. 点击节点能查看文件位置和关系类型。
4. 新增链路展示 `addReminderToCloud`；编辑链路展示 `updateReminderInCloud` 和 `findUserMedicineDoc`。
5. 推断关系与图谱直接证据在视觉上可区分。
6. 在桌面端和移动端宽度下均无水平溢出，关键文字可读。
7. 页面不发起网络请求，不引入新依赖。
