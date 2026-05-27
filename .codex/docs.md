# .codex文档

## Hooks

### `SessionStart`会话开始

### `PreToolUse`调用工具前

#### 场景1:禁止危险命令

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .codex/hooks/check-command.sh"
          }
        ]
      }
    ]
  }
}
```

```sh [check-command.sh]
#!/bin/bash

INPUT=$(cat)

if echo "$INPUT" | grep -E "rm -rf|sudo rm"; then
  echo "Dangerous command detected"
  exit 1
fi
```

### `PostToolUse`调用工具后

### `PermissionRequest`权限请求

### `UserPromptSubmit`用户提交Prompt

### `Stop`停止

## Rules

## MCP
