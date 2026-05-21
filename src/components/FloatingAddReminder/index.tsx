import { Text, View } from '@tarojs/components';

import './index.scss';

interface FloatingAddReminderProps {
  ariaLabel?: string;
  hidden?: boolean;
  onClick: () => void;
}

export default function FloatingAddReminder({
  ariaLabel = '新增开药提醒',
  hidden = false,
  onClick
}: FloatingAddReminderProps) {
  if (hidden) {
    return null;
  }

  return (
    <View
      className="floating-add-reminder"
      role="button"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <Text className="floating-add-reminder__icon">+</Text>
    </View>
  );
}
