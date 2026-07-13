const HISTORY_MAX = 5;
const RECENT_MUTATION_MAX = 50;

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function assertDate(value, message) {
  if (!isDate(value)) {
    throw new Error(message);
  }
}

function assertMutationId(value) {
  if (typeof value !== 'string' || value.trim().length < 8 || value.length > 128) {
    throw new Error('提交标识无效');
  }
}

function assertExpectedVersion(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('记录版本无效');
  }
}

function assertRemindTime(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('提醒时间无效');
  }
}

function getVersion(checkup) {
  return Number.isInteger(checkup.version) && checkup.version >= 0
    ? checkup.version
    : 0;
}

function getRecentMutationIds(checkup) {
  return Array.isArray(checkup.recentMutationIds)
    ? checkup.recentMutationIds.filter((item) => typeof item === 'string')
    : [];
}

function createCheckupMutationHandler({ runTransaction, now = () => new Date().toISOString() }) {
  return async function mutateCheckup(event) {
    const {
      action,
      checkupId,
      mutationId,
      expectedVersion,
      openid
    } = event;

    if (action !== 'complete' && action !== 'restart') {
      throw new Error('不支持的检查操作');
    }
    if (typeof checkupId !== 'string' || !checkupId) {
      throw new Error('检查提醒标识无效');
    }
    if (typeof openid !== 'string' || !openid) {
      throw new Error('缺少用户身份');
    }
    assertMutationId(mutationId);
    assertExpectedVersion(expectedVersion);

    const currentDate = now().slice(0, 10);
    if (action === 'complete') {
      assertDate(event.doneDate, '实际完成日期无效');
      if (event.doneDate > currentDate) {
        throw new Error('实际完成日期不能晚于今天');
      }
      if (event.nextTargetDate !== undefined) {
        assertDate(event.nextTargetDate, '下次检查日期无效');
        if (event.nextTargetDate <= event.doneDate) {
          throw new Error('下次检查日期需晚于完成日期');
        }
      }
    } else {
      assertDate(event.targetDate, '下次检查日期无效');
      if (event.targetDate < currentDate) {
        throw new Error('下次检查日期不能早于今天');
      }
      if (!Number.isInteger(event.remindAdvanceDays) || event.remindAdvanceDays < 0) {
        throw new Error('提前提醒天数无效');
      }
      assertRemindTime(event.remindTime);
    }

    return runTransaction(async (transaction) => {
      const checkup = await transaction.findOwnedCheckup(checkupId, openid);
      if (!checkup) {
        throw new Error('检查提醒不存在或无权访问');
      }

      const recentMutationIds = getRecentMutationIds(checkup);
      if (recentMutationIds.includes(mutationId)) {
        return { status: 'duplicate', checkup };
      }

      const version = getVersion(checkup);
      if (version !== expectedVersion) {
        return { status: 'conflict', checkup };
      }

      const updatedAt = now();
      const nextPayload = {
        updatedAt,
        version: version + 1,
        recentMutationIds: [mutationId, ...recentMutationIds].slice(
          0,
          RECENT_MUTATION_MAX
        )
      };

      if (action === 'complete') {
        nextPayload.completionHistory = [
          {
            date: event.doneDate,
            note: typeof event.note === 'string' ? event.note : '',
            createdAt: updatedAt,
            eventId: mutationId
          },
          ...(Array.isArray(checkup.completionHistory)
            ? checkup.completionHistory
            : [])
        ].slice(0, HISTORY_MAX);
        nextPayload.status = event.nextTargetDate ? 'active' : 'done';
        nextPayload.targetDate = event.nextTargetDate || checkup.targetDate;
        nextPayload.lastWechatReminderDate = event.nextTargetDate
          ? ''
          : checkup.lastWechatReminderDate || '';
        nextPayload.lastWechatReminderAt = event.nextTargetDate
          ? ''
          : checkup.lastWechatReminderAt || '';
      } else {
        nextPayload.status = 'active';
        nextPayload.targetDate = event.targetDate;
        nextPayload.remindAdvanceDays = event.remindAdvanceDays;
        nextPayload.remindTime = event.remindTime;
        nextPayload.lastWechatReminderDate = '';
        nextPayload.lastWechatReminderAt = '';
      }

      await transaction.updateCheckup(checkup.id, nextPayload);
      return { status: 'applied', checkup: { ...checkup, ...nextPayload } };
    });
  };
}

module.exports = { createCheckupMutationHandler };
