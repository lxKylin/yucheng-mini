import { useCallback, useEffect, useMemo, useState } from 'react';

export const INCREMENTAL_LIST_INITIAL_COUNT = 10;
export const INCREMENTAL_LIST_STEP = 10;

interface IncrementalListSnapshot<T> {
  visibleItems: T[];
  totalCount: number;
  visibleCount: number;
  hasMore: boolean;
}

interface IncrementalListState {
  resetKey: string;
  visibleLimit: number;
}

export function getIncrementalListSnapshot<T>(
  items: T[],
  requestedVisibleCount: number
): IncrementalListSnapshot<T> {
  const totalCount = items.length;
  const visibleCount = Math.min(
    Math.max(0, requestedVisibleCount),
    totalCount
  );

  return {
    visibleItems: items.slice(0, visibleCount),
    totalCount,
    visibleCount,
    hasMore: visibleCount < totalCount
  };
}

export function useIncrementalList<T>(items: T[], resetKey: string) {
  const [state, setState] = useState<IncrementalListState>(() => ({
    resetKey,
    visibleLimit: INCREMENTAL_LIST_INITIAL_COUNT
  }));

  useEffect(() => {
    setState({
      resetKey,
      visibleLimit: INCREMENTAL_LIST_INITIAL_COUNT
    });
  }, [resetKey]);

  const visibleLimit =
    state.resetKey === resetKey
      ? state.visibleLimit
      : INCREMENTAL_LIST_INITIAL_COUNT;

  const snapshot = useMemo(
    () => getIncrementalListSnapshot(items, visibleLimit),
    [items, visibleLimit]
  );

  const loadMore = useCallback(() => {
    setState((current) => {
      const currentLimit =
        current.resetKey === resetKey
          ? current.visibleLimit
          : INCREMENTAL_LIST_INITIAL_COUNT;

      return {
        resetKey,
        visibleLimit: Math.min(
          currentLimit + INCREMENTAL_LIST_STEP,
          items.length
        )
      };
    });
  }, [items.length, resetKey]);

  return {
    ...snapshot,
    loadMore
  };
}
