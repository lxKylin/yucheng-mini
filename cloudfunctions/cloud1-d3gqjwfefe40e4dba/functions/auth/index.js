const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 云函数：auth
 * 微信登录换取 openid，新用户自动写入 users 集合，返回用户信息。
 *
 * data 参数（可选）：
 *   - nickName: string   用户昵称（需前端主动授权后传入）
 *   - avatarUrl: string  用户头像（需前端主动授权后传入）
 */
exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return { success: false, error: "无法获取 OPENID" };
  }

  const { nickName, avatarUrl, wechatSubscriptionStatus } = event;

  try {
    const { data } = await db
      .collection("users")
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    let userRecord;

    if (data.length === 0) {
      // 新用户：自动注册
      const now = new Date().toISOString();
      const newUser = {
        _openid: OPENID,
        nickName: nickName || "",
        avatarUrl: avatarUrl || "",
        wechatSubscriptionStatus: wechatSubscriptionStatus || "unknown",
        wechatSubscriptionUpdatedAt: wechatSubscriptionStatus ? now : "",
        createdAt: now,
        updatedAt: now,
      };
      await db.collection("users").add({ data: newUser });
      userRecord = newUser;
    } else {
      userRecord = data[0];
      // 如果本次携带了授权信息，顺便更新
      if (nickName || avatarUrl || wechatSubscriptionStatus) {
        const patch = { updatedAt: new Date().toISOString() };
        if (nickName) patch.nickName = nickName;
        if (avatarUrl) patch.avatarUrl = avatarUrl;
        if (wechatSubscriptionStatus) {
          patch.wechatSubscriptionStatus = wechatSubscriptionStatus;
          patch.wechatSubscriptionUpdatedAt = patch.updatedAt;
        }
        await db
          .collection("users")
          .where({ _openid: OPENID })
          .update({ data: patch });
        Object.assign(userRecord, patch);
      }
    }

    return {
      success: true,
      openid: OPENID,
      nickName: userRecord.nickName || "",
      avatarUrl: userRecord.avatarUrl || "",
      wechatSubscriptionStatus:
        userRecord.wechatSubscriptionStatus || "unknown",
      wechatSubscriptionUpdatedAt: userRecord.wechatSubscriptionUpdatedAt || "",
    };
  } catch (err) {
    console.error("[auth] 用户记录操作失败：", err);
    return { success: true, openid: OPENID, nickName: "", avatarUrl: "" };
  }
};
