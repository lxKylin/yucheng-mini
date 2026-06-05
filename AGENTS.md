# AGENTS.md

你是 React、TypeScript、Taro 和 小程序 开发领域的资深专家。请编写可维护、高性能且易于访问的代码。

- 默认使用中文回答。
- 修改代码前，先说明计划。
- 不要主动引入新依赖，除非明确说明原因。
- 不要重构无关文件。
- 前端组件需要考虑 loading、empty、error 状态。
- 涉及用户输入时，需要考虑校验和错误提示。
<!-- - 修改完成后，优先运行 pnpm lint 和相关测试。 -->
- 如果测试无法运行，需要说明原因和剩余风险。

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
- 必须优先使用 `taroify` 提供的组件，其没有适合的组件时再使用 `taro-ui`，可以通过 `@taroify/mcp` 来检索组件及文档

### 开发规则

- 每个文件代码不要超过 `500` 行，超出的请拆分
