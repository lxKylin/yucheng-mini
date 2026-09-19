import { useMemo, useSyncExternalStore } from 'react';

import { healthTimelineStore } from '@/subpackages/health/store/healthTimelineStore';
import type { HealthTimelineEvent, HealthTimelineEventType } from '@/types';
import { sortHealthTimelineEvents } from '@/subpackages/health/utils/healthTimelineUtils';

function useHealthTimelineStore() {
  return useSyncExternalStore(
    healthTimelineStore.subscribe,
    healthTimelineStore.getState,
    healthTimelineStore.getInitialState
  );
}

export function useHealthTimelinePageState(
  year: string,
  eventType: HealthTimelineEventType | ''
) {
  const state = useHealthTimelineStore();
  const years = useMemo(
    () => Array.from(new Set(state.events.map((item) => item.occurredAt.slice(0, 4)))).sort((a, b) => b.localeCompare(a)),
    [state.events]
  );
  const events = useMemo<HealthTimelineEvent[]>(
    () => sortHealthTimelineEvents(state.events.filter((item) => (!year || item.occurredAt.startsWith(year)) && (!eventType || item.eventType === eventType))),
    [eventType, state.events, year]
  );
  return { ...state, years, events, isEmpty: !state.loading && !state.error && state.events.length === 0 };
}

export function useHealthTimelineActions() {
  const state = useHealthTimelineStore();
  return useMemo(() => ({
    load: state.load, retryLoad: state.retryLoad, createEvent: state.createEvent,
    updateEvent: state.updateEvent, deleteEvent: state.deleteEvent
  }), [state.createEvent, state.deleteEvent, state.load, state.retryLoad, state.updateEvent]);
}
