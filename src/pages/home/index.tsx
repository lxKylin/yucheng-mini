import { useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";

import AppBar from "@/components/AppBar";
import BottomSheet from "@/components/BottomSheet";
import MedicineCard from "@/components/MedicineCard";
import ReminderForm from "@/components/ReminderForm";
import { useDerivedList, useReminderActions } from "@/hooks/useReminders";
import { formatDisplay, parseDate } from "@/utils/dateUtils";

import "./index.scss";

export default function Home() {
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const allItems = useDerivedList();
  const { markDone } = useReminderActions();

  const handleSheetEntered = () => {
    Taro.hideTabBar({ animation: true });
  };

  const handleSheetExited = () => {
    Taro.showTabBar({ animation: true });
  };

  const closeFormSheet = () => {
    setFormOpen(false);
  };

  useEffect(() => {
    return () => {
      Taro.showTabBar({ animation: false });
    };
  }, []);

  const overdueCount = allItems.filter(
    (item) => item.status !== "paused" && item.daysLeft < 0,
  ).length;
  const todayCount = allItems.filter(
    (item) => item.status !== "paused" && item.daysLeft === 0,
  ).length;
  const total = allItems.length;
  const hasDanger = overdueCount > 0 || todayCount > 0;
  const urgent = allItems
    .filter((item) => item.status !== "paused")
    .slice(0, 3);

  const now = new Date();
  const todayStr = `${now.getMonth() + 1}月${now.getDate()}日，先处理最紧急的开药任务`;

  const handleMarkDone = (id: string) => {
    markDone(id);
    Taro.showToast({ title: "已记录开药", icon: "success", duration: 1500 });
  };

  const handleViewAll = () => {
    Taro.switchTab({ url: "/pages/list/index" });
  };

  const handleAddNew = () => {
    console.log("add new reminder");
    Taro.hideTabBar({ animation: true });
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  // TODO: M6 接入后替换为打开详情 BottomSheet。
  const handleDetail = (_id: string) => {
    Taro.showToast({ title: "详情开发中", icon: "none", duration: 1200 });
  };

  useLoad(() => {
    console.log("home page loaded");
  });

  return (
    <View className="home-page">
      <AppBar title="首页总览" caption={todayStr} />

      <View className={`home-hero${hasDanger ? " home-hero--danger" : ""}`}>
        <Text className="home-hero__eyebrow">今日待办</Text>
        <Text className="home-hero__title">
          {overdueCount} 个已逾期，{todayCount} 个今天到期
        </Text>
        <Text className="home-hero__desc">
          {hasDanger
            ? "建议先完成逾期或今日到期事项，再检查未来 7 天内需要提前挂号的药物。"
            : "近期没有紧急开药任务，继续保持当前记录节奏。"}
        </Text>
      </View>

      <View className="home-metrics">
        <View className="home-metric">
          <Text className="home-metric__value">{overdueCount}</Text>
          <Text className="home-metric__label">已逾期</Text>
        </View>
        <View className="home-metric">
          <Text className="home-metric__value">{todayCount}</Text>
          <Text className="home-metric__label">今日处理</Text>
        </View>
        <View className="home-metric">
          <Text className="home-metric__value">{total}</Text>
          <Text className="home-metric__label">管理中</Text>
        </View>
      </View>

      <View className="home-subhead">
        <Text className="home-subhead__title">最近待开药提醒</Text>
        <View className="home-subhead__action" onClick={handleViewAll}>
          <Text>查看全部</Text>
        </View>
      </View>
      <View className="home-cards">
        {urgent.length > 0 ? (
          urgent.map((item) => (
            <MedicineCard
              key={item.id}
              item={item}
              onDone={() => handleMarkDone(item.id)}
              onDetail={() => handleDetail(item.id)}
            />
          ))
        ) : (
          <View className="home-empty">
            <Text>暂无待处理提醒</Text>
          </View>
        )}
      </View>

      <View className="home-subhead">
        <Text className="home-subhead__title">近期时间线</Text>
      </View>
      <View className="home-timeline">
        {urgent.map((item) => {
          const nextDate = parseDate(item.nextDate);
          const remindDate = formatDisplay(parseDate(item.remindAt));
          const dateShort = `${nextDate.getMonth() + 1}/${nextDate.getDate()}`;

          return (
            <View key={`tl-${item.id}`} className="home-timeline__item">
              <View className="home-timeline__date">
                {item.daysLeft <= 0 ? (
                  <Text className="home-timeline__date-main">今天</Text>
                ) : (
                  <Text className="home-timeline__date-main">{dateShort}</Text>
                )}
              </View>
              <View className="home-timeline__body">
                <Text className="home-timeline__name">{item.name}</Text>
                <Text className="home-timeline__desc">
                  {item.levelLabel} · 预计下次开药 {item.nextDate}，提醒时间{" "}
                  {remindDate} {item.time}。
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {!formOpen ? (
        <View className="home-fab" onClick={handleAddNew}>
          <Text className="home-fab__icon">+</Text>
        </View>
      ) : null}

      <BottomSheet
        open={formOpen}
        title="新增提醒"
        onClose={closeFormSheet}
        onAfterOpen={handleSheetEntered}
        onAfterClose={handleSheetExited}
      >
        <ReminderForm
          key={formKey}
          onSuccess={closeFormSheet}
          onCancel={closeFormSheet}
        />
      </BottomSheet>
    </View>
  );
}
