const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_TOLERANCE_MS = 30 * 60 * 1000;

function parseDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || '')) return null;

  const [year, month, day] = dateString.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function parseTime(timeString) {
  if (!/^\d{2}:\d{2}$/.test(timeString || '')) return null;

  const [hour, minute] = timeString.split(':').map(Number);
  if (hour > 23 || minute > 59) return null;

  return (hour * 60 + minute) * 60 * 1000;
}

function formatDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function isExpiryReminderDue({ now, expiryDate, advanceDays, remindTime }) {
  const nowTimestamp = now instanceof Date ? now.getTime() : NaN;
  const expiryTimestamp = parseDate(expiryDate);
  const remindTimeOffset = parseTime(remindTime);

  if (
    !Number.isFinite(nowTimestamp) ||
    expiryTimestamp === null ||
    remindTimeOffset === null ||
    !Number.isInteger(advanceDays) ||
    advanceDays < 0
  ) {
    return { due: false, reason: 'invalid_input', reminderDate: null };
  }

  const chinaNowTimestamp = nowTimestamp + CHINA_TIME_OFFSET_MS;
  const chinaDate = new Date(chinaNowTimestamp);
  const chinaMidnightTimestamp = Date.UTC(
    chinaDate.getUTCFullYear(),
    chinaDate.getUTCMonth(),
    chinaDate.getUTCDate()
  );

  const plannedOccurrences = [-1, 0, 1].map((dayOffset) => {
    const reminderDateTimestamp = chinaMidnightTimestamp + dayOffset * DAY_MS;
    return {
      reminderDateTimestamp,
      timestamp:
        reminderDateTimestamp + remindTimeOffset - CHINA_TIME_OFFSET_MS
    };
  });
  const plannedOccurrence = plannedOccurrences.reduce((closest, current) =>
    Math.abs(current.timestamp - nowTimestamp) <
    Math.abs(closest.timestamp - nowTimestamp)
      ? current
      : closest
  );
  const reminderDate = formatDate(plannedOccurrence.reminderDateTimestamp);
  const targetExpiryTimestamp =
    plannedOccurrence.reminderDateTimestamp + advanceDays * DAY_MS;

  if (expiryTimestamp !== targetExpiryTimestamp) {
    return { due: false, reason: 'date_mismatch', reminderDate };
  }

  if (
    Math.abs(plannedOccurrence.timestamp - nowTimestamp) >
    TIME_TOLERANCE_MS
  ) {
    return { due: false, reason: 'time_mismatch', reminderDate };
  }

  return { due: true, reason: 'due', reminderDate };
}

module.exports = { isExpiryReminderDue };
