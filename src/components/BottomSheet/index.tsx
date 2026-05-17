import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Popup } from "@taroify/core";

import "./index.scss";

let activeSheetCount = 0;

function registerActiveSheet() {
  activeSheetCount += 1;
}

function unregisterActiveSheet() {
  activeSheetCount = Math.max(0, activeSheetCount - 1);
}

function shouldShowTabBar() {
  return activeSheetCount === 0;
}

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
  const registeredRef = useRef(false);
  const [backdropMounted, setBackdropMounted] = useState(open);
  const transitionDuration = 220;

  useEffect(() => {
    if (open && !registeredRef.current) {
      registeredRef.current = true;
      registerActiveSheet();
      setBackdropMounted(true);
      void Taro.hideTabBar({ animation: false }).catch(() => undefined);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (!registeredRef.current) {
        return;
      }

      registeredRef.current = false;
      unregisterActiveSheet();

      if (shouldShowTabBar()) {
        void Taro.showTabBar({ animation: false }).catch(() => undefined);
      }
    };
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleTransitionEnter = () => {
    onAfterOpen?.();
  };

  const handleTransitionExited = () => {
    setBackdropMounted(false);

    if (registeredRef.current) {
      registeredRef.current = false;
      unregisterActiveSheet();

      if (shouldShowTabBar()) {
        void Taro.showTabBar({ animation: false }).catch(() => undefined);
      }
    }

    onAfterClose?.();
  };

  return (
    <>
      {backdropMounted ? (
        <View
          className="bottom-sheet__backdrop bottom-sheet__backdrop--open"
          onClick={handleClose}
          catchMove
        />
      ) : null}

      <Popup
        open={open}
        placement="bottom"
        rounded
        duration={transitionDuration}
        className="bottom-sheet-panel"
        onClose={handleClose}
        onTransitionEnter={handleTransitionEnter}
        onTransitionExited={handleTransitionExited}
      >
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
    </>
  );
}
