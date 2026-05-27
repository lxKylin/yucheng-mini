---
name: openspec-propose-to-plan
description: 当仓库中的 OpenSpec Propose 已生成 proposal/design/specs/tasks 后，需要继续衔接 superpowers:writing-plans 生成中文实施计划时使用；尤其适用于用户提到 Propose 后写计划、先读 change 文档、design.md、tasks.md、specs、proposal.md、中文实施计划或 docs/superpowers/plans。
---

# OpenSpec Propose 到实施计划

## 适用场景

用户刚完成或提到 OpenSpec Propose，希望把已生成的 change artifacts 转成可执行实施计划时使用。

不要用于：

- 新建 proposal/design/spec/tasks；这类任务使用 `openspec-propose`。
- 直接实现 change；这类任务使用 `openspec-apply-change` 或具体执行计划。

## 先确认 Change

1. 如果用户给了 change 名称，直接使用。
2. 如果没有给名称，先查看 `openspec/changes/` 或 `openspec list --json`，不要凭上下文硬猜，不确定则进行询问。

## 必读材料

按顺序读取：

1. `openspec/changes/<name>/proposal.md`
2. `openspec/changes/<name>/design.md`
3. `openspec/changes/<name>/specs/**/spec.md`
4. `openspec/changes/<name>/tasks.md`

随后补充少量当前源码证据，确认计划中的文件路径、已有模式和技术约束，不要只根据 artifacts 想象实现。

## 衔接 writing-plans

1. 明确宣布正在使用 `superpowers:writing-plans` 生成实施计划。
2. 计划默认写中文；OpenSpec parser 可见关键字或文件名保持原样。
3. 输出路径遵循 writing-plans 约定：`docs/superpowers/plans/YYYY-MM-DD-<change-name>.md`，除非用户指定其他位置。
4. 计划必须覆盖 proposal/design/specs/tasks 中的要求、非目标、影响面和验收点。
5. 每个任务写清真实文件路径、修改范围、验证命令和预期结果。
6. 如果计划需要 TDD 或分步执行，保留 writing-plans 的执行交接说明，但用中文表达。

## 验证

完成后做轻量检查：

- 用 `rg` 确认计划包含 change 名称、关键需求、主要文件路径和验证命令。
- 用 `rg -n "TBD|TODO|待补|占位"` 检查占位内容。
- 如 OpenSpec CLI 可用，运行 `openspec validate --changes --json` 或当前 CLI 支持的等价命令，确认 change artifacts 仍可验证。
- 明确说明这是实施计划验证，不等同于代码实现或运行时验证。

## 常见问题

- 不要把 Propose 后计划写成英文骨架；本仓库计划、review checklist 和同类规划文档默认中文。
- 不要把计划阶段延伸成实现阶段，除非用户明确要求开始实现。
- 不要把 OpenSpec artifacts 原文整段复制进计划；提炼成执行步骤、文件边界和验收点。
