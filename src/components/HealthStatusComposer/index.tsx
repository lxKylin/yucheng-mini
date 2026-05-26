import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { BaseEventOrig } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Textarea } from '@taroify/core';

import {
  DEFAULT_HEALTH_MEDICATION_ADHERENCE,
  HEALTH_MEDICATION_ADHERENCE_OPTIONS,
  HEALTH_OVERALL_STATUS_OPTIONS,
  HEALTH_SYMPTOM_TAG_OPTIONS
} from '@/constants';
import { useHealthStatusActions } from '@/hooks/useHealthStatus';
import { useAllDerivedMedicines } from '@/hooks/useReminders';
import type {
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthStatusRecord,
  HealthSymptomTag
} from '@/types';
import { getMedicationAdherenceLabel } from '@/utils/healthStatusUtils';

import './index.scss';

interface HealthStatusComposerProps {
  record: HealthStatusRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormValues {
  overallStatus: HealthOverallStatus | '';
  symptomTags: HealthSymptomTag[];
  medicationAdherence: HealthMedicationAdherence;
  relatedMedicineIds: string[];
  note: string;
}

type TextareaEvent = BaseEventOrig<{ value: string }>;

function makeDefaults(): FormValues {
  return {
    overallStatus: '',
    symptomTags: [],
    medicationAdherence: DEFAULT_HEALTH_MEDICATION_ADHERENCE,
    relatedMedicineIds: [],
    note: ''
  };
}

function makeFormValues(record: HealthStatusRecord | null): FormValues {
  if (!record) {
    return makeDefaults();
  }

  return {
    overallStatus: record.overallStatus,
    symptomTags: record.symptomTags,
    medicationAdherence: record.medicationAdherence,
    relatedMedicineIds: record.relatedMedicineIds,
    note: record.note
  };
}

export default function HealthStatusComposer({
  record,
  onSuccess,
  onCancel
}: HealthStatusComposerProps) {
  const medicines = useAllDerivedMedicines();
  const { saveTodayStatus } = useHealthStatusActions();
  const [values, setValues] = useState<FormValues>(() =>
    makeFormValues(record)
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues(makeFormValues(record));
  }, [record]);

  const setField = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSymptomTag = (tag: HealthSymptomTag) => {
    setValues((prev) => ({
      ...prev,
      symptomTags: prev.symptomTags.includes(tag)
        ? prev.symptomTags.filter((item) => item !== tag)
        : [...prev.symptomTags, tag]
    }));
  };

  const toggleMedicine = (id: string) => {
    setValues((prev) => ({
      ...prev,
      relatedMedicineIds: prev.relatedMedicineIds.includes(id)
        ? prev.relatedMedicineIds.filter((item) => item !== id)
        : [...prev.relatedMedicineIds, id]
    }));
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!values.overallStatus) {
      Taro.showToast({
        title: '请选择今天整体状态',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    setSubmitting(true);

    try {
      await saveTodayStatus({
        date: record?.date,
        overallStatus: values.overallStatus,
        symptomTags: values.symptomTags,
        medicationAdherence: values.medicationAdherence,
        relatedMedicineIds: values.relatedMedicineIds,
        note: values.note.trim()
      });
      Taro.showToast({ title: '今日状态已记录', icon: 'success' });
      onSuccess();
    } catch {
      Taro.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none',
        duration: 1800
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (submitting) {
      return;
    }

    onCancel();
  };

  return (
    <View className="health-status-composer">
      <View className="health-status-composer__notice">
        <Text className="health-status-composer__notice-title">
          记录今天的身体感受
        </Text>
        <Text className="health-status-composer__notice-desc">
          这里记录的是你的主观感受，不做诊断，也不判断是否为药品副作用。
        </Text>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">
          整体状态
          <Text className="health-status-composer__required">*</Text>
        </Text>
        <View className="health-status-composer__options">
          {HEALTH_OVERALL_STATUS_OPTIONS.map((option) => {
            const selected = values.overallStatus === option.value;
            return (
              <View
                key={option.value}
                className={`health-status-composer__option health-status-composer__option--${option.tone}${selected ? ' health-status-composer__option--active' : ''}`}
                role="button"
                aria-label={`选择${option.label}`}
                onClick={() => setField('overallStatus', option.value)}
              >
                <Text className="health-status-composer__option-text">
                  {option.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">感受标签</Text>
        <Text className="health-status-composer__helper">
          可多选，帮助之后回看近期变化。
        </Text>
        <View className="health-status-composer__chips">
          {HEALTH_SYMPTOM_TAG_OPTIONS.map((option) => {
            const selected = values.symptomTags.includes(option.value);
            return (
              <View
                key={option.value}
                className={`health-status-composer__chip${selected ? ' health-status-composer__chip--active' : ''}`}
                role="button"
                aria-label={`${selected ? '取消' : '选择'}${option.label}`}
                onClick={() => toggleSymptomTag(option.value)}
              >
                <Text className="health-status-composer__chip-text">
                  {option.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">用药情况</Text>
        <Text className="health-status-composer__helper">
          默认：{getMedicationAdherenceLabel(DEFAULT_HEALTH_MEDICATION_ADHERENCE)}
        </Text>
        <View className="health-status-composer__chips">
          {HEALTH_MEDICATION_ADHERENCE_OPTIONS.map((option) => {
            const selected = values.medicationAdherence === option.value;
            return (
              <View
                key={option.value}
                className={`health-status-composer__chip${selected ? ' health-status-composer__chip--active' : ''}`}
                role="button"
                aria-label={`选择${option.label}`}
                onClick={() => setField('medicationAdherence', option.value)}
              >
                <Text className="health-status-composer__chip-text">
                  {option.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View className="health-status-composer__section">
        <Text className="health-status-composer__section-title">相关药品</Text>
        <Text className="health-status-composer__helper">
          这里只做相关记录，不表示药品导致这些感受。
        </Text>
        {medicines.length > 0 ? (
          <View className="health-status-composer__chips">
            {medicines.map((medicine) => {
              const selected = values.relatedMedicineIds.includes(medicine.id);
              return (
                <View
                  key={medicine.id}
                  className={`health-status-composer__chip${selected ? ' health-status-composer__chip--active' : ''}`}
                  role="button"
                  aria-label={`${selected ? '取消关联' : '关联'}${medicine.name}`}
                  onClick={() => toggleMedicine(medicine.id)}
                >
                  <Text className="health-status-composer__chip-text">
                    {medicine.name}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="health-status-composer__empty-related">
            当前药箱暂无药品，可只记录今天的身体感受。
          </Text>
        )}
      </View>

      <View className="health-status-composer__field">
        <Text className="health-status-composer__label">备注</Text>
        <View className="health-status-composer__textarea">
          <Textarea
            className="health-status-composer__textarea-inner"
            value={values.note}
            placeholder="例如：今天下午有点乏力，晚饭后好一些"
            limit={120}
            onChange={(e: TextareaEvent) => setField('note', e.detail.value)}
          />
        </View>
      </View>

      <View className="health-status-composer__actions">
        <Button
          className="health-status-composer__cancel"
          disabled={submitting}
          onClick={handleCancel}
        >
          取消
        </Button>
        <Button
          className="health-status-composer__submit"
          color="primary"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? '保存中...' : '保存记录'}
        </Button>
      </View>
    </View>
  );
}
