import { useEffect, useState } from 'react';
import { Image, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import {
  MAIN_TAB_BAR_ITEMS,
  type MainTabBarItem,
  type MainTabKey
} from '../constants/tabBar';
import {
  useGlobalReminderComposerActions,
  useGlobalReminderComposerState
} from '../hooks/useGlobalReminderComposer';
import { useBottomSheetActivity } from '../hooks/useBottomSheetActivity';

import './index.scss';

const DEFAULT_ACTIVE_KEY: MainTabKey = 'home';

function normalizePath(path?: string) {
  return (path ?? '').replace(/^\//, '');
}

function getActiveKeyByRoute(route?: string): MainTabKey {
  const currentPath = normalizePath(route);
  return (
    MAIN_TAB_BAR_ITEMS.find((item) => item.pagePath === currentPath)?.key ??
    DEFAULT_ACTIVE_KEY
  );
}

function getCurrentTabPagePath(route?: string) {
  const currentPath = normalizePath(route);
  return MAIN_TAB_BAR_ITEMS.find((item) => item.pagePath === currentPath)
    ?.pagePath;
}

function getCurrentRoute() {
  const pages = Taro.getCurrentPages();
  const currentPage = pages[pages.length - 1];
  return (
    currentPage?.route ??
    currentPage?.__route__ ??
    Taro.getCurrentInstance().router?.path
  );
}

function getTabUrl(item: MainTabBarItem) {
  return `/${item.pagePath}`;
}

export default function CustomTabBar() {
  const [activeKey, setActiveKey] = useState<MainTabKey>(DEFAULT_ACTIVE_KEY);
  const { composerOpen } = useGlobalReminderComposerState();
  const { requestOpen } = useGlobalReminderComposerActions();
  const hasActiveBottomSheet = useBottomSheetActivity();
  const addDisabled = composerOpen || hasActiveBottomSheet;

  const syncActiveKey = () => {
    setActiveKey(getActiveKeyByRoute(getCurrentRoute()));
  };

  useEffect(syncActiveKey, []);
  useDidShow(syncActiveKey);

  const handleSwitchTab = (item: MainTabBarItem) => {
    if (item.key === activeKey) return;

    setActiveKey(item.key);
    void Taro.switchTab({ url: getTabUrl(item) }).catch(() => {
      syncActiveKey();
    });
  };

  const handleAddReminder = () => {
    if (addDisabled) {
      return;
    }

    const pagePath = getCurrentTabPagePath(getCurrentRoute());
    if (!pagePath) {
      return;
    }

    requestOpen(pagePath);
  };

  const renderTabItem = (item: MainTabBarItem) => {
    const isActive = item.key === activeKey;

    return (
      <View
        key={item.key}
        className={`custom-tab-bar__item${
          isActive ? ' custom-tab-bar__item--active' : ''
        }`}
        role="tab"
        aria-label={`切换到${item.text}`}
        aria-selected={isActive}
        onClick={() => handleSwitchTab(item)}
      >
        <Image
          className="custom-tab-bar__icon"
          src={isActive ? item.customSelectedIconPath : item.customIconPath}
          mode="aspectFit"
        />
        <Text className="custom-tab-bar__text">{item.text}</Text>
      </View>
    );
  };

  return (
    <View className="custom-tab-bar" role="tablist" aria-label="主导航">
      <View className="custom-tab-bar__shell">
        <View className="custom-tab-bar__side">
          {MAIN_TAB_BAR_ITEMS.slice(0, 2).map(renderTabItem)}
        </View>

        <View
          className={`custom-tab-bar__add${
            addDisabled ? ' custom-tab-bar__add--disabled' : ''
          }`}
          role="button"
          aria-label="新增"
          aria-disabled={addDisabled}
          onClick={handleAddReminder}
        >
          <Text className="custom-tab-bar__add-icon">+</Text>
        </View>

        <View className="custom-tab-bar__side">
          {MAIN_TAB_BAR_ITEMS.slice(2).map(renderTabItem)}
        </View>
      </View>
    </View>
  );
}
