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
import type {
  HealthMedicationAdherence,
  HealthOverallStatus,
  HealthStatusRecord,
  HealthSymptomTag
} from '@/types';
import { getMedicationAdherenceLabel } from '@/utils/healthStatusUtils';

import './index.scss';

const ABNORMAL_HEALTH_MEDICATION_OPTIONS =
  HEALTH_MEDICATION_ADHERENCE_OPTIONS.filter(
    (option) => option.value !== DEFAULT_HEALTH_MEDICATION_ADHERENCE
  );

interface HealthStatusComposerProps {
  record: HealthStatusRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
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
  onCancel,
  onSubmittingChange
}: HealthStatusComposerProps) {
  const { saveTodayStatus } = useHealthStatusActions();
  const [values, setValues] = useState<FormValues>(() =>
    makeFormValues(record)
  );
  const [showMedicationOptions, setShowMedicationOptions] = useState(
    () =>
      record?.medicationAdherence !== undefined &&
      record.medicationAdherence !== DEFAULT_HEALTH_MEDICATION_ADHERENCE
  );
  const [submitting, setSubmitting] = useState(false);
  const hasMedicationChange =
    values.medicationAdherence !== DEFAULT_HEALTH_MEDICATION_ADHERENCE;
  const medicationOptionsVisible = showMedicationOptions || hasMedicationChange;

  useEffect(() => {
    setValues(makeFormValues(record));
    setShowMedicationOptions(
      record?.medicationAdherence !== undefined &&
        record.medicationAdherence !== DEFAULT_HEALTH_MEDICATION_ADHERENCE
    );
  }, [record]);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [onSubmittingChange, submitting]);

  useEffect(() => {
    return () => {
      onSubmittingChange?.(false);
    };
  }, [onSubmittingChange]);

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

  const resetMedicationAdherence = () => {
    setField('medicationAdherence', DEFAULT_HEALTH_MEDICATION_ADHERENCE);
    setShowMedicationOptions(false);
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
        <View className="health-status-composer__section-head">
          <Text className="health-status-composer__section-title">
            用药情况
          </Text>
          {medicationOptionsVisible ? (
            <View
              className="health-status-composer__text-action"
              role="button"
              aria-label="恢复正常服用"
              onClick={resetMedicationAdherence}
            >
              <Text className="health-status-composer__text-action-label">
                恢复默认
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="health-status-composer__helper">
          默认为{getMedicationAdherenceLabel(DEFAULT_HEALTH_MEDICATION_ADHERENCE)}
          ；只有今天有漏服、延迟、暂停等变化时再记录。
        </Text>
        {medicationOptionsVisible ? (
          <View className="health-status-composer__chips">
            {ABNORMAL_HEALTH_MEDICATION_OPTIONS.map((option) => {
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
        ) : (
          <View className="health-status-composer__default-row">
            <Text className="health-status-composer__default-text">
              默认：{getMedicationAdherenceLabel(DEFAULT_HEALTH_MEDICATION_ADHERENCE)}
            </Text>
            <View
              className="health-status-composer__default-action"
              role="button"
              aria-label="记录用药变化"
              onClick={() => setShowMedicationOptions(true)}
            >
              <Text className="health-status-composer__default-action-text">
                有变化
              </Text>
            </View>
          </View>
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
