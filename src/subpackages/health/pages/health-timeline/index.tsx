import { useState } from 'react';
import { Button, Picker, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';

import { useDerivedCheckups } from '@/hooks/useCheckups';
import { useAllDerivedMedicines } from '@/hooks/useReminders';
import HealthTimelineSheet from '@/subpackages/health/components/HealthTimelineSheet';
import { HEALTH_TIMELINE_EVENT_TYPES } from '@/subpackages/health/constants/healthTimeline';
import {
  useHealthTimelineActions,
  useHealthTimelinePageState
} from '@/subpackages/health/hooks/useHealthTimeline';
import type { HealthTimelineEvent, HealthTimelineEventType } from '@/types';
import {
  formatTimelineDate,
  getHealthTimelineEventTypeLabel
} from '@/subpackages/health/utils/healthTimelineUtils';

import './index.scss';

function HealthTimelinePage() {
  const [year, setYear] = useState('');
  const [eventType, setEventType] = useState<HealthTimelineEventType | ''>('');
  const [editingEvent, setEditingEvent] = useState<HealthTimelineEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const state = useHealthTimelinePageState(year, eventType);
  const actions = useHealthTimelineActions();
  const medicines = useAllDerivedMedicines();
  const checkups = useDerivedCheckups();
  const yearOptions = ['全部年份', ...state.years];
  const typeOptions = ['全部类型', ...HEALTH_TIMELINE_EVENT_TYPES.map((item) => item.label)];

  useLoad(() => {
    void actions.load(true);
  });

  const closeSheet = () => {
    if (state.submitting) return;
    setSheetOpen(false);
    setEditingEvent(null);
  };
  const openCreate = () => {
    setEditingEvent(null);
    setSheetOpen(true);
  };
  const openEdit = (event: HealthTimelineEvent) => {
    setEditingEvent(event);
    setSheetOpen(true);
  };
  const clearFilters = () => {
    setYear('');
    setEventType('');
  };
  const handleSave = async (form: Parameters<typeof actions.createEvent>[0]) => {
    try {
      if (editingEvent) await actions.updateEvent(editingEvent.id, form);
      else await actions.createEvent(form);
      Taro.showToast({ title: editingEvent ? '事件已更新' : '事件已保存', icon: 'success' });
      closeSheet();
    } catch {
      Taro.showToast({ title: '保存失败，表单内容已保留', icon: 'none' });
    }
  };
  const handleDelete = async (event: HealthTimelineEvent) => {
    const result = await Taro.showModal({
      title: '删除健康事件？',
      content: '删除后无法恢复，但不会影响关联的药品或检查提醒。',
      confirmText: '删除',
      confirmColor: '#ca4e41',
      cancelText: '取消'
    });
    if (!result.confirm) return;
    try {
      await actions.deleteEvent(event.id);
      Taro.showToast({ title: '事件已删除', icon: 'success' });
    } catch {
      Taro.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
    }
  };
  const medicineOptions = medicines.map((item) => ({ id: item.id, label: item.name }));
  const checkupOptions = checkups.map((item) => ({ id: item.id, label: item.title }));

  return (
    <View className="health-timeline-page">
      <View className="health-timeline-page__hero">
        <View className="health-timeline-page__hero-copy">
          <Text className="health-timeline-page__eyebrow">长期回看</Text>
          <Text className="health-timeline-page__title">健康历程</Text>
          <Text className="health-timeline-page__desc">记录确诊、检查、治疗与重要变化，只保存你确认的事实。</Text>
        </View>
        <View className="health-timeline-page__create" role="button" aria-label="新建健康事件" onClick={openCreate}><Text>+ 新建</Text></View>
      </View>
      <View className="health-timeline-page__filters">
        <Picker mode="selector" range={yearOptions} value={Math.max(0, yearOptions.indexOf(year || '全部年份'))} onChange={(e) => setYear(yearOptions[Number(e.detail.value)] === '全部年份' ? '' : yearOptions[Number(e.detail.value)] ?? '')}>
          <View className="health-timeline-page__filter"><Text>{year || '全部年份'}</Text><Text>筛选</Text></View>
        </Picker>
        <Picker mode="selector" range={typeOptions} value={Math.max(0, typeOptions.indexOf(eventType ? getHealthTimelineEventTypeLabel(eventType) : '全部类型'))} onChange={(e) => { const item = HEALTH_TIMELINE_EVENT_TYPES[Number(e.detail.value) - 1]; setEventType(item?.value ?? ''); }}>
          <View className="health-timeline-page__filter"><Text>{eventType ? getHealthTimelineEventTypeLabel(eventType) : '全部类型'}</Text><Text>筛选</Text></View>
        </Picker>
      </View>
      {state.loading && !state.events.length ? <View className="health-timeline-page__status"><Text className="health-timeline-page__status-title">正在整理健康历程</Text><Text className="health-timeline-page__status-desc">请稍候，你的记录会按时间倒序显示。</Text></View> : null}
      {state.error && !state.events.length ? <View className="health-timeline-page__status"><Text className="health-timeline-page__status-title">{state.error}</Text><View className="health-timeline-page__action" role="button" aria-label="重试加载健康历程" onClick={() => void actions.retryLoad()}><Text>重试</Text></View></View> : null}
      {state.isEmpty ? <View className="health-timeline-page__status"><Text className="health-timeline-page__status-title">从第一条重要事件开始</Text><Text className="health-timeline-page__status-desc">可记录确诊、检查、治疗和重要变化，方便以后回看。</Text><View className="health-timeline-page__action" role="button" aria-label="新建第一条健康事件" onClick={openCreate}><Text>新建第一条</Text></View></View> : null}
      {!state.loading && !state.error && !state.isEmpty && !state.events.length ? <View className="health-timeline-page__status"><Text className="health-timeline-page__status-title">没有符合筛选条件的事件</Text><View className="health-timeline-page__text-action" role="button" aria-label="清除健康历程筛选" onClick={clearFilters}><Text>清除筛选</Text></View></View> : null}
      {state.events.length ? <View className="health-timeline-page__timeline">{state.events.map((event) => {
        const relatedMedicineText = event.relatedMedicineIds.map((id) => medicineOptions.find((item) => item.id === id)?.label ?? '关联药品已不可用').join('、');
        const relatedCheckupText = event.relatedCheckupIds.map((id) => checkupOptions.find((item) => item.id === id)?.label ?? '关联检查已不可用').join('、');
        return <View key={event.id} className="health-timeline-page__event" role="button" aria-label={`编辑${event.title}`} onClick={() => openEdit(event)}><View className="health-timeline-page__rail"><View className="health-timeline-page__dot" /></View><View className="health-timeline-page__event-card"><View className="health-timeline-page__event-meta"><Text className="health-timeline-page__date">{formatTimelineDate(event.occurredAt)}</Text><Text className="health-timeline-page__type">{getHealthTimelineEventTypeLabel(event.eventType)}</Text>{event.isOngoing ? <Text className="health-timeline-page__ongoing">治疗进行中</Text> : null}</View><View className="health-timeline-page__event-content"><Text className="health-timeline-page__event-title">{event.title}</Text>{event.note ? <Text className="health-timeline-page__note">{event.note}</Text> : null}{relatedMedicineText ? <Text className="health-timeline-page__related">药品：{relatedMedicineText}</Text> : null}{relatedCheckupText ? <Text className="health-timeline-page__related">检查：{relatedCheckupText}</Text> : null}</View><View className="health-timeline-page__event-actions"><Text>轻触卡片编辑</Text><View className="health-timeline-page__event-delete" role="button" aria-label={`删除${event.title}`} onClick={(e) => { e.stopPropagation(); void handleDelete(event); }}><Text>删除</Text></View></View></View></View>;
      })}</View> : null}
      {state.events.length && state.hasMore ? <Button className="health-timeline-page__more" loading={state.loadingMore} disabled={state.loadingMore} onClick={() => void actions.load()}>{state.loadingMore ? '加载中' : '加载更多'}</Button> : null}
      <HealthTimelineSheet open={sheetOpen} event={editingEvent} medicines={medicineOptions} checkups={checkupOptions} submitting={state.submitting} saveError={state.saveError} onClose={closeSheet} onSubmit={handleSave} />
    </View>
  );
}

export default HealthTimelinePage;
