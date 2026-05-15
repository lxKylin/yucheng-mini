import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";
import { Backdrop, Popup } from "@taroify/core";

import "./index.scss";

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
  children: ReactNode;
}

export default function BottomSheet({
  open,
  title,
  onClose,
  onAfterOpen,
  onAfterClose,
  children,
}: BottomSheetProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Popup
      open={open}
      placement="bottom"
      rounded
      className="bottom-sheet-panel"
      onClose={handleClose}
      onTransitionEnter={onAfterOpen}
      onTransitionExited={onAfterClose}
    >
      <Backdrop open={open} closeable onClose={handleClose} />
      <View className="bottom-sheet__head">
        <Text className="bottom-sheet__title">{title}</Text>
        <View
          className="bottom-sheet__close"
          role="button"
          aria-label="关闭"
          onClick={handleClose}
        >
          <Text className="bottom-sheet__close-icon">×</Text>
        </View>
      </View>
      <View className="bottom-sheet__body">{children}</View>
    </Popup>
  );
}
