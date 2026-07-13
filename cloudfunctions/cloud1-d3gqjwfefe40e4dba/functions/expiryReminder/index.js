const axios = require('axios');
const cloud = require('wx-server-sdk');
const { isExpiryReminderDue } = require('./expiryReminderDue');

const APP_ID = (process.env.ENV_APP_ID || '').trim();
const APP_SECRET = (process.env.ENV_APP_SECRET || '').trim();
const TEMPLATE_ID = (process.env.ENV_EXPIRY_TEMPLATE_ID || '').trim();

const configuredExpiryAdvanceDays = Number(
  process.env.ENV_EXPIRY_ADVANCE_DAYS || 30
);
const EXPIRY_ADVANCE_DAYS = Number.isFinite(configuredExpiryAdvanceDays)
  ? configuredExpiryAdvanceDays
  : 30;

let cachedAccessToken = '';
let cachedAccessTokenExpireAt = 0;

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const USER_WECHAT_SUBSCRIPTION_STATUS = {
  AVAILABLE: 'available',
  CONSUMED: 'consumed'
};

/**
 * 获取东八区日期字符串
 * YYYY-MM-DD
 */
function formatDate(date = new Date()) {
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/**
 * 获取东八区时间字符串
 * HH:mm
 */
function formatTime(date = new Date()) {
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');

  return `${hh}:${mm}`;
}

/**
 * 获取 openid
 */
function getOpenId(medicine) {
  return medicine._openid || medicine.userId || '';
}

/**
 * 安全裁剪订阅消息字段
 */
function safeText(value, max = 20) {
  return String(value || '')
    .replace(/\n/g, ' ')
    .slice(0, max);
}

function getExpiryReminderTime(medicine) {
  return (
    medicine.expiryRemindTime ||
    medicine.remindTime ||
    medicine.scheduleTime ||
    '09:00'
  );
}

function assertWechatConfig() {
  if (!APP_ID) {
    throw new Error('未配置小程序 APP_ID，请设置 ENV_APP_ID 或 WX_APP_ID');
  }

  if (!APP_SECRET) {
    throw new Error(
      '未配置小程序 APP_SECRET，请在云函数环境变量中设置 ENV_APP_SECRET 或 WX_APP_SECRET'
    );
  }

  if (!TEMPLATE_ID) {
    throw new Error(
      '未配置过期提醒订阅消息模板 ID，请设置 ENV_EXPIRY_TEMPLATE_ID 或 ENV_TEMPLATE_ID'
    );
  }
}

function requestJson({ method, path, query = {}, body }) {
  return axios({
    baseURL: 'https://api.weixin.qq.com',
    url: path,
    method,
    params: query,
    data: body,
    timeout: 10000
  })
    .then((response) => {
      const parsed = response.data || {};

      if (
        typeof parsed.errcode !== 'undefined' &&
        Number(parsed.errcode) !== 0
      ) {
        const error = new Error(
          `[wechat] errcode=${parsed.errcode} errmsg=${parsed.errmsg}`
        );
        error.statusCode = response.status;
        error.errCode = parsed.errcode;
        error.errMsg = parsed.errmsg;
        throw error;
      }

      return parsed;
    })
    .catch((error) => {
      if (error.response) {
        const parsed = error.response.data || {};
        const wrapped = new Error(
          `[wechat] HTTP ${error.response.status} ${parsed.errmsg || error.message}`
        );
        wrapped.statusCode = error.response.status;
        wrapped.errCode = parsed.errcode;
        wrapped.errMsg = parsed.errmsg || error.message;
        throw wrapped;
      }

      throw error;
    });
}

async function getAccessToken() {
  if (cachedAccessToken && cachedAccessTokenExpireAt > Date.now() + 60 * 1000) {
    return cachedAccessToken;
  }

  assertWechatConfig();

  const tokenRes = await requestJson({
    method: 'GET',
    path: '/cgi-bin/token',
    query: {
      grant_type: 'client_credential',
      appid: APP_ID,
      secret: APP_SECRET
    }
  });

  cachedAccessToken = tokenRes.access_token;
  cachedAccessTokenExpireAt =
    Date.now() + Number(tokenRes.expires_in || 0) * 1000;

  if (!cachedAccessToken) {
    throw new Error('微信 access_token 获取失败：响应中缺少 access_token');
  }

  return cachedAccessToken;
}

/**
 * 发送药品过期订阅消息
 */
async function sendExpirySubscribeMessage({ openId, medicine, expiryDate }) {
  const accessToken = await getAccessToken();
  const medicineName = medicine.name || medicine.medicineName || '药品';

  return requestJson({
    method: 'POST',
    path: '/cgi-bin/message/subscribe/send',
    query: {
      access_token: accessToken
    },
    body: {
      touser: openId,
      template_id: TEMPLATE_ID,
      page: 'pages/medicines/index',
      lang: 'zh_CN',
      data: {
        thing1: {
          value: safeText(`${medicineName} 即将过期`, 20)
        },
        time2: {
          value: expiryDate
        },
        thing3: {
          value: '您的药品即将过期，请及时更换新药品。'
        }
      }
    }
  });
}

/**
 * 更新药品过期提醒状态
 */
async function updateExpiryReminderStatus(id, reminderDate) {
  return db
    .collection('medicines')
    .doc(id)
    .update({
      data: {
        lastWechatExpiryReminderDate: reminderDate,
        lastWechatExpiryReminderAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
}

async function getUserRecord(openId, cache) {
  if (!openId) return null;

  if (cache.has(openId)) {
    return cache.get(openId);
  }

  const { data } = await db
    .collection('users')
    .where({ _openid: openId })
    .limit(1)
    .get();

  const userRecord = data[0] || null;
  cache.set(openId, userRecord);
  return userRecord;
}

async function updateUserSubscriptionStatus(openId, status, cache) {
  if (!openId) return;

  const userRecord = await getUserRecord(openId, cache);
  if (!userRecord || !userRecord._id) return;

  const patch = {
    wechatSubscriptionStatus: status,
    wechatSubscriptionUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('users').doc(userRecord._id).update({ data: patch });
  cache.set(openId, { ...userRecord, ...patch });
}

exports.main = async () => {
  const now = new Date();
  const today = formatDate(now);
  const currentTime = formatTime(now);
  const userCache = new Map();

  console.log(
    `[expiryReminder] 开始执行，today=${today} currentTime=${currentTime}`
  );

  try {
    assertWechatConfig();
  } catch (error) {
    console.error(`[expiryReminder] 配置错误 err=${error.message}`);
    throw error;
  }

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    dateMismatch: 0,
    timeMismatch: 0,
    invalidInput: 0,
    duplicate: 0
  };

  try {
    const { data: medicines } = await db
      .collection('medicines')
      .where({
        status: 'active'
      })
      .limit(1000)
      .get();

    console.log(`[expiryReminder] 获取到 ${medicines.length} 条记录`);

    for (const medicine of medicines) {
      const medicineName = medicine.name || medicine.medicineName || '药品';
      let openId = '';

      try {
        const reminderDecision = isExpiryReminderDue({
          now,
          expiryDate: medicine.expiryDate,
          advanceDays: EXPIRY_ADVANCE_DAYS,
          remindTime: getExpiryReminderTime(medicine)
        });

        if (!reminderDecision.due) {
          if (reminderDecision.reason === 'date_mismatch') {
            results.dateMismatch++;
          } else if (reminderDecision.reason === 'time_mismatch') {
            results.timeMismatch++;
          } else {
            results.invalidInput++;
          }
          results.skipped++;
          continue;
        }

        if (
          medicine.lastWechatExpiryReminderDate ===
          reminderDecision.reminderDate
        ) {
          console.log(`[expiryReminder] 跳过重复发送 medicine=${medicineName}`);
          results.duplicate++;
          results.skipped++;
          continue;
        }

        openId = getOpenId(medicine);

        if (!openId) {
          console.error(`[expiryReminder] 缺少 openid id=${medicine._id}`);
          results.failed++;
          continue;
        }

        const userRecord = await getUserRecord(openId, userCache);
        if (
          !userRecord ||
          userRecord.wechatSubscriptionStatus !==
            USER_WECHAT_SUBSCRIPTION_STATUS.AVAILABLE
        ) {
          console.log(
            `[expiryReminder] 用户暂无可用订阅资格 medicine=${medicineName}`
          );
          results.skipped++;
          continue;
        }

        await sendExpirySubscribeMessage({
          openId,
          medicine,
          expiryDate: medicine.expiryDate
        });

        await updateExpiryReminderStatus(
          medicine._id,
          reminderDecision.reminderDate
        );
        await updateUserSubscriptionStatus(
          openId,
          USER_WECHAT_SUBSCRIPTION_STATUS.CONSUMED,
          userCache
        );

        console.log(`[expiryReminder] 发送成功 medicine=${medicineName}`);

        results.sent++;
      } catch (err) {
        console.error(
          `[expiryReminder] 单条处理失败 medicine=${medicineName} err=${err.errMsg || err.message}`
        );

        if (String(err.errCode) === '43101') {
          try {
            await updateUserSubscriptionStatus(
              openId,
              USER_WECHAT_SUBSCRIPTION_STATUS.CONSUMED,
              userCache
            );
          } catch (e) {
            console.error('[expiryReminder] 更新订阅状态失败', e);
          }
        }

        results.failed++;
      }
    }
  } catch (err) {
    console.error('[expiryReminder] 数据库扫描失败', err);
  }

  console.log(
    `[expiryReminder] 执行完成 sent=${results.sent} failed=${results.failed} skipped=${results.skipped} dateMismatch=${results.dateMismatch} timeMismatch=${results.timeMismatch} invalidInput=${results.invalidInput} duplicate=${results.duplicate}`
  );

  return results;
};
