import { Text, View } from '@tarojs/components';

import type { HealthMetricRecord } from '@/types';
import { formatDisplay, parseDate } from '@/utils/dateUtils';
import {
  formatHealthMetricValue,
  getHealthMetricRangeLabel,
  getHealthMetricRangeStatus
} from '@/subpackages/health/utils/healthMetricUtils';

import './index.scss';

interface HealthMetricRecordListProps {
  records: HealthMetricRecord[];
}

export default function HealthMetricRecordList({
  records
}: HealthMetricRecordListProps) {
  if (records.length === 0) {
    return (
      <View className="metric-record-list__empty">
        <Text className="metric-record-list__empty-title">暂无历史记录</Text>
        <Text className="metric-record-list__empty-desc">
          保存第一次记录后，会在这里按日期回看。
        </Text>
      </View>
    );
  }

  return (
    <View className="metric-record-list">
      <Text className="metric-record-list__title">最近记录</Text>
      {records.map((record) => {
        const status = getHealthMetricRangeStatus(
          record.value,
          record.referenceMin,
          record.referenceMax
        );

        return (
          <View key={record.id} className="metric-record-list__item">
            <View className="metric-record-list__main">
              <Text className="metric-record-list__date">
                {formatDisplay(parseDate(record.date))}
              </Text>
            </View>
            <View className="metric-record-list__side">
              <Text className="metric-record-list__value">
                {formatHealthMetricValue(record.value)}
                {record.unit}
              </Text>
              <Text
                className={`metric-record-list__status metric-record-list__status--${status}`}
              >
                {getHealthMetricRangeLabel(status)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
