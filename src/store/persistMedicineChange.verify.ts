import { persistMedicineChange } from './persistMedicineChange';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[persistMedicineChange.verify] ${message}`);
}

async function verifyPersistMedicineChange() {
  let committed = false;
  try {
    await persistMedicineChange(
      async () => {
        throw new Error('模拟云端更新失败');
      },
      () => {
        committed = true;
      }
    );
  } catch {
    // 预期失败：重点验证本地提交未执行。
  }

  assert(!committed, '云端失败时不得提交本地药品状态');

  await persistMedicineChange(
    async () => undefined,
    () => {
      committed = true;
    }
  );
  assert(committed, '云端成功后应提交完整本地状态');
}

verifyPersistMedicineChange().catch((error) => {
  throw error;
});
