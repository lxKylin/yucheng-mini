const axios = require('axios');
const cloud = require('wx-server-sdk');

const APP_ID = (process.env.ENV_APP_ID || '').trim();
const APP_SECRET = (process.env.ENV_APP_SECRET || '').trim();
const TEMPLATE_ID = (
  process.env.ENV_CHECKUP_TEMPLATE_ID ||
  process.env.ENV_TEMPLATE_ID ||
  ''
).trim();

let cachedAccessToken = '';
let cachedAccessTokenExpireAt = 0;

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const USER_WECHAT_SUBSCRIPTION_STATUS = {
  AVAILABLE: 'available',
  CONSUMED: 'consumed'
};

function formatDate(date = new Date()) {
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatTime(date = new Date()) {
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return formatDate(date);
}

function calcRemindDate(targetDate, remindAdvanceDays) {
  return addDays(targetDate, -Number(remindAdvanceDays || 0));
}

function getOpenId(checkup) {
  return checkup._openid || checkup.userId || '';
}

function isTimeMatched(remindTime, toleranceMinutes = 30) {
  if (!remindTime) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [hour, minute] = remindTime.split(':').map(Number);
  const targetMinutes = hour * 60 + minute;

  return Math.abs(currentMinutes - targetMinutes) <= toleranceMinutes;
}

function safeText(value, max = 20) {
  return String(value || '')
    .replace(/\n/g, ' ')
    .slice(0, max);
}

function assertWechatConfig() {
  if (!APP_ID) {
    throw new Error('未配置小程序 APP_ID，请设置 ENV_APP_ID');
  }

  if (!APP_SECRET) {
    throw new Error('未配置小程序 APP_SECRET，请设置 ENV_APP_SECRET');
  }

  if (!TEMPLATE_ID) {
    throw new Error(
      '未配置检查提醒订阅消息模板 ID，请设置 ENV_CHECKUP_TEMPLATE_ID'
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

async function sendSubscribeMessage({ openId, checkup }) {
  const accessToken = await getAccessToken();
  const title = checkup.title || '复诊检查提醒';
  const note = checkup.note || checkup.hospital || '请按时处理复诊检查';

  return requestJson({
    method: 'POST',
    path: '/cgi-bin/message/subscribe/send',
    query: {
      access_token: accessToken
    },
    body: {
      touser: openId,
      template_id: TEMPLATE_ID,
      page: 'pages/checkups/index',
      lang: 'zh_CN',
      data: {
        thing2: {
          value: safeText(title, 20)
        },
        time23: {
          value: checkup.targetDate
        },
        thing11: {
          value: safeText(note, 20)
        }
      }
    }
  });
}

async function updateCheckupStatus(id, today) {
  return db
    .collection('checkups')
    .doc(id)
    .update({
      data: {
        lastWechatReminderDate: today,
        lastWechatReminderAt: new Date().toISOString(),
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
  const today = formatDate();
  const currentTime = formatTime();
  const userCache = new Map();

  console.log(
    `[checkupReminder] 开始执行，today=${today} currentTime=${currentTime}`
  );

  try {
    assertWechatConfig();
  } catch (error) {
    console.error(`[checkupReminder] 配置错误 err=${error.message}`);
    throw error;
  }

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0
  };

  try {
    const { data: checkups } = await db
      .collection('checkups')
      .where({
        status: 'active'
      })
      .limit(1000)
      .get();

    console.log(`[checkupReminder] 获取到 ${checkups.length} 条记录`);

    for (const checkup of checkups) {
      const title = checkup.title || '复诊检查提醒';
      let openId = '';

      try {
        if (checkup.lastWechatReminderDate === today) {
          console.log(`[checkupReminder] 跳过重复发送 checkup=${title}`);
          results.skipped++;
          continue;
        }

        openId = getOpenId(checkup);
        if (!openId) {
          console.error(`[checkupReminder] 缺少 openid id=${checkup._id}`);
          results.failed++;
          continue;
        }

        const userRecord = await getUserRecord(openId, userCache);
        if (
          !userRecord ||
          userRecord.wechatSubscriptionStatus !==
            USER_WECHAT_SUBSCRIPTION_STATUS.AVAILABLE
        ) {
          console.log(`[checkupReminder] 用户暂无可用订阅资格 checkup=${title}`);
          results.skipped++;
          continue;
        }

        const targetDate = checkup.targetDate || today;
        const remindDate = calcRemindDate(
          targetDate,
          checkup.remindAdvanceDays
        );

        console.log(
          `[checkupReminder] 检查=${title} remindDate=${remindDate} targetDate=${targetDate}`
        );

        if (remindDate !== today) {
          results.skipped++;
          continue;
        }

        if (!isTimeMatched(checkup.remindTime || '09:00')) {
          console.log(
            `[checkupReminder] 时间未命中 remindTime=${checkup.remindTime}`
          );
          results.skipped++;
          continue;
        }

        await sendSubscribeMessage({
          openId,
          checkup: { ...checkup, targetDate }
        });
        await updateCheckupStatus(checkup._id, today);
        await updateUserSubscriptionStatus(
          openId,
          USER_WECHAT_SUBSCRIPTION_STATUS.CONSUMED,
          userCache
        );

        console.log(`[checkupReminder] 发送成功 checkup=${title}`);
        results.sent++;
      } catch (err) {
        console.error(
          `[checkupReminder] 单条处理失败 checkup=${title} err=${err.errMsg || err.message}`
        );

        if (String(err.errCode) === '43101') {
          try {
            await updateUserSubscriptionStatus(
              openId,
              USER_WECHAT_SUBSCRIPTION_STATUS.CONSUMED,
              userCache
            );
          } catch (e) {
            console.error('[checkupReminder] 更新订阅状态失败', e);
          }
        }

        results.failed++;
      }
    }
  } catch (err) {
    console.error('[checkupReminder] 数据库扫描失败', err);
  }

  console.log(
    `[checkupReminder] 执行完成 sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`
  );

  return results;
};
