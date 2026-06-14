import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ArrowRight } from '@taroify/icons';

import { useHealthStatusSummary } from '@/hooks/useHealthStatus';

import './index.scss';

export default function ProfileHealthSummary() {
  const healthStatusSummary = useHealthStatusSummary();

  const openRecords = () => {
    Taro.navigateTo({
      url: '/subpackages/health/pages/health-status-records/index'
    });
  };

  return (
    <View
      className="profile-health-summary"
      onClick={openRecords}
      role="button"
      aria-label="查看近一个月状态记录"
    >
      <View className="profile-health-summary__head">
        <View className="profile-health-summary__copy">
          <Text className="profile-health-summary__title">近一个月状态</Text>
          <Text className="profile-health-summary__desc">
            只展示你的记录统计，不做诊断判断
          </Text>
        </View>
        <View className="profile-health-summary__action" aria-hidden="true">
          <Text className="profile-health-summary__action-text">查看</Text>
          <ArrowRight className="profile-health-summary__action-icon" />
        </View>
      </View>

      {healthStatusSummary.totalDays > 0 ? (
        <>
          <View className="profile-health-summary__metrics">
            <View className="profile-health-summary__metric">
              <Text className="profile-health-summary__value">
                {healthStatusSummary.totalDays}
              </Text>
              <Text className="profile-health-summary__label">记录天数</Text>
            </View>
            <View className="profile-health-summary__metric">
              <Text className="profile-health-summary__value">
                {healthStatusSummary.uncomfortableDays}
              </Text>
              <Text className="profile-health-summary__label">不适天数</Text>
            </View>
            <View className="profile-health-summary__metric">
              <Text className="profile-health-summary__value">
                {healthStatusSummary.abnormalAdherenceDays}
              </Text>
              <Text className="profile-health-summary__label">用药异常</Text>
            </View>
          </View>
          <Text className="profile-health-summary__tags">
            {healthStatusSummary.commonSymptomTags.length > 0
              ? `常见感受：${healthStatusSummary.commonSymptomTags
                  .map((item) => item.label)
                  .join('、')}`
              : '暂未记录具体感受标签'}
          </Text>
        </>
      ) : (
        <Text className="profile-health-summary__empty">
          还没有近一个月状态记录，今天可以从首页记录一次。
        </Text>
      )}
    </View>
  );
}
