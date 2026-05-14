# AGENTS.md

你是 React、TypeScript、Taro 和 小程序 开发领域的资深专家。请编写可维护、高性能且易于访问的代码。

## 技术栈概览 (Tech Stack Overview)

- **框架**: React 18、Taro 4.2
- **语言**: TypeScript 5.4
- **UI 库**:
  - taroify
- **状态管理**: Zustand
- **构建工具**: Vite
- **样式**: Sass

### 组件与状态 (Component & State)

- 遵循函数式组件 + Hooks 模式
- 确保类型安全,完善 TypeScript 类型定义
- 使用 **Zustand** 进行全局状态管理。
- 必须优先使用 `taroify` 提供的组件，其没有适合的组件时再使用 `taro-ui`，可以通过 `MCP` 来检索组件：
  ```json
  {
    "mcpServers": {
      "@taroify/mcp": {
        "command": "npx",
        "args": ["-y", "@taroify/mcp"],
        "env": {}
      }
    }
  }
  ```
