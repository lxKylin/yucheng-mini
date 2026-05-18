import { Text, View } from '@tarojs/components';

import './index.scss';

interface FloatingAddReminderProps {
  hidden?: boolean;
  onClick: () => void;
}

export default function FloatingAddReminder({
  hidden = false,
  onClick
}: FloatingAddReminderProps) {
  if (hidden) {
    return null;
  }

  return (
    <View className="floating-add-reminder" onClick={onClick}>
      <Text className="floating-add-reminder__icon">+</Text>
    </View>
  );
}
