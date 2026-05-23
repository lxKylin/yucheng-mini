# 检查提醒云数据库索引建议

`add-checkup-tab` 新增独立 `checkups` 集合，用于保存复诊、化验、影像和指标复查提醒。为避免云开发扫描告警，建议在云开发控制台为 `checkups` 增加组合索引。

## 小程序端列表查询

用途：当前用户加载自己的未删除检查提醒。

建议索引：

- `_openid` 升序，`status` 升序，`targetDate` 升序
- `userId` 升序，`status` 升序，`targetDate` 升序

说明：服务层会兼容 `_openid` 与 `userId` 两种归属字段。

## 云函数定时扫描

用途：`checkupReminder` 定时扫描有效检查提醒并发送订阅消息。

建议索引：

- `status` 升序，`targetDate` 升序，`lastWechatReminderDate` 升序

说明：云函数会先筛选 `status = active`，再根据 `targetDate`、`remindAdvanceDays` 和 `lastWechatReminderDate` 判断是否发送。

## 本地检查记录

已执行语法检查：

```bash
node --check cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/checkupReminder/index.js
node --check cloudfunctions/cloud1-d3gqjwfefe40e4dba/functions/reminder/index.js
```

检查场景覆盖说明：

- 到期发送：`status = active`、提醒日期为今天、提醒时间命中窗口、用户订阅资格为 `available` 时发送。
- 跳过未到期：提醒日期不等于今天时跳过。
- 跳过重复发送：`lastWechatReminderDate` 等于今天时跳过。
- 跳过暂停提醒：云函数查询条件只扫描 `status = active`，暂停记录不会进入发送流程。
