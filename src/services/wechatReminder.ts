import Taro from '@tarojs/taro';

import {
  WECHAT_REMINDER_TEMPLATE_ID,
  WECHAT_SUBSCRIPTION_STATUS
} from '@/constants';

type WechatSubscriptionStatus =
  (typeof WECHAT_SUBSCRIPTION_STATUS)[keyof typeof WECHAT_SUBSCRIPTION_STATUS];

type WechatTemplateDecision =
  | 'accept'
  | 'reject'
  | 'ban'
  | 'filter'
  | 'unknown';

interface TemplateDecisionResult {
  templateId: string;
  label: string;
  decision: WechatTemplateDecision;
}

interface ReminderSubscriptionResult {
  enabled: boolean;
  status: WechatSubscriptionStatus;
  shouldOpenSetting: boolean;
  message: string;
}

const TEMPLATE_LABELS = ['日程提醒', '药品过期提醒', '检查提醒'] as const;

function getTemplateIds() {
  return Array.from(
    new Set(
      WECHAT_REMINDER_TEMPLATE_ID.map((id) => id.trim()).filter(Boolean)
    )
  );
}

function normalizeDecision(decision: unknown): WechatTemplateDecision {
  if (
    decision === 'accept' ||
    decision === 'reject' ||
    decision === 'ban' ||
    decision === 'filter'
  ) {
    return decision;
  }

  return 'unknown';
}

function getTemplateLabel(templateId: string) {
  const index = WECHAT_REMINDER_TEMPLATE_ID.findIndex(
    (id) => id.trim() === templateId
  );

  return TEMPLATE_LABELS[index] ?? '提醒模板';
}

function buildFailureMessage(results: TemplateDecisionResult[]) {
  const rejected = results.filter((item) => item.decision === 'reject');
  const configInvalid = results.filter(
    (item) => item.decision === 'ban' || item.decision === 'filter'
  );

  if (configInvalid.length > 0) {
    return `${configInvalid.map((item) => item.label).join('、')}模板配置异常，请检查微信后台配置`;
  }

  if (rejected.length > 0) {
    return `${rejected.map((item) => item.label).join('、')}未开启订阅，请到设置中重新开启`;
  }

  return '未拿到全部提醒模板的有效订阅结果，请重试';
}

export async function requestWechatReminderSubscription(): Promise<ReminderSubscriptionResult> {
  const templateIds = getTemplateIds();

  if (templateIds.length === 0) {
    return {
      enabled: false,
      status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
      shouldOpenSetting: false,
      message: '请先配置订阅消息模板 ID'
    };
  }

  try {
    const res = await Taro.requestSubscribeMessage({
      tmplIds: templateIds
    } as Taro.requestSubscribeMessage.Option);
    const response = res as Record<string, unknown>;
    const templateResults = templateIds.map<TemplateDecisionResult>(
      (templateId) => ({
        templateId,
        label: getTemplateLabel(templateId),
        decision: normalizeDecision(response[templateId])
      })
    );

    console.log('[wechatReminder] 订阅消息授权结果：', templateResults);

    const allAccepted = templateResults.every(
      (item) => item.decision === 'accept'
    );

    if (allAccepted) {
      return {
        enabled: true,
        status: WECHAT_SUBSCRIPTION_STATUS.ACCEPTED,
        shouldOpenSetting: false,
        message: '订阅消息已开启'
      };
    }

    const hasRejected = templateResults.some(
      (item) => item.decision === 'reject'
    );
    const hasConfigInvalid = templateResults.some(
      (item) => item.decision === 'ban' || item.decision === 'filter'
    );

    return {
      enabled: false,
      status: hasRejected
        ? WECHAT_SUBSCRIPTION_STATUS.REJECTED
        : WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
      shouldOpenSetting: hasRejected && !hasConfigInvalid,
      message: buildFailureMessage(templateResults)
    };
  } catch (error) {
    console.error('[wechatReminder] 订阅消息授权失败：', error);
    const errCode =
      typeof error === 'object' && error !== null && 'errCode' in error
        ? Number(error.errCode)
        : undefined;

    const message =
      errCode === 20001
        ? '当前小程序下找不到这个订阅消息模板，请检查模板 ID 和微信后台配置'
        : '授权请求失败，请重试';

    return {
      enabled: false,
      status: WECHAT_SUBSCRIPTION_STATUS.UNKNOWN,
      shouldOpenSetting: false,
      message
    };
  }
}
