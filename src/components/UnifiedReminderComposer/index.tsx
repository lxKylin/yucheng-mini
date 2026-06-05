import { useEffect, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';

import CheckupComposer from '@/components/CheckupComposer';
import MedicineComposer from '@/components/MedicineComposer';

import './index.scss';

type ReminderType = 'medicine' | 'checkup';

interface UnifiedReminderComposerProps {
  defaultType?: ReminderType;
  defaultMedicineReminderEnabled?: boolean;
  resetKey: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: Array<{ key: ReminderType; label: string }> = [
  { key: 'medicine', label: '药品' },
  { key: 'checkup', label: '检查提醒' }
];

export default function UnifiedReminderComposer({
  defaultType = 'medicine',
  defaultMedicineReminderEnabled = false,
  resetKey,
  onSuccess,
  onCancel
}: UnifiedReminderComposerProps) {
  const [activeType, setActiveType] = useState<ReminderType>(defaultType);
  const [medicineKey, setMedicineKey] = useState(0);
  const [checkupKey, setCheckupKey] = useState(0);
  const previousResetRef = useRef({ defaultType, resetKey });

  useEffect(() => {
    const previousReset = previousResetRef.current;
    if (
      previousReset.defaultType === defaultType &&
      previousReset.resetKey === resetKey
    ) {
      return;
    }

    previousResetRef.current = { defaultType, resetKey };
    setActiveType(defaultType);
    setMedicineKey((value) => value + 1);
    setCheckupKey((value) => value + 1);
  }, [defaultType, resetKey]);

  return (
    <View className="unified-reminder-composer">
      <View className="unified-reminder-composer__switch">
        {TYPE_OPTIONS.map((option) => {
          const selected = option.key === activeType;

          return (
            <View
              key={option.key}
              className={`unified-reminder-composer__switch-item${selected ? ' unified-reminder-composer__switch-item--active' : ''}`}
              role="button"
              aria-label={`切换到${option.label}`}
              aria-pressed={selected}
              onClick={() => setActiveType(option.key)}
            >
              <Text className="unified-reminder-composer__switch-text">
                {option.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        className={`unified-reminder-composer__panel${activeType === 'medicine' ? '' : ' unified-reminder-composer__panel--hidden'}`}
      >
        <MedicineComposer
          key={medicineKey}
          defaultReminderEnabled={defaultMedicineReminderEnabled}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </View>

      <View
        className={`unified-reminder-composer__panel${activeType === 'checkup' ? '' : ' unified-reminder-composer__panel--hidden'}`}
      >
        <CheckupComposer
          key={checkupKey}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </View>
    </View>
  );
}
