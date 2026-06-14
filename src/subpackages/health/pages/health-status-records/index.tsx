import { Text, View } from '@tarojs/components';
import Taro, {
  useShareAppMessage,
  useShareTimeline
} from '@tarojs/taro';
import {
  CalendarOutlined,
  RecordsOutlined
} from '@taroify/icons';

import { SHARE_IMAGE, SHARE_PATH } from '@/constants';
import {
  getHealthStatusLookbackRange,
  useRecentHealthStatuses
} from '@/hooks/useHealthStatus';
import type { HealthOverallStatus, HealthStatusRecord } from '@/types';
import { formatDisplay, parseDate } from '@/utils/dateUtils';
import {
  getMedicationAdherenceLabel,
  getOverallStatusLabel,
  getSymptomTagLabel
} from '@/utils/healthStatusUtils';
import { withPageShare } from '@/utils/pageShare';

import './index.scss';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getWeekdayLabel(date: string) {
  return WEEKDAYS[parseDate(date).getDay()];
}

function getStatusTone(status: HealthOverallStatus) {
  if (status === 'good') return 'good';
  if (status === 'bad') return 'danger';
  if (status === 'uncomfortable') return 'warning';
  return 'normal';
}

function HealthStatusRecordItem({
  record
}: {
  record: HealthStatusRecord;
}) {
  const symptomLabels = record.symptomTags.map(getSymptomTagLabel);
  const tone = getStatusTone(record.overallStatus);
  const hasMedicationChange = record.medicationAdherence !== 'normal';
  const symptomText =
    symptomLabels.length > 0 ? symptomLabels.join('、') : '未记录具体感受';

  return (
    <View className="health-record-item">
      <View
        className={`health-record-item__marker health-record-item__marker--${tone}`}
      />
      <View className="health-record-item__card">
        <View className="health-record-item__head">
          <View className="health-record-item__date">
            <Text className="health-record-item__day">
              {formatDisplay(parseDate(record.date))}
            </Text>
            <Text className="health-record-item__weekday">
              {getWeekdayLabel(record.date)}
            </Text>
          </View>
          <Text
            className={`health-record-item__status health-record-item__status--${tone}`}
          >
            {getOverallStatusLabel(record.overallStatus)}
          </Text>
        </View>

        <View className="health-record-item__content">
          <View className="health-record-item__row">
            <Text className="health-record-item__row-label">感受：</Text>
            <Text className="health-record-item__row-value">
              {symptomText}
            </Text>
          </View>

          {record.note ? (
            <View className="health-record-item__row">
              <Text className="health-record-item__row-label">备注：</Text>
              <Text className="health-record-item__row-value">
                {record.note}
              </Text>
            </View>
          ) : null}
        </View>

        {hasMedicationChange ? (
          <View className="health-record-item__line">
            <Text className="health-record-item__line-label">用药变化：</Text>
            <Text className="health-record-item__line-value">
              {getMedicationAdherenceLabel(record.medicationAdherence)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HealthStatusRecordsPage() {
  const records = useRecentHealthStatuses();
  const { startDate, endDate } = getHealthStatusLookbackRange();
  const rangeText = `${formatDisplay(parseDate(startDate))}-${formatDisplay(
    parseDate(endDate)
  )}`;

  Taro.useLoad(() => {
    Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage', 'shareTimeline']
    });
  });

  useShareAppMessage(() => ({
    title: '愈历：近一个月状态记录',
    path: SHARE_PATH,
    imageUrl: SHARE_IMAGE
  }));

  useShareTimeline(() => ({
    title: '愈历：近一个月状态记录',
    query: 'from=health-status-records',
    imageUrl: SHARE_IMAGE
  }));

  return (
    <View className="health-records-page">
      <View className="health-records-page__hero">
        <View className="health-records-page__hero-icon" aria-hidden="true">
          <RecordsOutlined />
        </View>
        <View className="health-records-page__hero-copy">
          <Text className="health-records-page__eyebrow">近一个月</Text>
          <Text className="health-records-page__title">状态记录</Text>
          <Text className="health-records-page__desc">
            按时间回看每天记录的身体感受和备注
          </Text>
        </View>
      </View>

      <View className="health-records-page__summary">
        <CalendarOutlined className="health-records-page__summary-icon" />
        <Text className="health-records-page__summary-text">
          {rangeText} · {records.length} 天已记录
        </Text>
      </View>

      {records.length > 0 ? (
        <View className="health-records-page__timeline">
          {records.map((record) => (
            <HealthStatusRecordItem
              key={record.id || record.date}
              record={record}
            />
          ))}
        </View>
      ) : (
        <View className="health-records-page__empty">
          <Text className="health-records-page__empty-title">
            近一个月还没有状态记录
          </Text>
          <Text className="health-records-page__empty-desc">
            今天可以从首页记录一次，之后会在这里按时间线回看。
          </Text>
        </View>
      )}
    </View>
  );
}

export default withPageShare(HealthStatusRecordsPage);
