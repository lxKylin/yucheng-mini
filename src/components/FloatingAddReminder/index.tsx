import { useState } from "react";
import { Text, View } from "@tarojs/components";

import BottomSheet from "@/components/BottomSheet";
import ReminderForm from "@/components/ReminderForm";

import "./index.scss";

interface FloatingAddReminderProps {
  hidden?: boolean;
}

export default function FloatingAddReminder({
  hidden = false,
}: FloatingAddReminderProps) {
  const [open, setOpen] = useState(false);
  const [sheetActive, setSheetActive] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpen = () => {
    setFormKey((current) => current + 1);
    setSheetActive(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAfterClose = () => {
    setSheetActive(false);
  };

  return (
    <>
      {!hidden && !sheetActive ? (
        <View className="floating-add-reminder" onClick={handleOpen}>
          <Text className="floating-add-reminder__icon">+</Text>
        </View>
      ) : null}

      <BottomSheet
        open={open}
        title="新增提醒"
        onClose={handleClose}
        onAfterClose={handleAfterClose}
      >
        <ReminderForm
          key={formKey}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </BottomSheet>
    </>
  );
}
