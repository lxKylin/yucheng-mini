import { useEffect, useRef, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';

import BottomSheet from '@/components/BottomSheet';
import UnifiedReminderComposer from '@/components/UnifiedReminderComposer';
import CustomTabBar from '@/custom-tab-bar';
import {
  useGlobalReminderComposerActions,
  useGlobalReminderComposerState
} from '@/hooks/useGlobalReminderComposer';

interface GlobalReminderComposerHostProps {
  pagePath: string;
}

function normalizePagePath(pagePath: string) {
  return pagePath.replace(/^\//, '').split('?')[0];
}

export default function GlobalReminderComposerHost({
  pagePath
}: GlobalReminderComposerHostProps) {
  const normalizedPagePath = normalizePagePath(pagePath);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const lastHandledRequestKeyRef = useRef(0);
  const { openRequestKey, requestPagePath } =
    useGlobalReminderComposerState();
  const { markOpen, close } = useGlobalReminderComposerActions();

  const hideNativeTabBar = () => {
    void Taro.hideTabBar({ animation: false }).catch(() => undefined);
  };

  useEffect(hideNativeTabBar, []);
  useDidShow(hideNativeTabBar);

  useEffect(() => {
    if (openRequestKey <= lastHandledRequestKeyRef.current) {
      return;
    }

    if (requestPagePath !== normalizedPagePath) {
      return;
    }

    lastHandledRequestKeyRef.current = openRequestKey;
    setResetKey((key) => key + 1);
    setSheetOpen(true);
    markOpen(normalizedPagePath);
  }, [markOpen, normalizedPagePath, openRequestKey, requestPagePath]);

  const handleClose = () => {
    setSheetOpen(false);
  };

  const handleAfterClose = () => {
    close();
  };

  return (
    <>
      <CustomTabBar />
      <BottomSheet
        open={sheetOpen}
        title="新增"
        onClose={handleClose}
        onAfterClose={handleAfterClose}
      >
        <UnifiedReminderComposer
          resetKey={resetKey}
          defaultType="medicine"
          defaultMedicineReminderEnabled={false}
          onSuccess={handleClose}
          onCancel={handleClose}
        />
      </BottomSheet>
    </>
  );
}
