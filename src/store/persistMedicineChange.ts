export async function persistMedicineChange(
  persist: () => Promise<void>,
  commit: () => void
) {
  await persist();
  commit();
}
