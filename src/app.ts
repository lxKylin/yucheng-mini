import { PropsWithChildren } from "react";
import { useLaunch } from "@tarojs/taro";

import { initCloud } from "@/services/cloud";
import { login } from "@/services/auth";
import { reminderStore } from "@/store/reminderStore";

import "./app.scss";

/**
 * 云开发环境 ID，从 .env 文件中读取 ENV_CLOUD_ID。
 * 生产环境：.env.production；开发环境：.env.development
 */
const CLOUD_ENV_ID = process.env.ENV_CLOUD_ID ?? "";

function App({ children }: PropsWithChildren<any>) {
  useLaunch(async () => {
    console.log("App launched.");

    // 1. 初始化云开发（重复调用安全）
    initCloud(CLOUD_ENV_ID);

    // 2. 微信登录，获取用户信息
    const profile = await login();
    if (!profile) {
      console.warn("[App] 登录失败，使用本地缓存数据继续运行");
      return;
    }
    console.log("User:", profile.openid, profile.nickName || "(未设置昵称)");

    // 3. 从云端拉取最新数据（覆盖本地缓存）
    await reminderStore.getState().loadFromCloud();
  });

  return children;
}

export default App;
