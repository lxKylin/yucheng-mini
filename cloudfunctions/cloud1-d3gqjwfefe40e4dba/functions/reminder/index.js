const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const TEMPLATE_ID = "lJrijmJoifhTuQjcF2ENsXwR1T5_59Ey1W-cu0KugTw";

/** 计算两日期（YYYY-MM-DD）的天数差 */
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

/** 计算下次开药日期 */
function calcNextDate(lastDate, interval) {
  const d = new Date(lastDate);
  d.setDate(d.getDate() + interval);
  return d.toISOString().slice(0, 10);
}

/** 计算提醒触发日期 */
function calcRemindDate(nextDate, before) {
  const d = new Date(nextDate);
  d.setDate(d.getDate() - before);
  return d.toISOString().slice(0, 10);
}

function getOpenId(medicine) {
  return medicine._openid || medicine.userId || "";
}

/**
 * 云函数：reminder
 * 触发器：在云开发控制台配置 Cron "0 0 8,9,10 * * * *"（每天 8/9/10 点触发）
 * 功能：扫描 medicines 集合，对今日应发送提醒的记录调用订阅消息 API
 */
exports.main = async () => {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[reminder] 执行提醒扫描，今日日期 ${today}`);
  const nowHour = new Date().getHours();
  console.log(`[reminder] 当前小时 ${nowHour}`);
  const results = { sent: 0, failed: 0, skipped: 0 };

  if (TEMPLATE_ID === "YOUR_TEMPLATE_ID") {
    console.warn("[reminder] 未配置订阅消息模板 ID，跳过发送");
    return results;
  }

  try {
    const { data: medicines } = await db
      .collection("medicines")
      .where({ status: "active" })
      .limit(1000)
      .get();
    console.log(`[reminder] 扫描到 ${medicines.length} 条活跃药品记录`);

    for (const medicine of medicines) {
      if (
        !medicine.wechatReminderEnabled ||
        medicine.wechatSubscriptionStatus !== "accepted"
      ) {
        results.skipped++;
        continue;
      }

      if (medicine.lastWechatReminderDate === today) {
        results.skipped++;
        continue;
      }

      const openId = getOpenId(medicine);
      if (!openId) {
        results.failed++;
        console.error(
          `[reminder] 缺少 openid id=${medicine._id || medicine.id}`,
        );
        continue;
      }

      const nextDate = calcNextDate(
        medicine.currentPrescriptionDate,
        medicine.intervalDays,
      );
      const remindDate = calcRemindDate(nextDate, medicine.remindAdvanceDays);
      console.log(
        `[reminder] 计算提醒日期 ${remindDate}，下次开药日期 ${nextDate}，药品 ${medicine.medicineName || ""}`,
      );

      // 不是今日提醒日期则跳过
      console.log(
        `[reminder] 今日提醒日期 ${remindDate}，今日日期 ${today}，是否需要提醒 ${remindDate !== today}`,
      );
      if (remindDate !== today) {
        console.log(
          `[reminder] 今日不需要提醒，跳过药品 ${medicine.medicineName || ""}`,
        );
        results.skipped++;
        continue;
      }

      // 检查提醒时间与当前执行时段是否匹配（±1小时内）
      const [remindHour] = (medicine.remindTime || "09:00")
        .split(":")
        .map(Number);
      console.log(
        `[reminder] 当前小时 ${nowHour}，提醒小时 ${remindHour}，是否匹配 ${Math.abs(nowHour - remindHour) <= 1}`,
      );
      if (Math.abs(nowHour - remindHour) > 1) {
        console.log(
          `[reminder] 当前时间与提醒时间不匹配，跳过药品 ${medicine.medicineName || ""}`,
        );
        results.skipped++;
        continue;
      }

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: openId,
          templateId: TEMPLATE_ID,
          page: "pages/home/index",
          data: {
            thing2: {
              value: `请按时处理 ${medicine.medicineName || "开药提醒"}`.slice(
                0,
                20,
              ),
            },
            time23: { value: nextDate },
            thing11: {
              value: (medicine.notes || "复诊开药").slice(0, 20),
            },
          },
        });

        await db
          .collection("medicines")
          .doc(medicine._id)
          .update({
            data: {
              lastWechatReminderDate: today,
              lastWechatReminderAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          });
        results.sent++;
      } catch (err) {
        console.error(
          `[reminder] 发送失败 name=${medicine.medicineName} err=${err.errMsg ?? err.message}`,
        );
        results.failed++;
      }
    }
  } catch (err) {
    console.error("[reminder] 扫描数据库失败：", err);
  }

  console.log(
    `[reminder] 完成：发送 ${results.sent}，失败 ${results.failed}，跳过 ${results.skipped}`,
  );
  return results;
};
