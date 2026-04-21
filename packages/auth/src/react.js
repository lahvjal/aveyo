"use client";

import { useSyncExternalStore } from "react";

export function usePlatformSessionStore(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
