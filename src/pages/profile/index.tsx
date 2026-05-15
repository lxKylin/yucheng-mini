import { useState } from "react";
import { Arrow, UserCircleOutlined } from "@taroify/icons";
import { Button, Image, Input, Picker, Text, View } from "@tarojs/components";
import type {
  BaseEventOrig,
  InputProps,
  PickerSelectorProps,
  PickerTimeProps,
} from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";

import AppBar from "@/components/AppBar";
import BottomSheet from "@/components/BottomSheet";
import { BEFORE_OPTIONS, BEFORE_OPTIONS_LABEL } from "@/constants";
import { useProfileStats } from "@/hooks/useReminders";
import { getUserId, getUserProfile, updateProfile } from "@/services/auth";
import { loadSettings, saveSettings } from "@/utils/storage";
import type { AppSettings } from "@/utils/storage";

import "./index.scss";

type TimePickerEvent = BaseEventOrig<PickerTimeProps.onChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;

export default function Profile() {
  const stats = useProfileStats();
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profile, setProfile] = useState(getUserProfile);
  const [nickName, setNickName] = useState(
    () => getUserProfile()?.nickName ?? "",
  );

  useLoad(() => {
    setSettings(loadSettings());
    const p = getUserProfile();
    setProfile(p);
    setNickName(p?.nickName ?? "");
  });

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const handleChooseAvatar = async (
    e: BaseEventOrig<{ avatarUrl: string }>,
  ) => {
    const tmpPath = e.detail.avatarUrl;
    // tmp 路径跨会话失效，必须先上传到云存储获取永久 fileID
    try {
      Taro.showLoading({ title: "上传中…", mask: true });
      const ext = tmpPath.split(".").pop() ?? "jpg";
      const { fileID } = await Taro.cloud.uploadFile({
        cloudPath: `avatars/${getUserId()}.${ext}`,
        filePath: tmpPath,
      });
      await updateProfile(nickName, fileID);
      setProfile(getUserProfile());
    } catch (err) {
      console.error("[profile] 头像上传失败：", err);
      Taro.showToast({
        title: "头像上传失败，请重试",
        icon: "none",
        duration: 1500,
      });
    } finally {
      Taro.hideLoading();
    }
  };

  const handleNicknameInput = (
    e: BaseEventOrig<InputProps.inputValueEventDetail>,
  ) => {
    setNickName(e.detail.value);
  };

  const handleNicknameBlur = (
    e: BaseEventOrig<InputProps.inputValueEventDetail>,
  ) => {
    const value = e.detail.value.trim();
    if (!value || value === profile?.nickName) return;
    updateProfile(value, profile?.avatarUrl ?? "").then(() => {
      setProfile(getUserProfile());
    });
  };

  const handleToggleSubscribe = async () => {
    // 关闭订阅：仅更新本地状态，微信侧已授权无法程序化撤销
    if (settings.subscribeEnabled) {
      updateSettings({ subscribeEnabled: false });
      Taro.showToast({ title: "已关闭订阅消息", icon: "none", duration: 1200 });
      return;
    }

    // 开启订阅：调用微信授权弹层
    // YOUR_TEMPLATE_ID 与云函数中一致，部署前替换为真实模板 ID
    const TEMPLATE_ID = "YOUR_TEMPLATE_ID";

    try {
      const res = await Taro.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
      });
      const accepted = res[TEMPLATE_ID] === "accept";
      updateSettings({ subscribeEnabled: accepted });
      Taro.showToast({
        title: accepted
          ? "订阅消息已开启"
          : "授权被拒绝，可在系统设置中重新授权",
        icon: accepted ? "success" : "none",
        duration: 1800,
      });
    } catch (err) {
      console.error("[profile] 订阅消息授权失败：", err);
      Taro.showToast({
        title: "授权请求失败，请重试",
        icon: "none",
        duration: 1500,
      });
    }
  };

  const handleTimeChange = (e: TimePickerEvent) => {
    updateSettings({ defaultTime: e.detail.value });
    Taro.showToast({
      title: `默认提醒时间已设为 ${e.detail.value}`,
      icon: "none",
      duration: 1200,
    });
  };

  const beforeIdx = BEFORE_OPTIONS.indexOf(
    settings.defaultBefore as (typeof BEFORE_OPTIONS)[number],
  );
  const safeBeforeIdx = beforeIdx >= 0 ? beforeIdx : 0;

  const handleBeforeChange = (e: SelectorPickerEvent) => {
    const idx = Number(e.detail.value);
    const days = BEFORE_OPTIONS[idx] ?? BEFORE_OPTIONS[0];
    updateSettings({ defaultBefore: days });
    Taro.showToast({
      title: `默认提前天数已设为 ${days} 天`,
      icon: "none",
      duration: 1200,
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
              管理中 {stats.total} 个提醒
              {/* · 历史 {stats.historyTotal} 次开药 */}
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
                到点后自动发送微信提醒
              </Text>
            </View>
            <View
              className={`profile-page__switch${settings.subscribeEnabled ? " profile-page__switch--on" : ""}`}
              onClick={handleToggleSubscribe}
              role="switch"
              aria-checked={settings.subscribeEnabled}
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
