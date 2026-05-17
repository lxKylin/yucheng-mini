import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Search } from "@taroify/icons";

import BottomSheet from "@/components/BottomSheet";
import DoneDateSheet from "@/components/DoneDateSheet";
import MedicineCard from "@/components/MedicineCard";
import ReminderDetail from "@/components/ReminderDetail";
import ReminderForm from "@/components/ReminderForm";
import { useDerivedList, useReminderActions } from "@/hooks/useReminders";

import "./index.scss";

type FilterKey = "all" | "danger" | "warning" | "good" | "paused";
type SheetMode = "detail" | "form";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "danger", label: "逾期·今日" },
  { key: "warning", label: "7天内" },
  { key: "good", label: "正常" },
  { key: "paused", label: "暂停" },
];

export default function ListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("form");
  const [detailId, setDetailId] = useState("");
  const [editReminderId, setEditReminderId] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);
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

  const counts = useMemo<Record<FilterKey, number>>(
    () => ({
      all: allItems.length,
      danger: allItems.filter((item) => item.level === "danger").length,
      warning: allItems.filter((item) => item.level === "warning").length,
      good: allItems.filter((item) => item.level === "good").length,
      paused: allItems.filter((item) => item.level === "paused").length,
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

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  useEffect(() => {
    return () => {
      Taro.showTabBar({ animation: false });
    };
  }, []);

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

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const closeDoneSheet = () => {
    setDoneReminderId(null);
  };

  const handleAddNew = () => {
    Taro.hideTabBar({ animation: true });
    setEditReminderId(undefined);
    setFormKey((current) => current + 1);
    setSheetMode("form");
    setSheetOpen(true);
  };

  const handleDetail = (id: string) => {
    setDetailId(id);
    Taro.hideTabBar({ animation: true });
    setSheetMode("detail");
    setSheetOpen(true);
  };

  const handleEditFromDetail = (id: string) => {
    setEditReminderId(id);
    setFormKey((current) => current + 1);
    setSheetMode("form");
    setSheetOpen(true);
  };

  const handleMarkDone = (id: string) => {
    const target = allItems.find((item) => item.id === id);

    if (!target || target.status === "paused") {
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

      {!formOpen && !detailOpen ? (
        <View className="list-fab" onClick={handleAddNew}>
          <Text className="list-fab__icon">+</Text>
        </View>
      ) : null}

      <BottomSheet
        open={detailOpen}
        title="提醒详情"
        onClose={closeSheet}
        onAfterOpen={handleSheetEntered}
        onAfterClose={handleSheetExited}
      >
        {detailId ? (
          <ReminderDetail
            reminderId={detailId}
            onClose={closeSheet}
            onEdit={handleEditFromDetail}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={formOpen}
        title={editReminderId ? "编辑提醒" : "新增提醒"}
        onClose={closeSheet}
        onAfterOpen={handleSheetEntered}
        onAfterClose={handleSheetExited}
      >
        <ReminderForm
          key={formKey}
          reminderId={editReminderId}
          onSuccess={closeSheet}
          onCancel={closeSheet}
        />
      </BottomSheet>

      <DoneDateSheet
        open={doneTarget !== null}
        item={doneTarget}
        onClose={closeDoneSheet}
      />
    </View>
  );
}
