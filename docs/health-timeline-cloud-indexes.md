# 健康历程云数据库索引

健康历程使用独立的 `healthTimelineEvents` 集合，只保存用户主动录入的事实性事件；不得写回药品、检查提醒、每日状态或任何提醒调度。

| 索引名 | 字段 | 用途 |
| --- | --- | --- |
| `idx_openid_occurred_at` | `_openid` 升序、`occurredAt` 降序 | 兼容微信云开发身份下按时间读取本人事件 |
| `idx_userid_occurred_at` | `userId` 升序、`occurredAt` 降序 | 项目显式用户 ID 下按时间分页读取本人事件 |

客户端 service 的集合名为 `healthTimelineEvents`，查询字段为 `_openid` / `userId`、`occurredAt` 和 `updatedAt`；创建记录会写入 `userId`，更新和删除均先在当前用户范围内定位文档。
