import { createStore } from 'zustand/vanilla';

import { bottomSheetStore } from '@/store/bottomSheetStore';

export interface GlobalReminderComposerState {
  openRequestKey: number;
  requestPagePath?: string;
  composerOpen: boolean;
  activePagePath?: string;
  requestOpen: (pagePath: string) => void;
  markOpen: (pagePath: string) => void;
  close: () => void;
}

function normalizePagePath(pagePath?: string) {
  return pagePath?.replace(/^\//, '').split('?')[0];
}

export const globalReminderComposerStore =
  createStore<GlobalReminderComposerState>((set, get) => ({
    openRequestKey: 0,
    requestPagePath: undefined,
    composerOpen: false,
    activePagePath: undefined,

    requestOpen(pagePath) {
      const requestPagePath = normalizePagePath(pagePath);
      if (
        get().composerOpen ||
        bottomSheetStore.getState().hasActiveBottomSheet ||
        !requestPagePath
      ) {
        return;
      }

      set((state) => ({
        openRequestKey: state.openRequestKey + 1,
        requestPagePath,
        activePagePath: undefined
      }));
    },

    markOpen(pagePath) {
      set({
        composerOpen: true,
        activePagePath: normalizePagePath(pagePath)
      });
    },

    close() {
      set({
        composerOpen: false,
        activePagePath: undefined,
        requestPagePath: undefined
      });
    }
  }));
