import Taro from "@tarojs/taro";

import { WECHAT_SUBSCRIPTION_STATUS } from "@/constants";
import type { WechatSubscriptionStatus } from "@/types";

const runtimeTemplateId = (process.env.ENV_TEMPLATE_ID ?? "").trim();

export const WECHAT_REMINDER_TEMPLATE_ID = runtimeTemplateId || "";

export type WechatTemplateDecision =
  | "accept"
  | "reject"
  | "ban"
  | "filter"
  | "unknown";

export interface ReminderSubscriptionResult {
  enabled: boolean;
  status: WechatSubscriptionStatus;
  updatedAt: string;
  templateDecision: WechatTemplateDecision;
  shouldOpenSetting: boolean;
  message: string;
}

export function getWechatSubscriptionLabel(
  status: WechatSubscriptionStatus,
): string {
  if (status === WECHAT_SUBSCRIPTION_STATUS.ACCEPTED) return "已授权";
  if (status === WECHAT_SUBSCRIPTION_STATUS.REJECTED) return "未授权";
  return "待授权";
}

export function isWechatReminderTemplateConfigured(): boolean {
  return WECHAT_REMINDER_TEMPLATE_ID !== "";
}

export async function requestWechatReminderSubscription(): Promise<ReminderSubscriptionResult> {
  if (!isWechatReminderTemplateConfigured()) {
    Taro.showToast({
      title: "请先配置订阅消息模板 ID",
      icon: "none",
      duration: 1800,
    });
    return {
      enabled: false,
      status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
      updatedAt: new Date().toISOString(),
      templateDecision: "unknown",
      shouldOpenSetting: false,
      message: "请先配置订阅消息模板 ID",
    };
  }

  try {
    const res = await Taro.requestSubscribeMessage({
      tmplIds: [WECHAT_REMINDER_TEMPLATE_ID],
    } as Taro.requestSubscribeMessage.Option);
    const decision = (res[WECHAT_REMINDER_TEMPLATE_ID] ??
      "unknown") as WechatTemplateDecision;

    if (decision === "accept") {
      return {
        enabled: true,
        status: WECHAT_SUBSCRIPTION_STATUS.ACCEPTED,
        updatedAt: new Date().toISOString(),
        templateDecision: decision,
        shouldOpenSetting: false,
        message: "订阅消息已开启",
      };
    }

    if (decision === "reject") {
      return {
        enabled: false,
        status: WECHAT_SUBSCRIPTION_STATUS.REJECTED,
        updatedAt: new Date().toISOString(),
        templateDecision: decision,
        shouldOpenSetting: true,
        message:
          "你之前已拒绝过订阅，微信这次可能不会再弹窗，请到设置中重新开启",
      };
    }

    if (decision === "ban") {
      return {
        enabled: false,
        status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
        updatedAt: new Date().toISOString(),
        templateDecision: decision,
        shouldOpenSetting: false,
        message: "订阅消息模板已被微信后台禁用",
      };
    }

    if (decision === "filter") {
      return {
        enabled: false,
        status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
        updatedAt: new Date().toISOString(),
        templateDecision: decision,
        shouldOpenSetting: false,
        message: "订阅消息模板被后台过滤，请检查模板配置",
      };
    }

    return {
      enabled: false,
      status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
      updatedAt: new Date().toISOString(),
      templateDecision: decision,
      shouldOpenSetting: false,
      message: "未拿到有效的订阅结果，请重试",
    };
  } catch (error) {
    console.error("[wechatReminder] 订阅消息授权失败：", error);
    const errCode =
      typeof error === "object" && error !== null && "errCode" in error
        ? Number(error.errCode)
        : undefined;

    const message =
      errCode === 20001
        ? "当前小程序下找不到这个订阅消息模板，请检查模板 ID 和微信后台配置"
        : "授权请求失败，请重试";

    Taro.showToast({
      title: message,
      icon: "none",
      duration: 2200,
    });

    return {
      enabled: false,
      status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
      updatedAt: new Date().toISOString(),
      templateDecision: "unknown",
      shouldOpenSetting: false,
      message,
    };
  }
}
