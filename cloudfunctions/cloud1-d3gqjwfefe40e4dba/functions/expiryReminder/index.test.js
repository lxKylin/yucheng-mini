const assert = require('node:assert/strict');
const { test } = require('node:test');

let isExpiryReminderDue;

try {
  ({ isExpiryReminderDue } = require('./expiryReminderDue'));
} catch {
  isExpiryReminderDue = undefined;
}

function evaluate(overrides = {}) {
  assert.equal(
    typeof isExpiryReminderDue,
    'function',
    'isExpiryReminderDue 应存在'
  );

  return isExpiryReminderDue({
    now: new Date('2026-07-13T01:00:00.000Z'),
    expiryDate: '2026-08-12',
    advanceDays: 30,
    remindTime: '09:00',
    ...overrides
  });
}

test('周一、周三、周日的提前提醒日均可命中', () => {
  const samples = [
    ['2026-07-13T01:00:00.000Z', '2026-08-12', '2026-07-13'],
    ['2026-07-15T01:00:00.000Z', '2026-08-14', '2026-07-15'],
    ['2026-07-19T01:00:00.000Z', '2026-08-18', '2026-07-19']
  ];

  for (const [now, expiryDate, reminderDate] of samples) {
    assert.deepEqual(
      evaluate({ now: new Date(now), expiryDate }),
      { due: true, reason: 'due', reminderDate }
    );
  }
});

test('08:30、09:00、21:30 均可在半小时调度点命中', () => {
  const samples = [
    ['2026-07-13T00:30:00.000Z', '08:30'],
    ['2026-07-13T01:00:00.000Z', '09:00'],
    ['2026-07-13T13:30:00.000Z', '21:30']
  ];

  for (const [now, remindTime] of samples) {
    assert.equal(evaluate({ now: new Date(now), remindTime }).due, true);
  }
});

test('时间窗口包含前后 30 分钟但不包含第 31 分钟', () => {
  assert.equal(
    evaluate({ now: new Date('2026-07-13T01:30:00.000Z') }).due,
    true
  );
  assert.deepEqual(
    evaluate({ now: new Date('2026-07-13T01:31:00.000Z') }),
    {
      due: false,
      reason: 'time_mismatch',
      reminderDate: '2026-07-13'
    }
  );
});

test('日期不满足提前天数时返回日期不命中', () => {
  assert.deepEqual(evaluate({ expiryDate: '2026-08-13' }), {
    due: false,
    reason: 'date_mismatch',
    reminderDate: '2026-07-13'
  });
});

test('23:50 提醒在次日 00:10 命中并归属前一日', () => {
  assert.deepEqual(
    evaluate({
      now: new Date('2026-07-13T16:10:00.000Z'),
      remindTime: '23:50'
    }),
    { due: true, reason: 'due', reminderDate: '2026-07-13' }
  );
});

test('00:10 提醒在前日 23:50 命中并归属次日', () => {
  assert.deepEqual(
    evaluate({
      now: new Date('2026-07-13T15:50:00.000Z'),
      expiryDate: '2026-08-13',
      remindTime: '00:10'
    }),
    { due: true, reason: 'due', reminderDate: '2026-07-14' }
  );
});

test('非法日期、提醒时刻、提前天数和执行时刻均不发送', () => {
  const samples = [
    { expiryDate: '2026-02-30' },
    { remindTime: '24:00' },
    { remindTime: '9:00' },
    { advanceDays: -1 },
    { advanceDays: 1.5 },
    { now: new Date('invalid') }
  ];

  for (const overrides of samples) {
    assert.deepEqual(evaluate(overrides), {
      due: false,
      reason: 'invalid_input',
      reminderDate: null
    });
  }
});
