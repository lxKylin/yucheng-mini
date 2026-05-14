import { createStore } from "zustand/vanilla";

interface AppStoreState {
  count: number;
}

export const appStore = createStore<AppStoreState>(() => ({
  count: 0,
}));
