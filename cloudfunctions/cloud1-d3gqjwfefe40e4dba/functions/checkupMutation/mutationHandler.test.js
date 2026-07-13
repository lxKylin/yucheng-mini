const assert = require('node:assert/strict');
const { test } = require('node:test');

let createCheckupMutationHandler;

try {
  ({ createCheckupMutationHandler } = require('./mutationHandler'));
} catch {
  createCheckupMutationHandler = undefined;
}

function createMemoryRepository(initialCheckup) {
  let current = structuredClone(initialCheckup);
  let queue = Promise.resolve();

  return {
    async runTransaction(task) {
      const previous = queue;
      let release;
      queue = new Promise((resolve) => {
        release = resolve;
      });

      await previous;
      try {
        return await task({
          async findOwnedCheckup(id, openid) {
            if (id !== current.id || openid !== current._openid) {
              return null;
            }
            return structuredClone(current);
          },
          async updateCheckup(id, payload) {
            assert.equal(id, current.id);
            current = { ...current, ...structuredClone(payload) };
          }
        });
      } finally {
        release();
      }
    },
    read() {
      return structuredClone(current);
    }
  };
}

function createHandler(initialCheckup) {
  assert.equal(
    typeof createCheckupMutationHandler,
    'function',
    '检查状态 mutation handler 应存在'
  );
  const repository = createMemoryRepository(initialCheckup);
  const handler = createCheckupMutationHandler({
    runTransaction: repository.runTransaction,
    now: () => '2026-07-12T00:00:00.000Z'
  });

  return { handler, repository };
}

function createCheckup(overrides = {}) {
  return {
    id: 'checkup-1',
    _openid: 'user-1',
    title: '复查血常规',
    targetDate: '2026-07-12',
    remindAdvanceDays: 3,
    remindTime: '09:00',
    status: 'active',
    completionHistory: [],
    lastWechatReminderDate: '2026-07-09',
    lastWechatReminderAt: '2026-07-09T09:00:00.000Z',
    version: 0,
    ...overrides
  };
}

function completePayload(overrides = {}) {
  return {
    action: 'complete',
    openid: 'user-1',
    checkupId: 'checkup-1',
    mutationId: 'complete-1',
    expectedVersion: 0,
    doneDate: '2026-07-12',
    note: '结果正常',
    ...overrides
  };
}

test('同一完成 mutation 并发五次时只追加一条历史', async () => {
  const { handler, repository } = createHandler(createCheckup());

  const results = await Promise.all(
    Array.from({ length: 5 }, () => handler(completePayload()))
  );

  assert.equal(results.filter((item) => item.status === 'applied').length, 1);
  assert.equal(results.filter((item) => item.status === 'duplicate').length, 4);
  assert.equal(repository.read().completionHistory.length, 1);
  assert.equal(repository.read().completionHistory[0].eventId, 'complete-1');
  assert.equal(repository.read().version, 1);
});

test('并发的不同完成事件冲突后重试会保留两条历史', async () => {
  const { handler, repository } = createHandler(createCheckup());

  const [first, second] = await Promise.all([
    handler(completePayload({ mutationId: 'complete-a' })),
    handler(completePayload({ mutationId: 'complete-b' }))
  ]);
  const conflict = [first, second].find((item) => item.status === 'conflict');
  const applied = [first, second].find((item) => item.status === 'applied');

  assert.equal(applied.status, 'applied');
  assert.equal(conflict.status, 'conflict');

  const retried = await handler(
    completePayload({
      mutationId: 'complete-b',
      expectedVersion: conflict.checkup.version,
      note: '第二次完成记录'
    })
  );

  assert.equal(retried.status, 'applied');
  assert.equal(repository.read().completionHistory.length, 2);
  assert.equal(repository.read().version, 2);
});

test('完成与重新安排竞争时旧版本不得覆盖已确认写入', async () => {
  const { handler, repository } = createHandler(createCheckup());

  const [completion, restart] = await Promise.all([
    handler(completePayload({ mutationId: 'complete-race' })),
    handler({
      action: 'restart',
      openid: 'user-1',
      checkupId: 'checkup-1',
      mutationId: 'restart-race',
      expectedVersion: 0,
      targetDate: '2026-08-12',
      remindAdvanceDays: 7,
      remindTime: '10:00'
    })
  ]);

  assert.equal(
    [completion, restart].filter((item) => item.status === 'applied').length,
    1
  );
  assert.equal(
    [completion, restart].filter((item) => item.status === 'conflict').length,
    1
  );
  assert.equal(repository.read().version, 1);
});

test('拒绝无效日期和无权访问', async () => {
  const { handler } = createHandler(createCheckup());

  await assert.rejects(
    () => handler(completePayload({ doneDate: '2026-07-32' })),
    /实际完成日期无效/
  );
  await assert.rejects(
    () => handler(completePayload({ openid: 'other-user' })),
    /不存在或无权访问/
  );
});

test('云端写入失败会向调用方抛出错误', async () => {
  const handler = createCheckupMutationHandler({
    now: () => '2026-07-12T00:00:00.000Z',
    runTransaction: async (task) =>
      task({
        async findOwnedCheckup() {
          return createCheckup();
        },
        async updateCheckup() {
          throw new Error('数据库暂不可用');
        }
      })
  });

  await assert.rejects(() => handler(completePayload()), /数据库暂不可用/);
});
