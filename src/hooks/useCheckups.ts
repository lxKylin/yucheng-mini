import { useMemo, useSyncExternalStore } from 'react';

import { CHECKUP_STATUS } from '@/constants';
import { checkupStore } from '@/store/checkupStore';
import { reminderStore } from '@/store/reminderStore';
import { deriveAllCheckups, deriveCheckup } from '@/utils/checkupUtils';

function useCheckupStore() {
  return useSyncExternalStore(
    checkupStore.subscribe,
    checkupStore.getState,
    checkupStore.getInitialState
  );
}

function useMedicineStore() {
  return useSyncExternalStore(
    reminderStore.subscribe,
    reminderStore.getState,
    reminderStore.getInitialState
  );
}

export function useDerivedCheckups() {
  const checkups = useCheckupStore().checkups;
  const medicines = useMedicineStore().reminders;

  return useMemo(
    () => deriveAllCheckups(checkups, medicines),
    [checkups, medicines]
  );
}

export function useDerivedCheckupById(id: string) {
  const checkups = useCheckupStore().checkups;
  const medicines = useMedicineStore().reminders;

  return useMemo(() => {
    const target = checkups.find(
      (item) => item.id === id && item.status !== CHECKUP_STATUS.DELETED
    );
    return target ? deriveCheckup(target, medicines) : null;
  }, [checkups, id, medicines]);
}

export function useCheckupActions() {
  const state = useCheckupStore();

  return useMemo(
    () => ({
      addCheckup: state.addCheckup,
      updateCheckup: state.updateCheckup,
      deleteCheckup: state.deleteCheckup,
      togglePause: state.togglePause,
      completeCheckup: state.completeCheckup
    }),
    [state]
  );
}
