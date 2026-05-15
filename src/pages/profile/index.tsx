import { useState } from "react";
import { Arrow } from "@taroify/icons";
import { Picker, Text, View } from "@tarojs/components";
import type {
  BaseEventOrig,
  PickerSelectorProps,
  PickerTimeProps,
} from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";

import AppBar from "@/components/AppBar";
import BottomSheet from "@/components/BottomSheet";
import { BEFORE_OPTIONS, BEFORE_OPTIONS_LABEL } from "@/constants";
import { useProfileStats } from "@/hooks/useReminders";
import { loadSettings, saveSettings } from "@/utils/storage";
import type { AppSettings } from "@/utils/storage";

import "./index.scss";

type TimePickerEvent = BaseEventOrig<PickerTimeProps.onChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;

export default function Profile() {
  const stats = useProfileStats();
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [inboxOpen, setInboxOpen] = useState(false);

  useLoad(() => {
    setSettings(loadSettings());
  });

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const handleToggleSubscribe = () => {
    if (!settings.subscribeEnabled) {
      Taro.showToast({
        title: "M9 接入后开启微信推送",
        icon: "none",
        duration: 1500,
      });
    }

    updateSettings({ subscribeEnabled: !settings.subscribeEnabled });
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
          <View className="profile-page__avatar">
            <Text>药</Text>
          </View>
          <View>
            <Text className="profile-page__user-name">微信用户</Text>
            <Text className="profile-page__user-meta">
              管理中 {stats.total} 个提醒 · 历史 {stats.historyTotal} 次开药
            </Text>
          </View>
        </View>

        <View className="profile-page__metrics">
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
        </View>

        <View
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
        </View>

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
