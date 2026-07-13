## 1. 到期判断纯逻辑

- [x] 1.1 新增 `expiryReminderDue.js`，实现东八区日期解析、合法 `HH:mm` 校验和前一天/当天/后一天最近计划发生时刻计算，不依赖云 SDK 或系统本地时区。
- [x] 1.2 实现并导出 `isExpiryReminderDue({ now, expiryDate, advanceDays, remindTime })`，返回 `due`、`reason`、`reminderDate`，覆盖日期不命中、时间不命中、输入无效和到期四种结果。

## 2. 云函数调度与扫描流程

- [x] 2.1 将 `expiryReminder/config.json` 的触发器改为每 30 分钟执行一次，并确认 cron 表达式覆盖全天且不再限制星期。
- [x] 2.2 修改 `expiryReminder/index.js`，查询活动药品并逐条调用统一到期判断，移除数据库层的单日 `expiryDate` 候选限制和旧的本地时区 `isTimeMatched` 分支。
- [x] 2.3 将 `lastWechatExpiryReminderDate` 的比较与成功写入统一为判断结果中的 `reminderDate`，保留同一药品同一计划日期最多发送一次的现有防重字段。
- [x] 2.4 扩展执行结果统计，分别累计 `dateMismatch`、`timeMismatch`、`invalidInput` 和 `duplicate`，同时保持 `sent`、`failed` 等现有汇总可用。

## 3. 自动化验证

- [x] 3.1 新增 `expiryReminder/index.test.js`，使用 `node:test` 验证周一、周三、周日到期样本在对应提前提醒日均可命中。
- [x] 3.2 增加 08:30、09:00、21:30 及窗口边界测试，验证每个合法提醒时刻都能被 30 分钟调度周期覆盖，超出窗口则返回时间不命中。
- [x] 3.3 增加 23:50/00:10 双向跨午夜、非法日期/时间/提前天数测试，并验证返回的计划提醒日期可用于跨自然日防重。
- [x] 3.4 运行 `node --test cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/expiryReminder/index.test.js`，并执行 `openspec validate fix-expiry-reminder-scheduling --strict`；若环境命令不同，使用当前 CLI 支持的等价校验并记录结果。

## 4. 部署检查

- [ ] 4.1 在测试环境部署云函数代码后再更新定时触发器，检查首日 sent、failed、dateMismatch、timeMismatch、invalidInput、duplicate 统计符合测试数据分布。
- [x] 4.2 记录回滚步骤：先恢复原触发器配置，再回滚云函数代码；确认本变更没有数据库迁移或新增运行时依赖。
