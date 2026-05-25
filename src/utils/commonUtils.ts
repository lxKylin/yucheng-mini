/** 生成唯一 ID（小程序环境不使用 crypto） */
export function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
