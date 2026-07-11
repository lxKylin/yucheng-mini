import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';

import { initCloud } from '@/services/cloud';
import { login } from '@/services/auth';
import { reminderStore } from '@/store/reminderStore';
import { checkupStore } from '@/store/checkupStore';
import { healthStatusStore } from '@/store/healthStatusStore';
import { getHealthStatusLookbackRange } from '@/hooks/useHealthStatus';

import './app.scss';

/**
 * 云开发环境 ID，从 .env 文件中读取 ENV_CLOUD_ID。
 * 生产环境：.env.production；开发环境：.env.development
 */
const CLOUD_ENV_ID = process.env.ENV_CLOUD_ID ?? '';

function App({ children }: PropsWithChildren<any>) {
  useLaunch(async () => {
    console.log('App launched.');
    console.log('[App] 当前云环境 ID：', CLOUD_ENV_ID || '(未配置)');

    // 1. 初始化云开发（重复调用安全）
    initCloud(CLOUD_ENV_ID);

    // 2. 微信登录，获取用户信息
    const profile = await login();
    if (!profile) {
      console.warn('[App] 登录失败，提醒数据无法从云端加载');
      reminderStore.setState({
        loading: false,
        error: '登录失败，无法加载药箱'
      });
      return;
    }
    console.log('User:', profile.openid, profile.nickName || '(未设置昵称)');

    // 3. 从云端拉取当前用户的提醒数据和近一个月每日状态
    const { startDate, endDate } = getHealthStatusLookbackRange();

    await Promise.all([
      reminderStore.getState().loadFromCloud(),
      checkupStore.getState().loadFromCloud(),
      healthStatusStore
        .getState()
        .loadRange(startDate, endDate)
        .catch((error) => {
          console.warn('[App] 每日状态记录加载失败，启动流程继续', error);
        })
    ]);
  });

  return children;
}

export default App;
