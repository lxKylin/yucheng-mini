const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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

/**
 * 云函数：reminder
 * 触发器：在云开发控制台配置 Cron "0 0 8,9,10 * * * *"（每天 8/9/10 点触发）
 * 功能：扫描 medicines 集合，对今日应发送提醒的记录调用订阅消息 API
 */
exports.main = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const nowHour = new Date().getHours();
  const results = { sent: 0, failed: 0, skipped: 0 };

  try {
    const { data: medicines } = await db
      .collection("medicines")
      .where({ status: "active" })
      .limit(1000)
      .get();

    for (const medicine of medicines) {
      const nextDate = calcNextDate(medicine.lastDate, medicine.interval);
      const remindDate = calcRemindDate(nextDate, medicine.before);

      // 不是今日提醒日期则跳过
      if (remindDate !== today) {
        results.skipped++;
        continue;
      }

      // 检查提醒时间与当前执行时段是否匹配（±1小时内）
      const [remindHour] = (medicine.time || "09:00").split(":").map(Number);
      if (Math.abs(nowHour - remindHour) > 1) {
        results.skipped++;
        continue;
      }

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: medicine._openid,
          // 在微信公众平台 → 订阅消息 → 我的模板 中申请后填入真实模板 ID
          templateId: "YOUR_TEMPLATE_ID",
          page: "pages/home/index",
          data: {
            thing1: { value: medicine.name.slice(0, 20) },
            time2: { value: nextDate },
            thing3: {
              value: `提前 ${medicine.before} 天提醒，请及时复诊开药`.slice(
                0,
                20,
              ),
            },
          },
        });
        results.sent++;
      } catch (err) {
        console.error(
          `[reminder] 发送失败 name=${medicine.name} err=${err.errMsg ?? err.message}`,
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
