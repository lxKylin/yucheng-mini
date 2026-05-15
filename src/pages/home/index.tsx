import { useEffect, useRef, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";

import AppBar from "@/components/AppBar";
import BottomSheet from "@/components/BottomSheet";
import MedicineCard from "@/components/MedicineCard";
import ReminderDetail from "@/components/ReminderDetail";
import ReminderForm from "@/components/ReminderForm";
import { useDerivedList, useReminderActions } from "@/hooks/useReminders";
import { formatDisplay, parseDate } from "@/utils/dateUtils";

import "./index.scss";

type SheetMode = "detail" | "form";

export default function Home() {
  const [formKey, setFormKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("form");
  const [detailId, setDetailId] = useState("");
  const [editReminderId, setEditReminderId] = useState<string | undefined>(
    undefined,
  );
  const sheetOpenRef = useRef(sheetOpen);
  const allItems = useDerivedList();
  const { markDone } = useReminderActions();

  const formOpen = sheetOpen && sheetMode === "form";
  const detailOpen = sheetOpen && sheetMode === "detail";

  const handleSheetEntered = () => {
    Taro.hideTabBar({ animation: true });
  };

  const handleSheetExited = () => {
    if (sheetOpenRef.current) {
      return;
    }

    setDetailId("");
    setEditReminderId(undefined);
    Taro.showTabBar({ animation: true });
  };

  const closeFormSheet = () => {
    setSheetOpen(false);
  };

  const closeDetailSheet = () => {
    setSheetOpen(false);
  };

  const handleEditFromDetail = (id: string) => {
    setEditReminderId(id);
    setFormKey((key) => key + 1);
    setSheetMode("form");
    setSheetOpen(true);
  };

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

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
    const target = allItems.find((item) => item.id === id);

    if (!target) {
      return;
    }

    Taro.showModal({
      title: "确认已开药",
      content: `确认已完成「${target.name}」本次开药吗？系统会更新最近开药日期并推算下一次提醒。`,
      confirmText: "确认",
      cancelText: "取消",
      confirmColor: "#157a66",
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        markDone(id);
        Taro.showToast({
          title: `${target.name} 已进入下一轮周期`,
          icon: "success",
          duration: 1500,
        });
      },
    });
  };

  const handleViewAll = () => {
    Taro.switchTab({ url: "/pages/list/index" });
  };

  const handleAddNew = () => {
    Taro.hideTabBar({ animation: true });
    setEditReminderId(undefined);
    setFormKey((key) => key + 1);
    setSheetMode("form");
    setSheetOpen(true);
  };

  const handleDetail = (id: string) => {
    setDetailId(id);
    Taro.hideTabBar({ animation: true });
    setSheetMode("detail");
    setSheetOpen(true);
  };

  useLoad(() => {
    console.log("home page loaded");
  });

  return (
    <View className="home-page">
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
        <Text className="home-subhead__title">最近提醒</Text>
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

      {!formOpen && !detailOpen ? (
        <View className="home-fab" onClick={handleAddNew}>
          <Text className="home-fab__icon">+</Text>
        </View>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        title={
          sheetMode === "detail"
            ? "提醒详情"
            : editReminderId
              ? "编辑提醒"
              : "新增提醒"
        }
        onClose={sheetMode === "detail" ? closeDetailSheet : closeFormSheet}
        onAfterOpen={handleSheetEntered}
        onAfterClose={handleSheetExited}
      >
        {sheetMode === "detail" && detailId ? (
          <ReminderDetail
            reminderId={detailId}
            onClose={closeDetailSheet}
            onEdit={handleEditFromDetail}
          />
        ) : null}
        {sheetMode === "form" ? (
          <ReminderForm
            key={formKey}
            reminderId={editReminderId}
            onSuccess={closeFormSheet}
            onCancel={closeFormSheet}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}
