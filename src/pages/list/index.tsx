import { useMemo, useState } from "react";
import { Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
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

import "./index.scss";

type FilterKey = "all" | ReminderLevel;
type SheetMode = "detail" | "form";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetActive, setSheetActive] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("form");
  const [detailId, setDetailId] = useState("");
  const [editReminderId, setEditReminderId] = useState<string | undefined>();
  const [doneReminderId, setDoneReminderId] = useState<string | null>(null);

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

  const handleSheetExited = () => {
    setSheetActive(false);
    setDetailId("");
    setEditReminderId(undefined);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const closeDoneSheet = () => {
    setDoneReminderId(null);
  };

  const handleDetail = (id: string) => {
    setDetailId(id);
    setSheetMode("detail");
    setSheetActive(true);
    setSheetOpen(true);
  };

  const handleEditFromDetail = (id: string) => {
    setEditReminderId(id);
    setSheetMode("form");
    setSheetActive(true);
    setSheetOpen(true);
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
              onDetail={() => handleDetail(item.id)}
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

      <FloatingAddReminder hidden={sheetActive} />

      <BottomSheet
        open={sheetOpen}
        title={
          sheetMode === "detail"
            ? "提醒详情"
            : editReminderId
              ? "编辑提醒"
              : "新增提醒"
        }
        onClose={closeSheet}
        onAfterClose={handleSheetExited}
      >
        {sheetMode === "detail" && detailId ? (
          <ReminderDetail
            reminderId={detailId}
            onClose={closeSheet}
            onEdit={handleEditFromDetail}
          />
        ) : null}
        {sheetMode === "form" ? (
          <ReminderForm
            reminderId={editReminderId}
            onSuccess={closeSheet}
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
