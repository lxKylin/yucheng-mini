import { useEffect, useMemo, useState } from 'react';
import { Input, Picker, Text, View } from '@tarojs/components';
import { Button, Textarea } from '@taroify/core';

import BottomSheet from '@/components/BottomSheet';
import {
  createDefaultHealthTimelineEventForm,
  HEALTH_TIMELINE_EVENT_TYPES,
  HEALTH_TIMELINE_NOTE_MAX_LENGTH,
  HEALTH_TIMELINE_TITLE_MAX_LENGTH
} from '@/subpackages/health/constants/healthTimeline';
import type {
  HealthTimelineEvent,
  HealthTimelineEventForm
} from '@/types';
import {
  getHealthTimelineEventTypeLabel,
  isTreatmentEvent,
  validateHealthTimelineEventForm
} from '@/subpackages/health/utils/healthTimelineUtils';

import './index.scss';

interface RelatedOption { id: string; label: string; }
interface HealthTimelineSheetProps {
  open: boolean;
  event: HealthTimelineEvent | null;
  medicines: RelatedOption[];
  checkups: RelatedOption[];
  submitting: boolean;
  saveError: string;
  onClose: () => void;
  onSubmit: (form: HealthTimelineEventForm) => Promise<void>;
}

function toForm(event: HealthTimelineEvent | null): HealthTimelineEventForm {
  if (!event) return createDefaultHealthTimelineEventForm();
  return {
    eventType: event.eventType, title: event.title, occurredAt: event.occurredAt,
    note: event.note,
    relatedMedicineIds: event.relatedMedicineIds, relatedCheckupIds: event.relatedCheckupIds,
    endedAt: event.endedAt, isOngoing: event.isOngoing
  };
}

export default function HealthTimelineSheet({
  open, event, medicines, checkups, submitting, saveError, onClose, onSubmit
}: HealthTimelineSheetProps) {
  const [form, setForm] = useState<HealthTimelineEventForm>(() => toForm(event));
  const [errors, setErrors] = useState<Partial<Record<keyof HealthTimelineEventForm, string>>>({});

  useEffect(() => {
    if (!open) return;
    setForm(toForm(event));
    setErrors({});
  }, [event, open]);

  const typeIndex = useMemo(
    () => Math.max(0, HEALTH_TIMELINE_EVENT_TYPES.findIndex((item) => item.value === form.eventType)),
    [form.eventType]
  );
  const treatment = isTreatmentEvent(form.eventType);
  const patch = (next: Partial<HealthTimelineEventForm>) => {
    setForm((current) => ({ ...current, ...next }));
    setErrors({});
  };
  const toggleRelation = (field: 'relatedMedicineIds' | 'relatedCheckupIds', id: string) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((item) => item !== id)
        : [...current[field], id]
    }));
  };
  const handleSubmit = async () => {
    const nextErrors = validateHealthTimelineEventForm(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit(form);
  };

  return (
    <BottomSheet open={open} title={event ? '编辑健康事件' : '新建健康事件'} closeDisabled={submitting} onClose={onClose}>
      <View className="health-timeline-sheet">
        <View className="health-timeline-sheet__notice">
          <Text className="health-timeline-sheet__notice-title">只记录你确认的事实</Text>
          <Text className="health-timeline-sheet__notice-desc">不会生成提醒，也不提供诊断或治疗建议。</Text>
        </View>
        <View className="health-timeline-sheet__field">
          <Text className="health-timeline-sheet__label">事件类型<Text className="health-timeline-sheet__required">*</Text></Text>
          <Picker mode="selector" range={HEALTH_TIMELINE_EVENT_TYPES.map((item) => item.label)} value={typeIndex} onChange={(e) => patch({ eventType: HEALTH_TIMELINE_EVENT_TYPES[Number(e.detail.value)]?.value ?? 'other' })}>
            <View className="health-timeline-sheet__picker">
              <Text className="health-timeline-sheet__picker-value">{getHealthTimelineEventTypeLabel(form.eventType)}</Text>
              <Text className="health-timeline-sheet__picker-hint">选择</Text>
            </View>
          </Picker>
          {errors.eventType ? <Text className="health-timeline-sheet__error">{errors.eventType}</Text> : null}
        </View>
        <View className="health-timeline-sheet__field">
          <Text className="health-timeline-sheet__label">事件标题<Text className="health-timeline-sheet__required">*</Text></Text>
          <Input className="health-timeline-sheet__input" value={form.title} maxlength={HEALTH_TIMELINE_TITLE_MAX_LENGTH} placeholder="例如：完成年度复查" aria-label="事件标题" onInput={(e) => patch({ title: e.detail.value })} />
          {errors.title ? <Text className="health-timeline-sheet__error">{errors.title}</Text> : null}
        </View>
        <View className="health-timeline-sheet__field">
          <Text className="health-timeline-sheet__label">发生时间<Text className="health-timeline-sheet__required">*</Text></Text>
          <Picker mode="date" value={form.occurredAt} onChange={(e) => patch({ occurredAt: e.detail.value })}>
            <View className="health-timeline-sheet__picker">
              <Text className="health-timeline-sheet__picker-value">{form.occurredAt}</Text>
              <Text className="health-timeline-sheet__picker-hint">选择</Text>
            </View>
          </Picker>
          {errors.occurredAt ? <Text className="health-timeline-sheet__error">{errors.occurredAt}</Text> : null}
        </View>
        {treatment ? <View className="health-timeline-sheet__field health-timeline-sheet__treatment">
          <View className="health-timeline-sheet__toggle" role="switch" aria-checked={form.isOngoing} onClick={() => patch({ isOngoing: !form.isOngoing })}><Text>治疗仍在进行中</Text><Text>{form.isOngoing ? '已开启' : '未开启'}</Text></View>
          {!form.isOngoing ? <Picker mode="date" value={form.endedAt} onChange={(e) => patch({ endedAt: e.detail.value })}><View className="health-timeline-sheet__picker"><Text className="health-timeline-sheet__picker-value">{form.endedAt || '选择结束日期（可选）'}</Text><Text className="health-timeline-sheet__picker-hint">选择</Text></View></Picker> : null}
          {errors.endedAt ? <Text className="health-timeline-sheet__error">{errors.endedAt}</Text> : null}
        </View> : null}
        <View className="health-timeline-sheet__field">
          <Text className="health-timeline-sheet__label">关联药品（可选）</Text>
          <View className="health-timeline-sheet__chips">{medicines.length ? medicines.map((item) => <View key={item.id} className={`health-timeline-sheet__chip${form.relatedMedicineIds.includes(item.id) ? ' health-timeline-sheet__chip--active' : ''}`} role="button" aria-label={`${form.relatedMedicineIds.includes(item.id) ? '取消关联' : '关联'}药品${item.label}`} onClick={() => toggleRelation('relatedMedicineIds', item.id)}><Text>{item.label}</Text></View>) : <Text className="health-timeline-sheet__empty">暂无可关联药品</Text>}</View>
        </View>
        <View className="health-timeline-sheet__field">
          <Text className="health-timeline-sheet__label">关联检查提醒（可选）</Text>
          <View className="health-timeline-sheet__chips">{checkups.length ? checkups.map((item) => <View key={item.id} className={`health-timeline-sheet__chip${form.relatedCheckupIds.includes(item.id) ? ' health-timeline-sheet__chip--active' : ''}`} role="button" aria-label={`${form.relatedCheckupIds.includes(item.id) ? '取消关联' : '关联'}检查${item.label}`} onClick={() => toggleRelation('relatedCheckupIds', item.id)}><Text>{item.label}</Text></View>) : <Text className="health-timeline-sheet__empty">暂无可关联检查提醒</Text>}</View>
        </View>
        <View className="health-timeline-sheet__field"><Text className="health-timeline-sheet__label">备注（可选）</Text><View className="health-timeline-sheet__textarea"><Textarea className="health-timeline-sheet__textarea-inner" value={form.note} limit={HEALTH_TIMELINE_NOTE_MAX_LENGTH} placeholder="补充当时的情况、检查结论或变化" aria-label="事件备注" onChange={(e) => patch({ note: e.detail.value })} /></View>{errors.note ? <Text className="health-timeline-sheet__error">{errors.note}</Text> : null}</View>
        {saveError ? <View className="health-timeline-sheet__error" role="alert"><Text>{saveError}，表单内容已保留。</Text></View> : null}
        <View className="health-timeline-sheet__actions">
          <Button
            className="health-timeline-sheet__cancel"
            disabled={submitting}
            aria-label="取消编辑健康事件"
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            className="health-timeline-sheet__submit"
            loading={submitting}
            disabled={submitting}
            aria-label="保存健康事件"
            onClick={handleSubmit}
          >
            {event ? '保存修改' : '保存事件'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
