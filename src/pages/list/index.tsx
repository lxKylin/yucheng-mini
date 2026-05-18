import { useMemo, useState } from "react";
import { Input, Text, View } from "@tarojs/components";
import Taro, { useShareAppMessage, useShareTimeline } from "@tarojs/taro";
import { Search } from "@taroify/icons";

import { REMINDER_LEVEL, REMINDER_STATUS } from "@/constants";
import BottomSheet from "@/components/BottomSheet";
import DoneDateSheet from "@/components/DoneDateSheet";
import FloatingAddReminder from "@/components/FloatingAddReminder";
import MedicineCard from "@/components/MedicineCard";
import ReminderDetail from "@/components/ReminderDetail";
import ReminderForm from "@/components/ReminderForm";
import { useDerivedList, useReminderActions } from "@/hooks/useReminders";
import type { ReminderLevel } from "@/types";
import { useTabScrollToTop } from "@/hooks/useTabScrollToTop";
import { useReminderSheet } from "@/hooks/useReminderSheet";

import "./index.scss";

const LIST_SHARE_TITLE = "愈程记：把开药提醒管理得更清楚";
const LIST_SHARE_IMAGE = "/assets/images/logo.png";

type FilterKey = "all" | ReminderLevel;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: REMINDER_LEVEL.DANGER, label: "逾期·今日" },
  { key: REMINDER_LEVEL.WARNING, label: "7天内" },
  { key: REMINDER_LEVEL.GOOD, label: "正常" },
  { key: REMINDER_LEVEL.PAUSED, label: "暂停" },
];

export default function ListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);
  useTabScrollToTop();

  const {
    detailId,
    editReminderId,
    formKey,
    sheetActive,
    sheetMode,
    sheetOpen,
    sheetTitle,
    closeSheet,
    handleFormSuccess,
    handleSheetExited,
    openCreate,
    openDetail,
    openEdit,
  } = useReminderSheet();

  const allItems = useDerivedList();
  const { markDone } = useReminderActions();

  const doneTarget =
    doneReminderId === null
      ? null
      : (allItems.find((item) => item.id === doneReminderId) ?? null);

  const counts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: allItems.length,
      [REMINDER_LEVEL.DANGER]: allItems.filter(
        (item) => item.level === REMINDER_LEVEL.DANGER,
      ).length,
      [REMINDER_LEVEL.WARNING]: allItems.filter(
        (item) => item.level === REMINDER_LEVEL.WARNING,
      ).length,
      [REMINDER_LEVEL.GOOD]: allItems.filter(
        (item) => item.level === REMINDER_LEVEL.GOOD,
      ).length,
      [REMINDER_LEVEL.PAUSED]: allItems.filter(
        (item) => item.level === REMINDER_LEVEL.PAUSED,
      ).length,
    }),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allItems.filter((item) => {
      const byFilter = activeFilter === "all" || item.level === activeFilter;
      const bySearch =
        !term ||
        item.medicineName.toLowerCase().includes(term) ||
        item.medicineSpec.toLowerCase().includes(term);

      return byFilter && bySearch;
    });
  }, [activeFilter, allItems, searchTerm]);

  const closeDoneSheet = () => {
    setDoneReminderId(null);
  };

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
      success: async (result) => {
        if (!result.confirm) {
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

  Taro.useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ["shareAppMessage", "shareTimeline"],
    });
  });

  useShareAppMessage(() => ({
    title: LIST_SHARE_TITLE,
    path: "/pages/home/index",
    imageUrl: LIST_SHARE_IMAGE,
  }));

  useShareTimeline(() => ({
    title: "愈程记：长期用药提醒整理工具",
    query: "from=list-timeline",
    imageUrl: LIST_SHARE_IMAGE,
  }));

  return (
    <View className="list-page">
      <View className="list-search">
        <View className="list-search__icon" aria-hidden="true">
          <Search />
        </View>
        <Input
          className="list-search__input"
          value={searchTerm}
          placeholder="搜索药物名称或规格"
          placeholderClass="list-search__placeholder"
          onInput={(event) => setSearchTerm(event.detail.value)}
        />
      </View>

      <View className="list-filters">
        {FILTER_TABS.map(({ key, label }) => (
          <View
            key={key}
            className={`list-filter${activeFilter === key ? " list-filter--active" : ""}`}
            onClick={() => setActiveFilter(key)}
          >
            <Text className="list-filter__text">
              {label} {counts[key]}
            </Text>
          </View>
        ))}
      </View>

      <View className="list-content">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <MedicineCard
              key={item.id}
              item={item}
              showActions
              onDone={() => handleMarkDone(item.id)}
              onDetail={() => openDetail(item.id)}
            />
          ))
        ) : (
          <View className="list-empty">
            <Text className="list-empty__icon">💊</Text>
            <Text className="list-empty__text">
              {searchTerm.trim()
                ? "没有符合条件的提醒"
                : "暂无提醒，点击下方 + 添加"}
            </Text>
          </View>
        )}
      </View>

      <FloatingAddReminder hidden={sheetActive} onClick={openCreate} />

      <BottomSheet
        open={sheetOpen}
        title={sheetTitle}
        onClose={closeSheet}
        onAfterClose={handleSheetExited}
      >
        {sheetMode === "detail" && detailId ? (
          <ReminderDetail
            reminderId={detailId}
            onClose={closeSheet}
            onEdit={openEdit}
          />
        ) : null}
        {sheetMode === "form" ? (
          <ReminderForm
            key={formKey}
            reminderId={editReminderId}
            onSuccess={handleFormSuccess}
            onCancel={closeSheet}
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
