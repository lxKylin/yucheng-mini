import Tag from "@taroify/core/tag";

import type { ReminderLevel } from "@/types";

import "./index.scss";

interface StatusTagProps {
  level: ReminderLevel;
  label: string;
}

const colorMap = {
  danger: "danger",
  warning: "warning",
  good: "success",
  paused: "default",
} as const;

export default function StatusTag({ level, label }: StatusTagProps) {
  return (
    <Tag
      shape="rounded"
      color={colorMap[level]}
      className={`status-tag status-tag--${level}`}
    >
      {label}
    </Tag>
  );
}
