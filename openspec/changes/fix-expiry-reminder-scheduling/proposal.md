## Why

药品过期提醒当前仅在每周三 09:00 执行，却只扫描“当天 + 提前天数”到期且命中用户提醒时刻的药品，导致其他星期到期或提醒时刻不在 09:00 附近的记录被永久漏过。该问题破坏核心提醒闭环，需要让扫描频率、日期候选与时间窗口遵循同一套规则。

## What Changes

- 将药品过期提醒触发器调整为每 30 分钟执行一次，使所有允许配置的提醒时刻都存在可命中的调度窗口。
- 抽取可独立测试的 `isExpiryReminderDue({ now, expiryDate, advanceDays, remindTime })` 纯函数，统一判断东八区日期、提醒时间与跨午夜窗口。
- 扫描活动药品后使用统一到期判断区分日期不命中、时间不命中与重复发送，并保留 `lastWechatExpiryReminderDate` 的按日防重语义。
- 增加云函数逻辑测试，覆盖周一、周三、周日到期，08:30、09:00、21:30 以及跨午夜提醒窗口。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `reminder-subscription`: 补充药品过期订阅消息的调度、日期候选、时间窗口和单日防重要求，确保任意星期与允许配置的提醒时刻均可被处理。

## Impact

- 修改 `cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/expiryReminder/config.json` 的定时触发频率。
- 新增同目录 `expiryReminderDue.js` 纯逻辑模块，并修改 `index.js` 的扫描过滤和跳过原因统计。
- 新增 `cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/expiryReminder/index.test.js`，使用现有 Node.js 测试能力验证纯逻辑，不引入新依赖。
- 不修改数据库字段、订阅授权模型或其他提醒云函数；分页、并发 claim、日志脱敏与统一时区公共模块仍由任务清单中的后续任务处理。
