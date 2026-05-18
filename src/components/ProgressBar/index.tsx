import { View } from '@tarojs/components';

import type { ReminderLevel } from '@/types';

import './index.scss';

interface ProgressBarProps {
  progress: number;
  level: ReminderLevel;
}

export default function ProgressBar({ progress, level }: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, progress));

  return (
    <View className={`progress-bar progress-bar--${level}`}>
      <View
        className="progress-bar__portion"
        style={{ width: `${safePercent}%` }}
      />
    </View>
  );
}
