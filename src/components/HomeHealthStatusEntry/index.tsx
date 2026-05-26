import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';

import BottomSheet from '@/components/BottomSheet';
import HealthStatusComposer from '@/components/HealthStatusComposer';
import { useTodayHealthStatus } from '@/hooks/useHealthStatus';
import {
  buildTodayHealthStatusSummary,
  getOverallStatusLabel
} from '@/utils/healthStatusUtils';

import './index.scss';

interface HomeHealthStatusEntryProps {
  onOpenChange?: (open: boolean) => void;
}

export default function HomeHealthStatusEntry({
  onOpenChange
}: HomeHealthStatusEntryProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const todayHealthStatus = useTodayHealthStatus();
  const healthStatusSummary = buildTodayHealthStatusSummary(todayHealthStatus);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  const openSheet = () => {
    setOpen(true);
  };

  const closeSheet = () => {
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <>
      <View
        className={`home-health-status${
          todayHealthStatus ? ' home-health-status--done' : ''
        }`}
        role="button"
        aria-label={todayHealthStatus ? '修改今日状态' : '记录今日状态'}
        onClick={openSheet}
      >
        <View className="home-health-status__copy">
          <Text className="home-health-status__eyebrow">
            {todayHealthStatus ? '今日已记录' : '今日状态'}
          </Text>
          <Text className="home-health-status__title">
            {healthStatusSummary}
          </Text>
          {todayHealthStatus?.overallStatus === 'bad' ? (
            <Text className="home-health-status__hint">
              明显不适时，必要时请咨询医生。
            </Text>
          ) : null}
        </View>
        <Text className="home-health-status__action">
          {todayHealthStatus ? '修改' : '记录'}
        </Text>
      </View>

      <BottomSheet
        open={open}
        title={
          todayHealthStatus
            ? `修改今日状态：${getOverallStatusLabel(todayHealthStatus.overallStatus)}`
            : '记录今日状态'
        }
        onClose={closeSheet}
        closeDisabled={submitting}
      >
        <HealthStatusComposer
          record={todayHealthStatus}
          onSuccess={closeSheet}
          onCancel={closeSheet}
          onSubmittingChange={setSubmitting}
        />
      </BottomSheet>
    </>
  );
}
