# 指标追踪云数据库索引

指标追踪使用独立集合，不写入药品、检查提醒或每日状态记录集合。

## `healthMetricTypes`

用途：保存用户自定义的指标类型，例如血压、空腹血糖、肌酐。

建议索引：

| 索引名 | 字段 | 用途 |
| --- | --- | --- |
| `idx_user_openid_updated` | `_openid` 升序、`updatedAt` 降序 | 兼容微信云开发默认用户查询 |
| `idx_userid_updated` | `userId` 升序、`updatedAt` 降序 | 兼容项目内显式用户 ID 查询 |
| `idx_userid_status_updated` | `userId` 升序、`status` 升序、`updatedAt` 降序 | 过滤已删除或隐藏指标 |

## `healthMetricRecords`

用途：保存某个指标在某天的数值、单位和参考范围快照。

建议索引：

| 索引名 | 字段 | 用途 |
| --- | --- | --- |
| `idx_user_openid_metric_date` | `_openid` 升序、`metricTypeId` 升序、`date` 降序 | 兼容微信云开发默认用户查询某指标的趋势和最近记录 |
| `idx_userid_metric_date` | `userId` 升序、`metricTypeId` 升序、`date` 降序 | 查询某指标的趋势和最近记录 |
| `idx_user_openid_metric_same_day` | `_openid` 升序、`metricTypeId` 升序、`date` 升序 | 兼容微信云开发默认用户查询同日同指标记录 |
| `idx_userid_metric_same_day` | `userId` 升序、`metricTypeId` 升序、`date` 升序 | 保存前查找同日同指标记录 |

同一天同一指标的唯一性由保存逻辑先查后写保证；云数据库索引用于降低查询成本。
