import { callCloudFn } from "./cloud";

interface AuthResult {
  success: boolean;
  openid?: string;
  nickName?: string;
  avatarUrl?: string;
  error?: string;
}

export interface UserProfile {
  openid: string;
  nickName: string;
  avatarUrl: string;
}

let cachedProfile: UserProfile | null = null;

/**
 * 调用 auth 云函数完成微信登录，获取并缓存用户信息。
 * 重复调用直接返回缓存值。
 */
export async function login(): Promise<UserProfile | null> {
  if (cachedProfile) return cachedProfile;

  try {
    const result = await callCloudFn<AuthResult>("auth");
    console.log("[auth] 登录结果：", result);
    if (result.success && result.openid) {
      cachedProfile = {
        openid: result.openid,
        nickName: result.nickName ?? "",
        avatarUrl: result.avatarUrl ?? "",
      };
      return cachedProfile;
    }
    console.warn("[auth] 登录失败：", result.error);
    return null;
  } catch (err) {
    console.error("[auth] 云函数调用异常：", err);
    return null;
  }
}

/**
 * 用户主动授权昵称/头像后调用，更新云端并刷新本地缓存。
 * 需配合 <button open-type="chooseAvatar"> 和 <input type="nickname"> 使用。
 */
export async function updateProfile(
  nickName: string,
  avatarUrl: string,
): Promise<void> {
  try {
    console.log("[auth] 更新用户信息：", { nickName, avatarUrl });
    const result = await callCloudFn<AuthResult>("auth", {
      nickName,
      avatarUrl,
    });
    console.log("[auth] 更新结果：", result);
    if (result.success && result.openid && cachedProfile) {
      cachedProfile = { ...cachedProfile, nickName, avatarUrl };
    }
  } catch (err) {
    console.error("[auth] 更新用户信息失败：", err);
  }
}

/** 获取当前已缓存的用户 profile，未登录时返回 null */
export function getUserProfile(): UserProfile | null {
  return cachedProfile;
}

/** 获取当前已缓存的 userId（openid），未登录时返回 null */
export function getUserId(): string | null {
  return cachedProfile?.openid ?? null;
}
