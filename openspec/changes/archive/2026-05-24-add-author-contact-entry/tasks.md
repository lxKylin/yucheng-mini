## 1. 联系方式配置

- [x] 1.1 在 `src/constants/index.ts` 新增 `AUTHOR_WECHAT_ID` 常量，并填入上线使用的作者微信号
- [x] 1.2 确认作者微信号属于可公开添加的联系信息，不包含私人敏感备注或临时占位值

## 2. 个人页入口与弹窗

- [x] 2.1 在 `src/pages/profile/index.tsx` 引入 `AUTHOR_WECHAT_ID`
- [x] 2.2 在个人页设置列表中，于「默认提前天数」之后新增「联系作者」入口
- [x] 2.3 实现 `handleContactAuthor`，点击入口后调用 `Taro.showModal` 展示「联系作者」弹窗
- [x] 2.4 弹窗内容展示微信号和简短反馈说明，按钮文案为「取消」和「复制」

## 3. 复制与反馈

- [x] 3.1 用户点击「复制」后调用 `Taro.setClipboardData` 写入作者微信号
- [x] 3.2 复制成功后展示「微信号已复制」提示
- [x] 3.3 复制失败时展示失败提示，并避免误报成功

## 4. 样式与验证

- [x] 4.1 复用或补充 `profile-page__menu-*` 样式，确保新增入口与现有个人页设置项视觉一致
- [x] 4.2 验证新增入口不影响订阅消息授权、默认提醒时间和默认提前天数交互
- [x] 4.3 运行可用的静态检查或小程序构建命令，记录验证结果；如环境阻塞，说明具体错误

## 验证记录

- `pnpm exec tsc --noEmit --ignoreDeprecations 5.0 --skipLibCheck true`：通过
- `pnpm run build:weapp`：环境阻塞，触发 `system-configuration-0.5.1` 的 `Attempted to create a NULL object.` panic，进程挂起后已终止
- 运行时修正：微信小程序 `showModal.confirmText` 最多 4 个中文字符，确认按钮从「复制微信号」改为「复制」
