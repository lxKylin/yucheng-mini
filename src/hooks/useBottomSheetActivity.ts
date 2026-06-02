import { useSyncExternalStore } from 'react';

import { bottomSheetStore } from '@/store/bottomSheetStore';

export function useBottomSheetActivity() {
  return useSyncExternalStore(
    bottomSheetStore.subscribe,
    bottomSheetStore.getState,
    bottomSheetStore.getInitialState
  ).hasActiveBottomSheet;
}

