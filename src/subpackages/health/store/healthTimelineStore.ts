import { createStore } from 'zustand/vanilla';

import { HEALTH_TIMELINE_PAGE_SIZE } from '@/subpackages/health/constants/healthTimeline';
import {
  createHealthTimelineEventToCloud,
  deleteHealthTimelineEventFromCloud,
  fetchHealthTimelineEvents,
  updateHealthTimelineEventInCloud
} from '@/subpackages/health/services/healthTimeline';
import type { HealthTimelineEvent, HealthTimelineEventForm } from '@/types';
import { genId } from '@/utils/commonUtils';
import { sortHealthTimelineEvents } from '@/subpackages/health/utils/healthTimelineUtils';

interface HealthTimelineStore {
  events: HealthTimelineEvent[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  saveError: string;
  submitting: boolean;
  load: (refresh?: boolean) => Promise<void>;
  retryLoad: () => Promise<void>;
  createEvent: (form: HealthTimelineEventForm) => Promise<void>;
  updateEvent: (id: string, form: HealthTimelineEventForm) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

function toEvent(form: HealthTimelineEventForm, existing?: HealthTimelineEvent): HealthTimelineEvent {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? genId(),
    eventType: form.eventType,
    title: form.title.trim(),
    occurredAt: form.occurredAt,
    note: form.note.trim(),
    relatedMedicineIds: Array.from(new Set(form.relatedMedicineIds)),
    relatedCheckupIds: Array.from(new Set(form.relatedCheckupIds)),
    endedAt: form.eventType === 'treatment' && !form.isOngoing && form.endedAt
      ? form.endedAt
      : '',
    isOngoing: form.eventType === 'treatment' && form.isOngoing,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

export const healthTimelineStore = createStore<HealthTimelineStore>((set, get) => ({
  events: [], loading: false, loadingMore: false, hasMore: true, error: '', saveError: '', submitting: false,

  async load(refresh = false) {
    const state = get();
    if (state.loading || state.loadingMore || (!refresh && !state.hasMore)) return;
    const offset = refresh ? 0 : state.events.length;
    set(refresh ? { loading: true, error: '', hasMore: true } : { loadingMore: true, error: '' });
    try {
      const result = await fetchHealthTimelineEvents(offset, HEALTH_TIMELINE_PAGE_SIZE);
      set((current) => {
        const combined = refresh ? result.events : [...current.events, ...result.events];
        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        return { events: sortHealthTimelineEvents(unique), loading: false, loadingMore: false, hasMore: result.hasMore };
      });
    } catch (error) {
      console.error('[healthTimelineStore] 加载失败：', error);
      set({ loading: false, loadingMore: false, error: '健康历程加载失败，请重试' });
    }
  },

  async retryLoad() {
    await get().load(true);
  },

  async createEvent(form) {
    const event = toEvent(form);
    set({ submitting: true, saveError: '' });
    try {
      await createHealthTimelineEventToCloud(event);
      set((state) => ({ events: sortHealthTimelineEvents([event, ...state.events]), submitting: false }));
    } catch (error) {
      console.error('[healthTimelineStore] 创建失败：', error);
      set({ submitting: false, saveError: '保存失败，请检查网络后重试' });
      throw error;
    }
  },

  async updateEvent(id, form) {
    const existing = get().events.find((item) => item.id === id);
    if (!existing) throw new Error('HEALTH_TIMELINE_EVENT_NOT_FOUND');
    const event = toEvent(form, existing);
    set({ submitting: true, saveError: '' });
    try {
      await updateHealthTimelineEventInCloud(id, event);
      set((state) => ({ events: sortHealthTimelineEvents(state.events.map((item) => item.id === id ? event : item)), submitting: false }));
    } catch (error) {
      console.error('[healthTimelineStore] 更新失败：', error);
      set({ submitting: false, saveError: '保存失败，请检查网络后重试' });
      throw error;
    }
  },

  async deleteEvent(id) {
    set({ submitting: true, saveError: '' });
    try {
      await deleteHealthTimelineEventFromCloud(id);
      set((state) => ({ events: state.events.filter((item) => item.id !== id), submitting: false }));
    } catch (error) {
      console.error('[healthTimelineStore] 删除失败：', error);
      set({ submitting: false, saveError: '删除失败，请检查网络后重试' });
      throw error;
    }
  }
}));
