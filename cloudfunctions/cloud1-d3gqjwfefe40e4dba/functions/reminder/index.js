const cloud = require("wx-server-sdk");

const TEMPLATE_ID = "lJrijmJoifhTuQjcF2ENsXwR1T5_59Ey1W-cu0KugTw";

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

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

  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");

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
  return medicine._openid || medicine.userId || "";
}

/**
 * 判断当前时间是否命中提醒时间
 * 默认允许 ±30 分钟误差
 */
function isTimeMatched(remindTime, toleranceMinutes = 30) {
  if (!remindTime) return false;

  const now = new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [hour, minute] = remindTime.split(":").map(Number);

  const targetMinutes = hour * 60 + minute;

  return Math.abs(currentMinutes - targetMinutes) <= toleranceMinutes;
}

/**
 * 安全裁剪订阅消息字段
 */
function safeText(value, max = 20) {
  return String(value || "")
    .replace(/\n/g, " ")
    .slice(0, max);
}

/**
 * 发送订阅消息
 */
async function sendSubscribeMessage({ openId, medicine, nextDate }) {
  return cloud.openapi.subscribeMessage.send({
    touser: openId,

    templateId: TEMPLATE_ID,

    page: "pages/home/index",

    lang: "zh_CN",

    data: {
      thing2: {
        value: safeText(
          `请按时处理 ${medicine.medicineName || "开药提醒"}`,
          20,
        ),
      },

      time23: {
        value: nextDate,
      },

      thing11: {
        value: safeText(medicine.notes || "复诊开药", 20),
      },
    },
  });
}

/**
 * 更新提醒状态
 */
async function updateReminderStatus(id, today) {
  return db
    .collection("medicines")
    .doc(id)
    .update({
      data: {
        lastWechatReminderDate: today,
        lastWechatReminderAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
}

exports.main = async () => {
  const today = formatDate();

  const currentTime = formatTime();

  console.log(`[reminder] 开始执行，today=${today} currentTime=${currentTime}`);

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    const { data: medicines } = await db
      .collection("medicines")
      .where({
        status: "active",
        wechatReminderEnabled: true,
        wechatSubscriptionStatus: "accepted",
      })
      .limit(1000)
      .get();

    console.log(`[reminder] 获取到 ${medicines.length} 条记录`);

    for (const medicine of medicines) {
      try {
        /**
         * 防止一天重复发送
         */
        if (medicine.lastWechatReminderDate === today) {
          results.skipped++;
          continue;
        }

        /**
         * openid 校验
         */
        const openId = getOpenId(medicine);

        if (!openId) {
          console.error(`[reminder] 缺少 openid id=${medicine._id}`);

          results.failed++;
          continue;
        }

        /**
         * 计算日期
         */
        const nextDate = calcNextDate(
          medicine.currentPrescriptionDate,
          medicine.intervalDays,
        );

        const remindDate = calcRemindDate(nextDate, medicine.remindAdvanceDays);

        console.log(
          `[reminder] 药品=${medicine.medicineName} remindDate=${remindDate} nextDate=${nextDate}`,
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
        if (!isTimeMatched(medicine.remindTime || "09:00")) {
          console.log(
            `[reminder] 时间未命中 remindTime=${medicine.remindTime}`,
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
          nextDate,
        });

        /**
         * 更新状态
         */
        await updateReminderStatus(medicine._id, today);

        console.log(`[reminder] 发送成功 medicine=${medicine.medicineName}`);

        results.sent++;
      } catch (err) {
        console.error(
          `[reminder] 单条处理失败 medicine=${medicine.medicineName} err=${err.errMsg || err.message}`,
        );

        /**
         * 用户订阅额度失效
         */
        if (String(err.errCode) === "43101") {
          try {
            await db
              .collection("medicines")
              .doc(medicine._id)
              .update({
                data: {
                  wechatSubscriptionStatus: "expired",
                },
              });
          } catch (e) {
            console.error("[reminder] 更新订阅状态失败", e);
          }
        }

        results.failed++;
      }
    }
  } catch (err) {
    console.error("[reminder] 数据库扫描失败", err);
  }

  console.log(
    `[reminder] 执行完成 sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`,
  );

  return results;
};
