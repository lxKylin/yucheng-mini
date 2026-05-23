## 1. 模板配置整理

- [x] 1.1 确认 `src/constants/index.ts` 中三类微信订阅模板 ID 使用数组常量表达，并过滤空值和重复值的消费方式清晰
- [x] 1.2 移除 `src/services/wechatReminder.ts` 对单个 `ENV_TEMPLATE_ID` 的依赖，改为从常量读取模板 ID 列表

## 2. 订阅服务修复

- [x] 2.1 更新 `requestWechatReminderSubscription()`，向 `Taro.requestSubscribeMessage` 传入全部有效模板 ID
- [x] 2.2 按模板 ID 逐个解析微信返回的 `accept`、`reject`、`ban`、`filter` 和未知结果
- [x] 2.3 实现统一结果归并：全部模板 `accept` 才返回可用，任意模板未 `accept` 均返回不可用
- [x] 2.4 为任意模板异常或拒绝补充清晰 message 和调试日志，确保个人页不显示消息订阅已开启

## 3. 个人页结果消费

- [x] 3.1 保持个人页单一微信提醒授权入口，不新增三类提醒开关
- [x] 3.2 订阅归并成功时继续更新现有用户级 `wechatSubscriptionStatus` 为 `available`
- [x] 3.3 订阅归并失败时保持现有拒绝和打开设置流程，并修正本地状态类型判断的语义边界

## 4. 验证

- [x] 4.1 使用 TypeScript 静态检查验证前端类型和模板数组调用方式
- [x] 4.2 人工或模拟验证三种返回组合：全部 `accept`、部分 `reject`、存在 `ban/filter`
- [x] 4.3 确认 `reminder`、`expiryReminder`、`checkupReminder` 云函数无需改动且仍读取现有用户级订阅资格状态
