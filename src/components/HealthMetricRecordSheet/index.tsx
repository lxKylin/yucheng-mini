import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Picker, Text, View } from '@tarojs/components';
import type {
  BaseEventOrig,
  InputProps,
  PickerDateProps,
  PickerSelectorProps
} from '@tarojs/components';

import BottomSheet from '@/components/BottomSheet';
import { createDefaultHealthMetricRecordForm } from '@/constants/healthMetric';
import type { HealthMetricRecordForm, HealthMetricType } from '@/types';
import { isFutureHealthMetricDate } from '@/utils/healthMetricUtils';

import './index.scss';

interface HealthMetricRecordSheetProps {
  open: boolean;
  metric: HealthMetricType | null;
  metricTypes: HealthMetricType[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: HealthMetricRecordForm) => Promise<void>;
}

type RecordFormErrors = Partial<Record<keyof HealthMetricRecordForm, string>>;

function getInputValue(e: BaseEventOrig<InputProps.inputValueEventDetail>) {
  return e.detail.value;
}

export default function HealthMetricRecordSheet({
  open,
  metric,
  metricTypes,
  submitting,
  onClose,
  onSubmit
}: HealthMetricRecordSheetProps) {
  const [form, setForm] = useState<HealthMetricRecordForm>(
    createDefaultHealthMetricRecordForm()
  );
  const [errors, setErrors] = useState<RecordFormErrors>({});

  useEffect(() => {
    if (!open) return;
    const nextMetric = metric ?? metricTypes[0] ?? null;
    if (!nextMetric) return;

    setForm({
      ...createDefaultHealthMetricRecordForm(nextMetric.id),
      unit: nextMetric.unit,
      referenceMin: nextMetric.referenceMin?.toString() ?? '',
      referenceMax: nextMetric.referenceMax?.toString() ?? ''
    });
    setErrors({});
  }, [metric, metricTypes, open]);

  const selectedMetric = useMemo(
    () =>
      metricTypes.find((item) => item.id === form.metricTypeId) ??
      metric ??
      null,
    [form.metricTypeId, metric, metricTypes]
  );

  const selectedMetricIndex = useMemo(() => {
    const index = metricTypes.findIndex((item) => item.id === form.metricTypeId);
    return index >= 0 ? index : 0;
  }, [form.metricTypeId, metricTypes]);

  const patchForm = (patch: Partial<HealthMetricRecordForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const handleMetricChange = (
    e: BaseEventOrig<PickerSelectorProps.ChangeEventDetail>
  ) => {
    const nextMetric = metricTypes[Number(e.detail.value)];
    if (!nextMetric) return;

    setForm((prev) => ({
      ...prev,
      metricTypeId: nextMetric.id,
      value: '',
      unit: nextMetric.unit,
      referenceMin: nextMetric.referenceMin?.toString() ?? '',
      referenceMax: nextMetric.referenceMax?.toString() ?? '',
      saveAsDefault: false
    }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const value = Number(form.value.trim());
    const nextErrors: RecordFormErrors = {};

    if (!selectedMetric) {
      nextErrors.metricTypeId = '请先选择指标';
    }
    if (!form.value.trim()) {
      nextErrors.value = '请填写数值';
    } else if (!Number.isFinite(value)) {
      nextErrors.value = '请输入有效数字';
    }
    if (isFutureHealthMetricDate(form.date)) {
      nextErrors.date = '记录日期不能晚于今天';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      ...form,
      metricTypeId: selectedMetric?.id ?? '',
      unit: selectedMetric?.unit ?? '',
      referenceMin: selectedMetric?.referenceMin?.toString() ?? '',
      referenceMax: selectedMetric?.referenceMax?.toString() ?? '',
      saveAsDefault: false
    });
  };

  return (
    <BottomSheet
      open={open}
      title={selectedMetric ? `记录${selectedMetric.name}` : '记录指标'}
      closeDisabled={submitting}
      onClose={onClose}
    >
      <View className="metric-record-sheet">
        <Picker
          mode="selector"
          range={metricTypes.map((item) => item.name)}
          value={selectedMetricIndex}
          onChange={handleMetricChange}
        >
          <View className="metric-record-sheet__metric-picker">
            <View>
              <Text className="metric-record-sheet__locked-label">当前指标</Text>
              <Text className="metric-record-sheet__locked-name">
                {selectedMetric?.name || '未选择'}
              </Text>
            </View>
            <Text className="metric-record-sheet__metric-action">切换</Text>
          </View>
        </Picker>
        {errors.metricTypeId ? (
          <Text className="metric-record-sheet__error">
            {errors.metricTypeId}
          </Text>
        ) : null}

        <Picker
          mode="date"
          value={form.date}
          onChange={(e: BaseEventOrig<PickerDateProps.ChangeEventDetail>) =>
            patchForm({ date: e.detail.value })
          }
        >
          <View className="metric-record-sheet__picker">
            <Text className="metric-record-sheet__label">记录日期</Text>
            <Text className="metric-record-sheet__picker-value">
              {form.date}
            </Text>
          </View>
        </Picker>
        {errors.date ? (
          <Text className="metric-record-sheet__error">{errors.date}</Text>
        ) : null}

        <View className="metric-record-sheet__field">
          <Text className="metric-record-sheet__label">数值</Text>
          <Input
            className="metric-record-sheet__input"
            type="digit"
            placeholder="请输入本次指标数值"
            value={form.value}
            aria-label="指标数值"
            onInput={(e) => patchForm({ value: getInputValue(e) })}
          />
          {errors.value ? (
            <Text className="metric-record-sheet__error">{errors.value}</Text>
          ) : null}
        </View>

        <Button
          className="metric-record-sheet__submit"
          loading={submitting}
          disabled={submitting}
          aria-label="保存指标记录"
          onClick={handleSubmit}
        >
          保存记录
        </Button>
      </View>
    </BottomSheet>
  );
}
