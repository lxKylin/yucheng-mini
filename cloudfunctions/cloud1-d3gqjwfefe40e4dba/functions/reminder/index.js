const axios = require('axios');
const cloud = require('wx-server-sdk');

const APP_ID = (process.env.ENV_APP_ID || '').trim();
const APP_SECRET = (process.env.ENV_APP_SECRET || '').trim();
const TEMPLATE_ID = (process.env.ENV_TEMPLATE_ID || '').trim();

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
 * 日期加天数
 */
function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return formatDate(date);
}

/**
 * 计算下次开药日期
 */
function calcNextDate(currentPrescriptionDate, intervalDays) {
  return addDays(currentPrescriptionDate, intervalDays);
}

/**
 * 计算提醒日期
 */
function calcRemindDate(nextDate, remindAdvanceDays) {
  return addDays(nextDate, -Number(remindAdvanceDays || 0));
}

/**
 * 获取 openid
 */
function getOpenId(medicine) {
  return medicine._openid || medicine.userId || '';
}

/**
 * 判断当前时间是否命中提醒时间
 * 默认允许 ±30 分钟误差
 */
function isTimeMatched(remindTime, toleranceMinutes = 30) {
  if (!remindTime) return false;

  const now = new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [hour, minute] = remindTime.split(':').map(Number);

  const targetMinutes = hour * 60 + minute;

  return Math.abs(currentMinutes - targetMinutes) <= toleranceMinutes;
}

/**
 * 安全裁剪订阅消息字段
 */
function safeText(value, max = 20) {
  return String(value || '')
    .replace(/\n/g, ' ')
    .slice(0, max);
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
    throw new Error('未配置订阅消息模板 ID，请设置 ENV_TEMPLATE_ID');
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
 * 发送订阅消息
 */
async function sendSubscribeMessage({ openId, medicine, nextDate }) {
  const accessToken = await getAccessToken();
  const medicineName = medicine.name || medicine.medicineName || '开药提醒';
  const note = medicine.note || medicine.notes || '复诊开药';

  return requestJson({
    method: 'POST',
    path: '/cgi-bin/message/subscribe/send',
    query: {
      access_token: accessToken
    },
    body: {
      touser: openId,
      template_id: TEMPLATE_ID,
      page: 'pages/home/index',
      lang: 'zh_CN',
      data: {
        thing2: {
          value: safeText(`请及时处理 ${medicineName} 开药`, 20)
        },
        time23: {
          value: nextDate
        },
        thing11: {
          value: safeText(note, 20)
        }
      }
    }
  });
}

/**
 * 更新提醒状态
 */
async function updateReminderStatus(id, today) {
  return db
    .collection('medicines')
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

  console.log(`[reminder] 开始执行，today=${today} currentTime=${currentTime}`);

  try {
    assertWechatConfig();
  } catch (error) {
    console.error(`[reminder] 配置错误 err=${error.message}`);
    throw error;
  }

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0
  };

  try {
    const { data: medicines } = await db
      .collection('medicines')
      .where({
        reminderEnabled: true,
        status: 'active'
      })
      .limit(1000)
      .get();

    console.log(`[reminder] 获取到 ${medicines.length} 条记录`);

    for (const medicine of medicines) {
      const medicineName = medicine.name || medicine.medicineName || '开药提醒';
      let openId = '';

      try {
        /**
         * 防止一天重复发送
         */
        if (medicine.lastWechatReminderDate === today) {
          console.log(`[reminder] 跳过重复发送 medicine=${medicineName}`);
          results.skipped++;
          continue;
        }

        /**
         * openid 校验
         */
        openId = getOpenId(medicine);

        if (!openId) {
          console.error(`[reminder] 缺少 openid id=${medicine._id}`);

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
            `[reminder] 用户暂无可用订阅资格 medicine=${medicineName}`
          );
          results.skipped++;
          continue;
        }

        /**
         * 计算日期
         */
        const nextDate = calcNextDate(
          medicine.currentPrescriptionDate,
          medicine.intervalDays
        );

        const remindDate = calcRemindDate(nextDate, medicine.remindAdvanceDays);

        console.log(
          `[reminder] 药品=${medicineName} remindDate=${remindDate} nextDate=${nextDate}`
        );

        /**
         * 今天不是提醒日
         */
        if (remindDate !== today) {
          results.skipped++;
          continue;
        }

        /**
         * 时间未命中
         */
        if (!isTimeMatched(medicine.remindTime || '09:00')) {
          console.log(
            `[reminder] 时间未命中 remindTime=${medicine.remindTime}`
          );

          results.skipped++;
          continue;
        }

        /**
         * 发送消息
         */
        await sendSubscribeMessage({
          openId,
          medicine,
          nextDate
        });

        /**
         * 更新状态
         */
        await updateReminderStatus(medicine._id, today);
        await updateUserSubscriptionStatus(
          openId,
          USER_WECHAT_SUBSCRIPTION_STATUS.CONSUMED,
          userCache
        );

        console.log(`[reminder] 发送成功 medicine=${medicineName}`);

        results.sent++;
      } catch (err) {
        console.error(
          `[reminder] 单条处理失败 medicine=${medicineName} err=${err.errMsg || err.message}`
        );

        /**
         * 用户订阅额度失效
         */
        if (String(err.errCode) === '43101') {
          try {
            await updateUserSubscriptionStatus(
              openId,
              USER_WECHAT_SUBSCRIPTION_STATUS.CONSUMED,
              userCache
            );
          } catch (e) {
            console.error('[reminder] 更新订阅状态失败', e);
          }
        }

        results.failed++;
      }
    }
  } catch (err) {
    console.error('[reminder] 数据库扫描失败', err);
  }

  console.log(
    `[reminder] 执行完成 sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`
  );

  return results;
};
