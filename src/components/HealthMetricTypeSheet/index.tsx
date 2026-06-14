import { useEffect, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import type { BaseEventOrig, InputProps } from '@tarojs/components';
import Taro from '@tarojs/taro';

import BottomSheet from '@/components/BottomSheet';
import { HEALTH_METRIC_DEFAULT_TYPE_FORM } from '@/constants/healthMetric';
import type { HealthMetricType, HealthMetricTypeForm } from '@/types';
import {
  hasInvalidHealthMetricRange,
  isSameHealthMetricName,
  parseOptionalMetricNumber
} from '@/utils/healthMetricUtils';

import './index.scss';

interface HealthMetricTypeSheetProps {
  open: boolean;
  existingMetrics: HealthMetricType[];
  editingMetric?: HealthMetricType | null;
  submitting: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
  onSubmit: (
    payload: Pick<HealthMetricType, 'name' | 'unit' | 'referenceMin' | 'referenceMax'>
  ) => Promise<void>;
}

type TypeFormErrors = Partial<Record<keyof HealthMetricTypeForm | 'range', string>>;

function getInputValue(e: BaseEventOrig<InputProps.inputValueEventDetail>) {
  return e.detail.value;
}

export default function HealthMetricTypeSheet({
  open,
  existingMetrics,
  editingMetric = null,
  submitting,
  onClose,
  onAfterClose,
  onSubmit
}: HealthMetricTypeSheetProps) {
  const [form, setForm] = useState<HealthMetricTypeForm>(
    HEALTH_METRIC_DEFAULT_TYPE_FORM
  );
  const [errors, setErrors] = useState<TypeFormErrors>({});

  useEffect(() => {
    if (!open) return;
    setForm(
      editingMetric
        ? {
            name: editingMetric.name,
            unit: editingMetric.unit,
            referenceMin: editingMetric.referenceMin?.toString() ?? '',
            referenceMax: editingMetric.referenceMax?.toString() ?? ''
          }
        : HEALTH_METRIC_DEFAULT_TYPE_FORM
    );
    setErrors({});
  }, [editingMetric, open]);

  const patchForm = (patch: Partial<HealthMetricTypeForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const referenceMin = parseOptionalMetricNumber(form.referenceMin);
    const referenceMax = parseOptionalMetricNumber(form.referenceMax);
    const nextErrors: TypeFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = '请填写指标名称';
    }
    if (Number.isNaN(referenceMin) || Number.isNaN(referenceMax)) {
      nextErrors.range = '参考范围请输入数字';
    }
    if (
      !Number.isNaN(referenceMin) &&
      !Number.isNaN(referenceMax) &&
      hasInvalidHealthMetricRange(referenceMin, referenceMax)
    ) {
      nextErrors.range = '参考下限不能大于参考上限';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const duplicate = existingMetrics.find(
      (metric) =>
        metric.id !== editingMetric?.id &&
        isSameHealthMetricName(metric.name, form.name)
    );

    if (duplicate) {
      const modal = await Taro.showModal({
        title: '可能已存在同名指标',
        content: `已有「${duplicate.name}」。如果只是补充数值，建议直接记录已有指标；仍要${editingMetric ? '保存修改' : '创建新指标'}吗？`,
        confirmText: editingMetric ? '仍然保存' : '仍然创建',
        cancelText: '取消',
        confirmColor: '#157a66'
      });

      if (!modal.confirm) return;
    }

    await onSubmit({
      name: form.name,
      unit: form.unit,
      referenceMin,
      referenceMax
    });
  };

  return (
    <BottomSheet
      open={open}
      title={editingMetric ? '编辑指标' : '新增指标类型'}
      closeDisabled={submitting}
      onClose={onClose}
      onAfterClose={onAfterClose}
    >
      <View className="metric-type-sheet">
        <View className="metric-type-sheet__intro">
          <Text className="metric-type-sheet__intro-title">
            {editingMetric ? '调整后续记录的默认设置' : '先定义要长期看的指标'}
          </Text>
          <Text className="metric-type-sheet__intro-desc">
            {editingMetric
              ? '历史记录会保留当时的单位和参考范围，仅后续记录默认带入新设置。'
              : '指标名称会用于趋势聚合，单位和参考范围可在每次记录时调整。'}
          </Text>
        </View>

        <View className="metric-type-sheet__field">
          <View className="metric-type-sheet__label-row">
            <Text className="metric-type-sheet__label">
              指标名称
              <Text className="metric-type-sheet__required-star">*</Text>
            </Text>
          </View>
          <Input
            className="metric-type-sheet__input"
            placeholder="例如 空腹血糖"
            value={form.name}
            aria-label="指标名称"
            onInput={(e) => patchForm({ name: getInputValue(e) })}
          />
          {errors.name ? (
            <Text className="metric-type-sheet__error">{errors.name}</Text>
          ) : null}
        </View>

        <View className="metric-type-sheet__field">
          <View className="metric-type-sheet__label-row">
            <Text className="metric-type-sheet__label">单位</Text>
          </View>
          <Input
            className="metric-type-sheet__input"
            placeholder="例如 mmol/L"
            value={form.unit}
            aria-label="指标单位"
            onInput={(e) => patchForm({ unit: getInputValue(e) })}
          />
        </View>

        <View className="metric-type-sheet__range">
          <View className="metric-type-sheet__field">
            <View className="metric-type-sheet__label-row">
              <Text className="metric-type-sheet__label">参考下限</Text>
            </View>
            <Input
              className="metric-type-sheet__input"
              type="digit"
              placeholder="可不填"
              value={form.referenceMin}
              aria-label="参考下限"
              onInput={(e) =>
                patchForm({ referenceMin: getInputValue(e) })
              }
            />
          </View>
          <View className="metric-type-sheet__field">
            <View className="metric-type-sheet__label-row">
              <Text className="metric-type-sheet__label">参考上限</Text>
            </View>
            <Input
              className="metric-type-sheet__input"
              type="digit"
              placeholder="可不填"
              value={form.referenceMax}
              aria-label="参考上限"
              onInput={(e) =>
                patchForm({ referenceMax: getInputValue(e) })
              }
            />
          </View>
        </View>
        {errors.range ? (
          <Text className="metric-type-sheet__error">{errors.range}</Text>
        ) : null}

        <Button
          className="metric-type-sheet__submit"
          loading={submitting}
          disabled={submitting}
          aria-label="保存指标类型"
          onClick={handleSubmit}
        >
          {editingMetric ? '保存修改' : '保存并记录第一次'}
        </Button>
      </View>
    </BottomSheet>
  );
}
