import { useMemo, useSyncExternalStore } from 'react';

import { globalReminderComposerStore } from '@/store/globalReminderComposerStore';

function useGlobalReminderComposerStore() {
  return useSyncExternalStore(
    globalReminderComposerStore.subscribe,
    globalReminderComposerStore.getState,
    globalReminderComposerStore.getInitialState
  );
}

export function useGlobalReminderComposerState() {
  const { openRequestKey, requestPagePath, composerOpen, activePagePath } =
    useGlobalReminderComposerStore();

  return useMemo(
    () => ({
      openRequestKey,
      requestPagePath,
      composerOpen,
      activePagePath
    }),
    [activePagePath, composerOpen, openRequestKey, requestPagePath]
  );
}

export function useGlobalReminderComposerActions() {
  const { requestOpen, markOpen, close } =
    globalReminderComposerStore.getState();

  return useMemo(
    () => ({
      requestOpen,
      markOpen,
      close
    }),
    [close, markOpen, requestOpen]
  );
}
