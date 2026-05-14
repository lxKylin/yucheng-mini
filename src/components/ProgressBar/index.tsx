import { View } from "@tarojs/components";

import type { ReminderLevel } from "@/types";

import "./index.scss";

interface ProgressBarProps {
  progress: number;
  level: ReminderLevel;
}

const colorMap = {
  danger: "danger",
  warning: "warning",
  good: "success",
  paused: "success",
} as const;

export default function ProgressBar({ progress, level }: ProgressBarProps) {
  const barLevel = level === "paused" ? "good" : level;
  const safePercent = Math.min(100, Math.max(0, progress));

  return (
    <View className={`progress-bar progress-bar--${barLevel}`}>
      <View
        className="progress-bar__portion"
        style={{ width: `${safePercent}%` }}
      />
    </View>
  );
}
