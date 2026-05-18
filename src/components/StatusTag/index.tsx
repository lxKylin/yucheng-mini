import Tag from '@taroify/core/tag';

import { REMINDER_LEVEL } from '@/constants';
import type { ReminderLevel } from '@/types';

import './index.scss';

interface StatusTagProps {
  level: ReminderLevel;
  label: string;
}

const colorMap = {
  [REMINDER_LEVEL.DANGER]: 'danger',
  [REMINDER_LEVEL.WARNING]: 'warning',
  [REMINDER_LEVEL.GOOD]: 'success',
  [REMINDER_LEVEL.PAUSED]: 'default'
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
