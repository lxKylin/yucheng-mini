import { useState } from 'react';
import { UserCircleOutlined } from '@taroify/icons';
import { Button, Image, Input, Picker, Text, View } from '@tarojs/components';
import type {
  BaseEventOrig,
  InputProps,
  PickerSelectorProps,
  PickerTimeProps
} from '@tarojs/components';
import Taro, {
  useLoad,
  useDidShow,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';

import BottomSheet from '@/components/BottomSheet';
import {
  BEFORE_OPTIONS,
  BEFORE_OPTIONS_LABEL,
  USER_WECHAT_SUBSCRIPTION_STATUS,
  SHARE_IMAGE,
  SHARE_PATH
} from '@/constants';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';
import { useProfileStats } from '@/hooks/useReminders';
import {
  getUserId,
  getUserProfile,
  refreshUserProfile,
  updateProfile,
  updateWechatSubscriptionStatus
} from '@/services/auth';
import { requestWechatReminderSubscription } from '@/services/wechatReminder';
import { loadSettings, saveSettings } from '@/utils/storage';
import type { AppSettings } from '@/utils/storage';

import './index.scss';

type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;

function getSubscriptionSummary(status?: string) {
  if (status === USER_WECHAT_SUBSCRIPTION_STATUS.AVAILABLE) {
    return {
      enabled: true,
      label: '已获得下一次提醒授权',
      desc: '下一条命中的提醒会消耗这次微信发送授权'
    };
  }

  if (status === USER_WECHAT_SUBSCRIPTION_STATUS.REJECTED) {
    return {
      enabled: false,
      label: '尚未获得提醒授权',
      desc: '你之前拒绝过授权，需要重新发起订阅请求'
    };
  }

  return {
    enabled: false,
    label: '尚未获得提醒授权',
    desc: '一次性订阅消息发送后会自动失效，需要再次授权'
  };
}

export default function Profile() {
  const stats = useProfileStats();
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [inboxOpen, setInboxOpen] = useState(false);
  useTabScrollToTop();

  const [profile, setProfile] = useState(getUserProfile);
  const [nickName, setNickName] = useState(
    () => getUserProfile()?.nickName ?? ''
  );

  useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });

    setSettings(loadSettings());
    const p = getUserProfile();
    setProfile(p);
    setNickName(p?.nickName ?? '');
  });

  useShareAppMessage(() => ({
    title: '愈历：把开药提醒管理得更清楚',
    path: SHARE_PATH,
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：长期用药提醒整理工具',
    query: 'from=list-timeline',
    imageUrl: SHARE_IMAGE
  }));

  useDidShow(() => {
    void refreshUserProfile().then((nextProfile) => {
      if (!nextProfile) return;
      setProfile(nextProfile);
      setNickName(nextProfile.nickName ?? '');
    });
  });

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const handleChooseAvatar = async (
    e: BaseEventOrig<{ avatarUrl: string }>
  ) => {
    const tmpPath = e.detail.avatarUrl;
    // tmp 路径跨会话失效，必须先上传到云存储获取永久 fileID
    try {
      Taro.showLoading({ title: '上传中…', mask: true });
      const ext = tmpPath.split('.').pop() ?? 'jpg';
      const { fileID } = await Taro.cloud.uploadFile({
        cloudPath: `avatars/${getUserId()}.${ext}`,
        filePath: tmpPath
      });
      await updateProfile(nickName, fileID);
      setProfile(getUserProfile());
    } catch (err) {
      console.error('[profile] 头像上传失败：', err);
      Taro.showToast({
        title: '头像上传失败，请重试',
        icon: 'none',
        duration: 1500
      });
    } finally {
      Taro.hideLoading();
    }
  };

  const handleNicknameInput = (
    e: BaseEventOrig<InputProps.inputValueEventDetail>
  ) => {
    setNickName(e.detail.value);
  };

  const handleNicknameBlur = (
    e: BaseEventOrig<InputProps.inputValueEventDetail>
  ) => {
    const value = e.detail.value.trim();
    if (!value || value === profile?.nickName) return;
    updateProfile(value, profile?.avatarUrl ?? '').then(() => {
      setProfile(getUserProfile());
    });
  };

  const handleToggleSubscribe = async () => {
    if (
      profile?.wechatSubscriptionStatus ===
      USER_WECHAT_SUBSCRIPTION_STATUS.AVAILABLE
    ) {
      Taro.showToast({
        title: '已获得下一次提醒授权',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    const result = await requestWechatReminderSubscription();

    if (result.enabled) {
      const nextProfile = await updateWechatSubscriptionStatus(
        USER_WECHAT_SUBSCRIPTION_STATUS.AVAILABLE
      );
      setProfile(nextProfile ?? getUserProfile());
      Taro.showToast({
        title: result.message,
        icon: 'success',
        duration: 1800
      });
      return;
    }

    if (result.status === USER_WECHAT_SUBSCRIPTION_STATUS.REJECTED) {
      const nextProfile = await updateWechatSubscriptionStatus(
        USER_WECHAT_SUBSCRIPTION_STATUS.REJECTED
      );
      setProfile(nextProfile ?? getUserProfile());
    }

    if (result.shouldOpenSetting) {
      const modalRes = await Taro.showModal({
        title: '订阅未开启',
        content: result.message,
        confirmText: '去设置',
        cancelText: '知道了'
      });

      if (modalRes.confirm) {
        await Taro.openSetting();
      }
      return;
    }

    Taro.showToast({
      title: result.message,
      icon: 'none',
      duration: 2200
    });
  };

  const handleTimeChange = (e: TimePickerEvent) => {
    updateSettings({ defaultTime: e.detail.value });
    Taro.showToast({
      title: `默认提醒时间已设为 ${e.detail.value}`,
      icon: 'none',
      duration: 1200
    });
  };

  const beforeIdx = BEFORE_OPTIONS.indexOf(
    settings.defaultBefore as (typeof BEFORE_OPTIONS)[number]
  );
  const safeBeforeIdx = beforeIdx >= 0 ? beforeIdx : 0;
  const subscriptionSummary = getSubscriptionSummary(
    profile?.wechatSubscriptionStatus
  );

  const handleBeforeChange = (e: SelectorPickerEvent) => {
    const idx = Number(e.detail.value);
    const days = BEFORE_OPTIONS[idx] ?? BEFORE_OPTIONS[0];
    updateSettings({ defaultBefore: days });
    Taro.showToast({
      title: `默认提前天数已设为 ${days} 天`,
      icon: 'none',
      duration: 1200
    });
  };

  return (
    <View className="profile-page">
      <View className="profile-page__content">
        <View className="profile-page__card">
          <Button
            className="profile-page__avatar profile-page__avatar-btn"
            openType="chooseAvatar"
            onChooseAvatar={handleChooseAvatar}
          >
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                className="profile-page__avatar-img"
                mode="aspectFill"
              />
            ) : (
              <View className="profile-page__avatar-placeholder">
                <UserCircleOutlined className="profile-page__avatar-placeholder-icon" />
                <Text className="profile-page__avatar-placeholder-hint">
                  点击设头像
                </Text>
              </View>
            )}
          </Button>
          <View>
            <Input
              className="profile-page__user-name"
              placeholderClass="profile-page__name-placeholder"
              type="nickname"
              value={nickName}
              placeholder="点击设置昵称"
              onInput={handleNicknameInput}
              onBlur={handleNicknameBlur}
            />
            <Text className="profile-page__user-meta">
              共有 {stats.total} 个药品 · {stats.activeCount} 开启提醒 ·{' '}
              {stats.checkupTotal} 个检查
            </Text>
          </View>
        </View>

        {/* <View className="profile-page__metrics">
          <View className="profile-page__metric">
            <Text className="profile-page__metric-value">
              {stats.activeCount}
            </Text>
            <Text className="profile-page__metric-label">启用中</Text>
          </View>
          <View className="profile-page__metric">
            <Text className="profile-page__metric-value">
              {stats.unreadCount}
            </Text>
            <Text className="profile-page__metric-label">未读通知</Text>
          </View>
          <View className="profile-page__metric">
            <Text className="profile-page__metric-value">
              {stats.historyTotal}
            </Text>
            <Text className="profile-page__metric-label">历史记录</Text>
          </View>
        </View> */}

        {/* <View
          className="profile-page__inbox-entry"
          onClick={() => setInboxOpen(true)}
          role="button"
        >
          <View className="profile-page__inbox-head">
            <View className="profile-page__inbox-copy">
              <Text className="profile-page__inbox-title">历史提醒记录</Text>
              <Text className="profile-page__inbox-subtitle">
                查看微信订阅消息与小程序内兜底通知
              </Text>
            </View>
            <View className="profile-page__inbox-arrow">
              <Arrow className="profile-page__inbox-arrow-icon" />
            </View>
          </View>
          <View className="profile-page__inbox-preview">
            <Text className="profile-page__inbox-preview-title">
              {stats.unreadCount > 0
                ? `当前有 ${stats.unreadCount} 条未读通知`
                : "暂无未读通知"}
            </Text>
            <Text className="profile-page__inbox-preview-meta">
              {stats.unreadCount > 0
                ? "二甲双胍开药事项已逾期 · 5/14 09:00"
                : "消息入口用于兜底查看提醒，不替代首页和列表的任务操作。"}
            </Text>
          </View>
        </View> */}

        <View className="profile-page__menu">
          <View className="profile-page__menu-item">
            <View className="profile-page__menu-copy">
              <Text className="profile-page__menu-label">订阅消息授权</Text>
              <Text className="profile-page__menu-desc">
                {subscriptionSummary.label} · {subscriptionSummary.desc}
              </Text>
            </View>
            <View
              className={`profile-page__switch${subscriptionSummary.enabled ? ' profile-page__switch--on' : ''}`}
              onClick={handleToggleSubscribe}
              role="switch"
              aria-checked={subscriptionSummary.enabled}
            />
          </View>

          <Picker
            mode="time"
            value={settings.defaultTime}
            onChange={handleTimeChange}
          >
            <View className="profile-page__menu-item">
              <View className="profile-page__menu-copy">
                <Text className="profile-page__menu-label">默认提醒时间</Text>
                <Text className="profile-page__menu-desc">
                  新建提醒时自动带入
                </Text>
              </View>
              <Text className="profile-page__menu-value">
                {settings.defaultTime}
              </Text>
            </View>
          </Picker>

          <Picker
            mode="selector"
            range={BEFORE_OPTIONS_LABEL}
            value={safeBeforeIdx}
            onChange={handleBeforeChange}
          >
            <View className="profile-page__menu-item">
              <View className="profile-page__menu-copy">
                <Text className="profile-page__menu-label">默认提前天数</Text>
                <Text className="profile-page__menu-desc">
                  建议首次使用默认 7 天
                </Text>
              </View>
              <Text className="profile-page__menu-value">
                {settings.defaultBefore} 天
              </Text>
            </View>
          </Picker>
        </View>
      </View>

      <BottomSheet
        open={inboxOpen}
        title="历史提醒记录"
        onClose={() => setInboxOpen(false)}
      >
        <View className="profile-page__inbox-placeholder">
          <Text>通知记录功能将在 M7 中实现。</Text>
        </View>
      </BottomSheet>
    </View>
  );
}
