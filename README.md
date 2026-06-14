# 愈历

## OpenSpec

- 标准流程：`explore → propose → apply → sync → archive`

### `/opsx:explore`

作用：在真正写 Spec 之前进行探索和分析。

- 适用于：
  - 需求不明确
  - 旧项目调研
  - 性能问题排查
  - 架构选型
  - 技术方案比较

### `/opsx:propose`

作用：创建一个完整变更提案。

例如：`/opsx:propose add-dark-mode`

自动生成：

```
openspec/
└── changes/
    └── add-dark-mode/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/
```

其中：

| 文件        | 作用     |
| ----------- | -------- |
| proposal.md | 为什么做 |
| specs/\*    | 行为变化 |
| design.md   | 技术设计 |
| tasks.md    | 实施任务 |

### `/opsx:apply`

作用：按 tasks.md 执行代码实现。

### `/opsx:archive`

作用：结束变更。
