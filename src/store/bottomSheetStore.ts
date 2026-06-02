import { createStore } from 'zustand/vanilla';

interface BottomSheetState {
  activeCount: number;
  hasActiveBottomSheet: boolean;
  register: () => void;
  unregister: () => void;
}

export const bottomSheetStore = createStore<BottomSheetState>((set) => ({
  activeCount: 0,
  hasActiveBottomSheet: false,

  register() {
    set((state) => {
      const activeCount = state.activeCount + 1;

      return {
        activeCount,
        hasActiveBottomSheet: activeCount > 0
      };
    });
  },

  unregister() {
    set((state) => {
      const activeCount = Math.max(0, state.activeCount - 1);

      return {
        activeCount,
        hasActiveBottomSheet: activeCount > 0
      };
    });
  }
}));

