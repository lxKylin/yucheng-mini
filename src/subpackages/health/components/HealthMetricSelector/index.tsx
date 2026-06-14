import { ScrollView, Text, View } from '@tarojs/components';

import type { HealthMetricSummary } from '@/types';

import './index.scss';

interface HealthMetricSelectorProps {
  summaries: HealthMetricSummary[];
  selectedId: string;
  onSelect: (metricTypeId: string) => void;
  onCreate: () => void;
  onEdit: (metricTypeId: string) => void;
}

export default function HealthMetricSelector({
  summaries,
  selectedId,
  onSelect,
  onCreate,
  onEdit
}: HealthMetricSelectorProps) {
  const selectedIndex = summaries.findIndex(
    ({ metric }) => metric.id === selectedId
  );
  const selectedItemId =
    selectedIndex >= 0 ? `metric-selector-item-${selectedIndex}` : undefined;

  return (
    <View className="metric-selector">
      <View className="metric-selector__head">
        <Text className="metric-selector__title">追踪指标</Text>
        <View className="metric-selector__actions">
          {selectedId ? (
            <View
              className="metric-selector__edit"
              role="button"
              aria-label="编辑当前指标"
              onClick={() => onEdit(selectedId)}
            >
              <Text>编辑</Text>
            </View>
          ) : null}
          <View
            className="metric-selector__add"
            role="button"
            aria-label="新增指标类型"
            onClick={onCreate}
          >
            <Text>新增</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="metric-selector__scroll"
        scrollX
        scrollIntoView={selectedItemId}
        showScrollbar={false}
      >
        <View className="metric-selector__list">
          {summaries.map(({ metric }, index) => {
            const active = metric.id === selectedId;

            return (
              <View
                key={metric.id}
                id={`metric-selector-item-${index}`}
                className={`metric-selector__item${active ? ' metric-selector__item--active' : ''}`}
                role="button"
                aria-label={`切换到${metric.name}`}
                onClick={() => onSelect(metric.id)}
              >
                <Text className="metric-selector__name">{metric.name}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
