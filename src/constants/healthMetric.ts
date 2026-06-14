import type {
  HealthMetricRecordForm,
  HealthMetricStatus,
  HealthMetricTypeForm
} from '@/types';
import { today } from '@/utils/dateUtils';

export const HEALTH_METRIC_STATUS = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  DELETED: 'deleted'
} as const satisfies Record<string, HealthMetricStatus>;

export const HEALTH_METRIC_VALUE_PRECISION = 2;

export const HEALTH_METRIC_TREND_RECORD_LIMIT = 7;

export const HEALTH_METRIC_RECENT_RECORD_LIMIT = 20;

export const HEALTH_METRIC_DEFAULT_TYPE_FORM: HealthMetricTypeForm = {
  name: '',
  unit: '',
  referenceMin: '',
  referenceMax: ''
};

export function createDefaultHealthMetricRecordForm(
  metricTypeId = ''
): HealthMetricRecordForm {
  return {
    metricTypeId,
    date: today(),
    value: '',
    unit: '',
    referenceMin: '',
    referenceMax: '',
    note: '',
    saveAsDefault: false
  };
}

export const HEALTH_METRIC_COPY = {
  pageTitle: '指标追踪',
  pageDesc: '记录关键指标数值，回看变化',
  emptyTitle: '还没有追踪的指标',
  emptyDesc: '先新增一个指标类型，再记录第一次数值。',
  trendEmptyTitle: '还没有可展示的趋势',
  trendEmptyDesc: '记录一次当前指标后，会在这里展示趋势变化。',
  loadError: '指标数据加载失败，请重试',
  saveError: '保存失败，请稍后重试',
  duplicateMetric: '可能已存在同名指标',
  rangeHint: '仅按你记录的参考范围展示高低，不提供诊断建议'
} as const;
