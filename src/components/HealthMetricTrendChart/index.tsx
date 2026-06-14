import { forwardRef, useImperativeHandle, useMemo } from 'react';
import type { Ref } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';

import { HEALTH_METRIC_COPY } from '@/constants/healthMetric';
import type { HealthMetricTrendPoint } from '@/types';

import './index.scss';

interface HealthMetricTrendChartProps {
  metricId?: string;
  metricName?: string;
  points: HealthMetricTrendPoint[];
  unit: string;
  coveredBySheet?: boolean;
  onRecord: () => void;
}

export interface HealthMetricTrendChartHandle {
  captureSnapshot: () => Promise<void>;
  clearSnapshot: () => void;
}

const NORMAL_COLOR = '#157a66';
const WARNING_COLOR = '#b86c1e';
const DANGER_COLOR = '#ca4e41';
const CHART_FIT_WIDTH_RPX = 682;
const CHART_MIN_WIDTH_RPX = 760;
const CHART_POINT_WIDTH_RPX = 132;
const CHART_HEIGHT_RPX = 360;
const CHART_VISIBLE_POINT_LIMIT = 7;

function getPointColor(point: HealthMetricTrendPoint) {
  if (point.rangeStatus === 'low') return WARNING_COLOR;
  if (point.rangeStatus === 'high') return DANGER_COLOR;
  return NORMAL_COLOR;
}

function formatAxisLabel(dayLabel: string) {
  return dayLabel.replace('月', '/').replace('日', '');
}

function getPointTop(value: number, min: number, max: number) {
  if (max === min) return 50;
  return 82 - ((value - min) / (max - min)) * 58;
}

function getYAxisBounds(points: HealthMetricTrendPoint[]) {
  if (points.length === 0) {
    return {
      min: 0,
      max: 1
    };
  }

  const values = points.map((point) => point.value ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding =
    max === min ? Math.max(Math.abs(max) * 0.12, 1) : (max - min) * 0.18;

  return {
    min: min - padding,
    max: max + padding
  };
}

function getImportantValueIndexes(points: HealthMetricTrendPoint[]) {
  const indexes = new Set<number>();

  if (points.length === 0) return indexes;

  indexes.add(points.length - 1);

  let minIndex = 0;
  let maxIndex = 0;

  points.forEach((point, index) => {
    if (point.rangeStatus === 'low' || point.rangeStatus === 'high') {
      indexes.add(index);
    }

    if ((point.value ?? 0) < (points[minIndex].value ?? 0)) {
      minIndex = index;
    }

    if ((point.value ?? 0) > (points[maxIndex].value ?? 0)) {
      maxIndex = index;
    }
  });

  indexes.add(minIndex);
  indexes.add(maxIndex);
  return indexes;
}

function shouldShowValueLabel(
  index: number,
  points: HealthMetricTrendPoint[],
  importantIndexes: Set<number>
) {
  return points.length <= 7 || importantIndexes.has(index);
}

function shouldShowDateLabel(index: number, pointsLength: number) {
  if (pointsLength <= 7) return true;
  if (index === 0 || index === pointsLength - 1) return true;

  const step = Math.ceil(pointsLength / 6);
  return index % step === 0;
}

function getScrollableChartWidth(points: HealthMetricTrendPoint[]) {
  if (points.length < CHART_VISIBLE_POINT_LIMIT) return CHART_FIT_WIDTH_RPX;

  const pointWidth =
    points.length <= 7 ? CHART_POINT_WIDTH_RPX : points.length <= 30 ? 112 : 88;

  return Math.max(CHART_MIN_WIDTH_RPX, points.length * pointWidth);
}

function shouldScrollChart(points: HealthMetricTrendPoint[]) {
  return points.length >= CHART_VISIBLE_POINT_LIMIT;
}

function buildStaticPositions(
  points: HealthMetricTrendPoint[],
  chartWidth: number
) {
  const { min, max } = getYAxisBounds(points);

  return points.map((point, index) => {
    const leftPercent =
      points.length === 1
        ? 50
        : 8 + (index / Math.max(points.length - 1, 1)) * 84;
    const topPercent = getPointTop(point.value ?? 0, min, max);

    return {
      point,
      left: (leftPercent / 100) * chartWidth,
      top: (topPercent / 100) * CHART_HEIGHT_RPX
    };
  });
}

function StaticTrendPreview({
  points,
  chartWidth
}: {
  points: HealthMetricTrendPoint[];
  chartWidth: number;
}) {
  const positions = useMemo(
    () => buildStaticPositions(points, chartWidth),
    [chartWidth, points]
  );
  const importantIndexes = useMemo(
    () => getImportantValueIndexes(points),
    [points]
  );
  const segments = useMemo(
    () =>
      positions.slice(0, -1).map((start, index) => {
        const end = positions[index + 1];
        const dx = end.left - start.left;
        const dy = end.top - start.top;

        return {
          key: `${start.point.date}-${end.point.date}`,
          left: start.left,
          top: start.top,
          width: Math.sqrt(dx * dx + dy * dy),
          angle: (Math.atan2(dy, dx) * 180) / Math.PI
        };
      }),
    [positions]
  );

  return (
    <View className="metric-trend__static">
      {segments.map((segment) => (
        <View
          key={segment.key}
          className="metric-trend__static-segment"
          style={{
            left: `${segment.left}rpx`,
            top: `${segment.top}rpx`,
            width: `${segment.width}rpx`,
            transform: `rotate(${segment.angle}deg)`
          }}
        />
      ))}
      {positions.map(({ point, left, top }, index) => {
        const showLabel = shouldShowValueLabel(index, points, importantIndexes);

        return (
          <View
            key={point.date}
            className={`metric-trend__static-point${showLabel ? '' : ' metric-trend__static-point--dot-only'}`}
            style={{ left: `${left}rpx`, top: `${top}rpx` }}
          >
            {showLabel ? (
              <Text className="metric-trend__static-value">
                {point.displayValue}
              </Text>
            ) : null}
            <View
              className="metric-trend__static-dot"
              style={{ background: getPointColor(point) }}
            />
          </View>
        );
      })}
      <View className="metric-trend__static-dates">
        {positions.map(({ point, left }, index) =>
          shouldShowDateLabel(index, points.length) ? (
            <Text
              key={point.date}
              className="metric-trend__static-date"
              style={{ left: `${left}rpx` }}
            >
              {formatAxisLabel(point.dayLabel)}
            </Text>
          ) : null
        )}
      </View>
    </View>
  );
}

function HealthMetricTrendChart(
  {
    metricId = '',
    metricName = '',
    points,
    unit,
    onRecord
  }: HealthMetricTrendChartProps,
  ref: Ref<HealthMetricTrendChartHandle>
) {
  const valuePoints = points.filter((point) => point.value !== null);
  const visiblePoints = useMemo(
    () => valuePoints.slice(-CHART_VISIBLE_POINT_LIMIT),
    [valuePoints]
  );
  const chartLabel = metricName || '当前指标';
  const chartEndId = `metric-trend-end-${metricId || 'default'}-${visiblePoints.length}`;
  const scrollable = shouldScrollChart(visiblePoints);
  const chartWidth = useMemo(
    () => getScrollableChartWidth(visiblePoints),
    [visiblePoints]
  );

  useImperativeHandle(
    ref,
    () => ({
      captureSnapshot: () => Promise.resolve(),
      clearSnapshot: () => undefined
    }),
    []
  );

  return (
    <View className="metric-trend">
      <View className="metric-trend__head">
        <View>
          <Text className="metric-trend__title">指标趋势</Text>
        </View>
        <Text className="metric-trend__unit">{unit || '未填单位'}</Text>
      </View>

      {valuePoints.length > 0 ? (
        <View className="metric-trend__plot">
          <Text className="metric-trend__range-hint">{chartLabel}</Text>
          <ScrollView
            className="metric-trend__scroll"
            scrollX={scrollable}
            scrollIntoView={scrollable ? chartEndId : undefined}
            showScrollbar={false}
          >
            <View
              className="metric-trend__scroll-inner"
              style={{ width: `${chartWidth}rpx` }}
            >
              <StaticTrendPreview
                points={visiblePoints}
                chartWidth={chartWidth}
              />
              <View id={chartEndId} className="metric-trend__scroll-end" />
            </View>
          </ScrollView>
        </View>
      ) : (
        <View className="metric-trend__empty">
          <Text className="metric-trend__empty-title">
            {HEALTH_METRIC_COPY.trendEmptyTitle}
          </Text>
          <Text className="metric-trend__empty-desc">
            {HEALTH_METRIC_COPY.trendEmptyDesc}
          </Text>
          <View
            className="metric-trend__empty-action"
            role="button"
            aria-label="记录当前指标"
            onClick={onRecord}
          >
            <Text>去记录</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default forwardRef(HealthMetricTrendChart);
