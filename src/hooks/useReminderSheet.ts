import { useState } from "react";

export type ReminderSheetMode = "detail" | "form";

export function useReminderSheet() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetActive, setSheetActive] = useState(false);
  const [sheetMode, setSheetMode] = useState<ReminderSheetMode>("form");
  const [detailId, setDetailId] = useState("");
  const [editReminderId, setEditReminderId] = useState<string | undefined>();

  const sheetTitle =
    sheetMode === "detail"
      ? "提醒详情"
      : editReminderId
        ? "编辑提醒"
        : "新增提醒";

  const openDetail = (id: string) => {
    setDetailId(id);
    setSheetMode("detail");
    setSheetActive(true);
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
    setEditReminderId(id);
    setSheetMode("form");
    setSheetActive(true);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const handleSheetExited = () => {
    setSheetActive(false);
    setDetailId("");
    setEditReminderId(undefined);
  };

  return {
    detailId,
    editReminderId,
    sheetActive,
    sheetMode,
    sheetOpen,
    sheetTitle,
    closeSheet,
    handleSheetExited,
    openDetail,
    openEdit,
  };
}
