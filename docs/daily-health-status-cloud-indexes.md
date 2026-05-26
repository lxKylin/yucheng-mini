# 每日状态记录云数据库索引

每日身体/用药感受记录使用独立集合 `dailyHealthStatuses`。

## 建议集合

- 集合名：`dailyHealthStatuses`
- 主要查询：当前用户近 30 天记录
- 主要写入：按当前用户和 `date` 保存当天唯一记录

## 建议组合索引

建议在微信开发者工具的云开发控制台中为 `dailyHealthStatuses` 新建以下组合索引：

### `idx_daily_health_openid_date`

用于当前登录微信用户的近 30 天记录查询：

| 字段      | 排序 |
| --------- | ---- |
| `_openid` | 升序 |
| `date`    | 降序 |

### `idx_daily_health_user_date`

用于已绑定业务用户 ID 的近 30 天记录查询：

| 字段     | 排序 |
| -------- | ---- |
| `userId` | 升序 |
| `date`   | 降序 |

## 行为边界

- 记录是用户自我复盘材料，不是副作用判定。
- 药品通过 `relatedMedicineIds` 关联，页面文案应使用“相关药品”。
- 每个用户每天最多一条记录，保存今天记录时应更新已有同日期记录。
