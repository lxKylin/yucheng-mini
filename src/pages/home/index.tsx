import { useEffect, useRef, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";

import { REMINDER_STATUS } from "@/constants";
import BottomSheet from "@/components/BottomSheet";
import DoneDateSheet from "@/components/DoneDateSheet";
import MedicineCard from "@/components/MedicineCard";
import ReminderDetail from "@/components/ReminderDetail";
import ReminderForm from "@/components/ReminderForm";
import { useDerivedList, useReminderActions } from "@/hooks/useReminders";

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
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
  const sheetOpenRef = useRef(sheetOpen);
  const allItems = useDerivedList();
  const { markDone } = useReminderActions();

  const formOpen = sheetOpen && sheetMode === "form";
  const detailOpen = sheetOpen && sheetMode === "detail";
  const doneTarget =
    doneReminderId === null
      ? null
      : (allItems.find((item) => item.id === doneReminderId) ?? null);

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
    (item) => item.status !== REMINDER_STATUS.PAUSED && item.daysLeft < 0,
  ).length;
  const todayCount = allItems.filter(
    (item) => item.status !== REMINDER_STATUS.PAUSED && item.daysLeft === 0,
  ).length;
  const total = allItems.length;
  const hasDanger = overdueCount > 0 || todayCount > 0;
  const urgent = allItems
    .filter((item) => item.status !== REMINDER_STATUS.PAUSED)
    .slice(0, 3);
  const hasRecords = total > 0;

  const handleMarkDone = (id: string) => {
    const target = allItems.find((item) => item.id === id);

    if (!target || target.status === REMINDER_STATUS.PAUSED) {
      return;
    }

    if (target.daysLeft < 0) {
      setDoneReminderId(id);
      return;
    }

    Taro.showModal({
      title: "确认已开药",
      content: `确认已完成「${target.medicineName}」本次开药吗？系统会更新最近一盒日期并推算下一次提醒。`,
      confirmText: "确认",
      cancelText: "取消",
      confirmColor: "#157a66",
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        try {
          await markDone(id);
          Taro.showToast({
            title: `${target.medicineName} 已进入下一轮周期`,
            icon: "success",
            duration: 1500,
          });
        } catch {
          Taro.showToast({
            title: "更新失败，请稍后重试",
            icon: "none",
            duration: 1800,
          });
        }
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

  const closeDoneSheet = () => {
    setDoneReminderId(null);
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
        <View className="home-subhead__main">
          <Text className="home-subhead__title">最近提醒</Text>
          <Text className="home-subhead__desc">
            仅展示最近 3 条，更多提醒请查看全部
          </Text>
        </View>
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
          <View className="home-empty home-empty--card">
            <Text className="home-empty__badge">
              {hasRecords ? "当前节奏稳定" : "开始建立提醒"}
            </Text>
            <Text className="home-empty__title">
              {hasRecords ? "暂无待处理提醒" : "还没有开药提醒"}
            </Text>
            <Text className="home-empty__desc">
              {hasRecords
                ? "你最近没有需要立即处理的任务，下一次临近提醒会优先显示在这里。"
                : "新增第一条提醒后，这里会显示最近需要处理的开药任务。"}
            </Text>
            {!hasRecords ? (
              <Text className="home-empty__hint">
                点击右下角 + 开始新增提醒
              </Text>
            ) : null}
          </View>
        )}
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

      <DoneDateSheet
        open={doneTarget !== null}
        item={doneTarget}
        onClose={closeDoneSheet}
      />
    </View>
  );
}
