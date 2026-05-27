import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';

import BottomSheet from '@/components/BottomSheet';
import HealthStatusComposer from '@/components/HealthStatusComposer';
import { useTodayHealthStatus } from '@/hooks/useHealthStatus';
import type { HealthOverallStatus } from '@/types';
import {
  buildTodayHealthStatusSummary,
  getOverallStatusLabel
} from '@/utils/healthStatusUtils';

import './index.scss';

interface HomeHealthStatusEntryProps {
  onOpenChange?: (open: boolean) => void;
}

type HomeHealthStatusTone =
  | 'empty'
  | 'good'
  | 'normal'
  | 'warning'
  | 'danger';

function getHomeHealthStatusTone(
  overallStatus?: HealthOverallStatus
): HomeHealthStatusTone {
  if (overallStatus === 'good') return 'good';
  if (overallStatus === 'uncomfortable') return 'warning';
  if (overallStatus === 'bad') return 'danger';
  if (overallStatus === 'normal') return 'normal';
  return 'empty';
}

function getHomeHealthStatusHint(
  overallStatus?: HealthOverallStatus
): string | null {
  if (overallStatus === 'bad') {
    return '明显不适时，必要时请咨询医生。';
  }

  if (overallStatus === 'uncomfortable') {
    return '身体不舒服时，建议留意变化。';
  }

  return null;
}

export default function HomeHealthStatusEntry({
  onOpenChange
}: HomeHealthStatusEntryProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const todayHealthStatus = useTodayHealthStatus();
  const healthStatusSummary = buildTodayHealthStatusSummary(todayHealthStatus);
  const statusTone = getHomeHealthStatusTone(
    todayHealthStatus?.overallStatus
  );
  const statusHint = getHomeHealthStatusHint(todayHealthStatus?.overallStatus);

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
        className={`home-health-status home-health-status--${statusTone}${
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
          {statusHint ? (
            <Text className="home-health-status__hint">{statusHint}</Text>
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
