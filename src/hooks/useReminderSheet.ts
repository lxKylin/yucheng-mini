import { useState } from 'react';

export type ReminderSheetMode = 'detail' | 'form';

export function useReminderSheet() {
  const [formKey, setFormKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetActive, setSheetActive] = useState(false);
  const [sheetMode, setSheetMode] = useState<ReminderSheetMode>('form');
  const [detailId, setDetailId] = useState('');
  const [editReminderId, setEditReminderId] = useState<string | undefined>();

  const sheetTitle =
    sheetMode === 'detail'
      ? '提醒详情'
      : editReminderId
        ? '编辑提醒'
        : '新增提醒';

  const openDetail = (id: string) => {
    setEditReminderId(undefined);
    setDetailId(id);
    setSheetMode('detail');
    setSheetActive(true);
    setSheetOpen(true);
  };

  const openCreate = () => {
    setFormKey((current) => current + 1);
    setDetailId('');
    setEditReminderId(undefined);
    setSheetMode('form');
    setSheetActive(true);
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
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
    setSheetActive(false);
    setDetailId('');
    setEditReminderId(undefined);
  };

  return {
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
    openEdit
  };
}
