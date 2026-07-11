import { useState } from 'react';

export type ReminderSheetMode = 'detail' | 'form';

export function useReminderSheet() {
  const [formKey, setFormKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetActive, setSheetActive] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [sheetMode, setSheetMode] = useState<ReminderSheetMode>('form');
  const [detailId, setDetailId] = useState('');
  const [editReminderId, setEditReminderId] = useState<string | undefined>();
  const [defaultReminderEnabled, setDefaultReminderEnabled] = useState(true);

  const sheetTitle =
    sheetMode === 'detail'
      ? '提醒详情'
      : editReminderId
        ? '编辑药品'
        : defaultReminderEnabled
          ? '新增开药提醒'
          : '新增药品';

  const openDetail = (id: string) => {
    setFormSubmitting(false);
    setEditReminderId(undefined);
    setDetailId(id);
    setSheetMode('detail');
    setSheetActive(true);
    setSheetOpen(true);
  };

  const openCreate = (nextDefaultReminderEnabled = true) => {
    setFormSubmitting(false);
    setDefaultReminderEnabled(nextDefaultReminderEnabled);
    setFormKey((current) => current + 1);
    setDetailId('');
    setEditReminderId(undefined);
    setSheetMode('form');
    setSheetActive(true);
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
    setFormSubmitting(false);
    setDefaultReminderEnabled(true);
    setDetailId('');
    setEditReminderId(id);
    setSheetMode('form');
    setSheetActive(true);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const handleFormSuccess = () => {
    if (!editReminderId) {
      setFormKey((current) => current + 1);
    }

    closeSheet();
  };

  const handleSheetExited = () => {
    setFormSubmitting(false);
    setSheetActive(false);
    setDetailId('');
    setEditReminderId(undefined);
  };

  return {
    defaultReminderEnabled,
    detailId,
    editReminderId,
    formSubmitting,
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
    setFormSubmitting
  };
}
