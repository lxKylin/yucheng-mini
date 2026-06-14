import { useEffect, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, {
  useLoad,
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';

import { SHARE_IMAGE } from '@/constants';
import HealthMetricRecordList from '@/subpackages/health/components/HealthMetricRecordList';
import HealthMetricRecordSheet from '@/subpackages/health/components/HealthMetricRecordSheet';
import HealthMetricSelector from '@/subpackages/health/components/HealthMetricSelector';
import HealthMetricTrendChart from '@/subpackages/health/components/HealthMetricTrendChart';
import type { HealthMetricTrendChartHandle } from '@/subpackages/health/components/HealthMetricTrendChart';
import HealthMetricTypeSheet from '@/subpackages/health/components/HealthMetricTypeSheet';
import { HEALTH_METRIC_COPY } from '@/subpackages/health/constants/healthMetric';
import {
  useHealthMetricActions,
  useHealthMetricPageState
} from '@/subpackages/health/hooks/useHealthMetrics';
import type { HealthMetricRecordForm, HealthMetricType } from '@/types';
import { parseOptionalMetricNumber } from '@/subpackages/health/utils/healthMetricUtils';
import { withPageShare } from '@/utils/pageShare';

import './index.scss';

type ActiveSheet = 'type' | 'record' | null;

function getDuplicateRecordError(err: unknown) {
  return err instanceof Error && err.message === 'DUPLICATE_HEALTH_METRIC_RECORD';
}

function HealthMetricPage() {
  const state = useHealthMetricPageState();
  const actions = useHealthMetricActions();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [recordMetric, setRecordMetric] = useState<HealthMetricType | null>(null);
  const [editingMetric, setEditingMetric] = useState<HealthMetricType | null>(
    null
  );
  const trendChartRef = useRef<HealthMetricTrendChartHandle>(null);

  useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
    void actions.load();
  });

  useEffect(() => {
    if (!state.selectedMetricTypeId) return;

    void actions.loadMetricRecords(state.selectedMetricTypeId);
  }, [actions, state.selectedMetricTypeId]);

  useShareAppMessage(() => ({
    title: '愈历：指标追踪',
    path: '/subpackages/health/pages/health-metrics/index',
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：指标追踪',
    query: 'from=health-metrics',
    imageUrl: SHARE_IMAGE
  }));

  const closeSheet = () => {
    if (state.submitting) return;
    setActiveSheet(null);
    trendChartRef.current?.clearSnapshot();
  };

  const handleTypeSheetExited = () => {
    setEditingMetric(null);
  };

  const prepareChartForSheet = async () => {
    await trendChartRef.current?.captureSnapshot();
  };

  const openTypeSheet = async () => {
    await prepareChartForSheet();
    setEditingMetric(null);
    setActiveSheet('type');
  };

  const openRecordSheet = async (metric = state.currentMetric) => {
    const nextMetric = metric ?? state.metricTypes[0] ?? null;
    if (!nextMetric) {
      await prepareChartForSheet();
      setEditingMetric(null);
      setActiveSheet('type');
      return;
    }

    await prepareChartForSheet();
    setRecordMetric(nextMetric);
    setActiveSheet('record');
  };

  const openEditTypeSheet = async (metricTypeId: string) => {
    const metric = state.metricTypes.find((item) => item.id === metricTypeId);
    if (!metric) return;

    await prepareChartForSheet();
    setEditingMetric(metric);
    setActiveSheet('type');
  };

  const handleCreateMetric = async (
    payload: Pick<HealthMetricType, 'name' | 'unit' | 'referenceMin' | 'referenceMax'>
  ) => {
    try {
      const metric = await actions.createMetricType(payload);
      Taro.showToast({ title: '指标已创建', icon: 'success', duration: 1200 });
      setRecordMetric(metric);
      setActiveSheet('record');
    } catch {
      Taro.showToast({ title: HEALTH_METRIC_COPY.saveError, icon: 'none' });
    }
  };

  const handleUpdateMetric = async (
    payload: Pick<HealthMetricType, 'name' | 'unit' | 'referenceMin' | 'referenceMax'>
  ) => {
    if (!editingMetric) return;

    try {
      const metric = await actions.updateMetricType(editingMetric.id, payload);
      Taro.showToast({ title: '指标已更新', icon: 'success', duration: 1200 });
      setRecordMetric((prev) => (prev?.id === metric.id ? metric : prev));
      setActiveSheet(null);
      trendChartRef.current?.clearSnapshot();
    } catch {
      Taro.showToast({ title: HEALTH_METRIC_COPY.saveError, icon: 'none' });
    }
  };

  const saveRecord = async (
    form: HealthMetricRecordForm,
    confirmUpdate = false
  ) => {
    await actions.saveRecord({
      metricTypeId: form.metricTypeId,
      date: form.date,
      value: Number(form.value),
      unit: form.unit,
      referenceMin: parseOptionalMetricNumber(form.referenceMin),
      referenceMax: parseOptionalMetricNumber(form.referenceMax),
      note: '',
      saveAsDefault: form.saveAsDefault,
      confirmUpdate
    });
  };

  const handleSaveRecord = async (form: HealthMetricRecordForm) => {
    try {
      await saveRecord(form);
      Taro.showToast({ title: '记录已保存', icon: 'success', duration: 1200 });
      setActiveSheet(null);
      trendChartRef.current?.clearSnapshot();
    } catch (err) {
      if (!getDuplicateRecordError(err)) {
        Taro.showToast({ title: HEALTH_METRIC_COPY.saveError, icon: 'none' });
        return;
      }

      const modal = await Taro.showModal({
        title: '更新当天记录',
        content: '这一天已经记录过该指标，要更新原记录吗？',
        confirmText: '更新',
        cancelText: '取消',
        confirmColor: '#157a66'
      });

      if (!modal.confirm) return;

      try {
        await saveRecord(form, true);
        Taro.showToast({ title: '记录已更新', icon: 'success', duration: 1200 });
        setActiveSheet(null);
        trendChartRef.current?.clearSnapshot();
      } catch {
        Taro.showToast({ title: HEALTH_METRIC_COPY.saveError, icon: 'none' });
      }
    }
  };

  const recordsLoaded = state.currentMetric
    ? state.recordLoadedByMetricId[state.currentMetric.id]
    : false;
  const showRecordsLoading =
    Boolean(state.currentMetric) &&
    !state.recordsError &&
    (state.recordsLoading || !recordsLoaded);

  return (
    <View className="health-metric-page">
      <View className="health-metric-page__hero">
        <View>
          <Text className="health-metric-page__eyebrow">自我复盘</Text>
          <Text className="health-metric-page__title">
            {HEALTH_METRIC_COPY.pageTitle}
          </Text>
          <Text className="health-metric-page__desc">
            {HEALTH_METRIC_COPY.pageDesc}
          </Text>
        </View>
        <View
          className="health-metric-page__record-btn"
          role="button"
          aria-label="记录指标"
          onClick={() => void openRecordSheet()}
        >
          <Text>+ 记录</Text>
        </View>
      </View>

      {state.loading && state.metricTypes.length === 0 ? (
        <View className="health-metric-page__status">
          <Text className="health-metric-page__status-title">加载中</Text>
          <Text className="health-metric-page__status-desc">
            正在整理你的指标类型和最近记录。
          </Text>
        </View>
      ) : null}

      {state.error && state.metricTypes.length === 0 ? (
        <View className="health-metric-page__status">
          <Text className="health-metric-page__status-title">
            {HEALTH_METRIC_COPY.loadError}
          </Text>
          <View
            className="health-metric-page__status-action"
            role="button"
            aria-label="重试加载指标数据"
            onClick={actions.retryLoad}
          >
            <Text>重试</Text>
          </View>
        </View>
      ) : null}

      {state.isEmpty ? (
        <View className="health-metric-page__status">
          <Text className="health-metric-page__status-title">
            {HEALTH_METRIC_COPY.emptyTitle}
          </Text>
          <Text className="health-metric-page__status-desc">
            {HEALTH_METRIC_COPY.emptyDesc}
          </Text>
          <View
            className="health-metric-page__status-action"
            role="button"
            aria-label="新增指标类型"
            onClick={() => void openTypeSheet()}
          >
            <Text>新增指标类型</Text>
          </View>
        </View>
      ) : null}

      {state.metricTypes.length > 0 ? (
        <View className="health-metric-page__content">
          <HealthMetricSelector
            summaries={state.summaries}
            selectedId={state.selectedMetricTypeId}
            onSelect={actions.selectMetric}
            onCreate={() => void openTypeSheet()}
            onEdit={(metricTypeId) => void openEditTypeSheet(metricTypeId)}
          />

          {showRecordsLoading ? (
            <View className="health-metric-page__inline-status">
              <Text className="health-metric-page__status-title">
                加载指标记录中
              </Text>
              <Text className="health-metric-page__status-desc">
                正在读取当前指标的最近记录。
              </Text>
            </View>
          ) : null}

          {state.recordsError ? (
            <View className="health-metric-page__inline-status">
              <Text className="health-metric-page__status-title">
                {state.recordsError}
              </Text>
              <View
                className="health-metric-page__status-action"
                role="button"
                aria-label="重试加载当前指标记录"
                onClick={actions.retryCurrentRecords}
              >
                <Text>重试</Text>
              </View>
            </View>
          ) : null}

          {!showRecordsLoading && !state.recordsError ? (
            <>
              <HealthMetricTrendChart
                ref={trendChartRef}
                metricId={state.currentMetric?.id}
                metricName={state.currentMetric?.name}
                points={state.trendPoints}
                unit={state.currentMetric?.unit ?? ''}
                coveredBySheet={activeSheet !== null}
                onRecord={() => void openRecordSheet()}
              />

              <HealthMetricRecordList records={state.recentRecords} />
            </>
          ) : null}
        </View>
      ) : null}

      <HealthMetricTypeSheet
        open={activeSheet === 'type'}
        existingMetrics={state.metricTypes}
        editingMetric={editingMetric}
        submitting={state.submitting}
        onClose={closeSheet}
        onAfterClose={handleTypeSheetExited}
        onSubmit={editingMetric ? handleUpdateMetric : handleCreateMetric}
      />

      <HealthMetricRecordSheet
        open={activeSheet === 'record'}
        metric={recordMetric}
        metricTypes={state.metricTypes}
        submitting={state.submitting}
        onClose={closeSheet}
        onSubmit={handleSaveRecord}
      />
    </View>
  );
}

export default withPageShare(HealthMetricPage);
