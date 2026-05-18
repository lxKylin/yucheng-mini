import { callCloudFn } from './cloud';

import { USER_WECHAT_SUBSCRIPTION_STATUS } from '@/constants';
import type { UserWechatSubscriptionStatus } from '@/types';

interface AuthResult {
  success: boolean;
  openid?: string;
  nickName?: string;
  avatarUrl?: string;
  wechatSubscriptionStatus?: UserWechatSubscriptionStatus;
  wechatSubscriptionUpdatedAt?: string;
  error?: string;
}

export interface UserProfile {
  openid: string;
  nickName: string;
  avatarUrl: string;
  wechatSubscriptionStatus: UserWechatSubscriptionStatus;
  wechatSubscriptionUpdatedAt: string;
}

let cachedProfile: UserProfile | null = null;

function toUserProfile(result: AuthResult): UserProfile | null {
  if (!result.success || !result.openid) return null;

  return {
    openid: result.openid,
    nickName: result.nickName ?? '',
    avatarUrl: result.avatarUrl ?? '',
    wechatSubscriptionStatus:
      result.wechatSubscriptionStatus ??
      USER_WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
    wechatSubscriptionUpdatedAt: result.wechatSubscriptionUpdatedAt ?? ''
  };
}

/**
 * 调用 auth 云函数完成微信登录，获取并缓存用户信息。
 * 重复调用直接返回缓存值。
 */
export async function login(): Promise<UserProfile | null> {
  if (cachedProfile) return cachedProfile;

  try {
    const result = await callCloudFn<AuthResult>('auth');
    console.log('[auth] 登录结果：', result);
    const profile = toUserProfile(result);
    if (profile) {
      cachedProfile = profile;
      return cachedProfile;
    }
    console.warn('[auth] 登录失败：', result.error);
    return null;
  } catch (err) {
    console.error('[auth] 云函数调用异常：', err);
    return null;
  }
}

/**
 * 用户主动授权昵称/头像后调用，更新云端并刷新本地缓存。
 * 需配合 <button open-type="chooseAvatar"> 和 <input type="nickname"> 使用。
 */
export async function updateProfile(
  nickName: string,
  avatarUrl: string
): Promise<void> {
  try {
    console.log('[auth] 更新用户信息：', { nickName, avatarUrl });
    const result = await callCloudFn<AuthResult>('auth', {
      nickName,
      avatarUrl
    });
    console.log('[auth] 更新结果：', result);
    const profile = toUserProfile(result);
    if (profile) {
      cachedProfile = profile;
    }
  } catch (err) {
    console.error('[auth] 更新用户信息失败：', err);
  }
}

export async function refreshUserProfile(): Promise<UserProfile | null> {
  try {
    const result = await callCloudFn<AuthResult>('auth');
    const profile = toUserProfile(result);
    if (profile) {
      cachedProfile = profile;
      return cachedProfile;
    }
    return cachedProfile;
  } catch (err) {
    console.error('[auth] 刷新用户信息失败：', err);
    return cachedProfile;
  }
}

export async function updateWechatSubscriptionStatus(
  status: UserWechatSubscriptionStatus
): Promise<UserProfile | null> {
  try {
    const result = await callCloudFn<AuthResult>('auth', {
      wechatSubscriptionStatus: status
    });
    const profile = toUserProfile(result);
    if (profile) {
      cachedProfile = profile;
      return cachedProfile;
    }
    return cachedProfile;
  } catch (err) {
    console.error('[auth] 更新微信订阅资格失败：', err);
    return cachedProfile;
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
