import Taro from '@tarojs/taro';

let initialized = false;

/**
 * 初始化微信云开发。在 app.ts 的 useLaunch 中最先调用。
 * 重复调用安全（由 initialized 标志防止）。
 */
export function initCloud(envId: string): void {
  if (initialized) return;
  Taro.cloud.init({ env: envId, traceUser: true });
  initialized = true;
}

/** 获取指定集合的引用 */
export function getCollection(name: string) {
  return Taro.cloud.database().collection(name);
}

/** 调用云函数的通用封装 */
export async function callCloudFn<T = unknown>(
  name: string,
  data?: Record<string, unknown>
): Promise<T> {
  const res = await Taro.cloud.callFunction({ name, data: data ?? {} });
  return res.result as T;
}
