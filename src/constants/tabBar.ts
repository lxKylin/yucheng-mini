export type MainTabKey = 'home' | 'list' | 'medicines' | 'profile';

export interface MainTabBarItem {
  key: MainTabKey;
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
  customIconPath: string;
  customSelectedIconPath: string;
}

export const MAIN_TAB_BAR_ITEMS: MainTabBarItem[] = [
  {
    key: 'home',
    pagePath: 'pages/home/index',
    text: '首页',
    iconPath: 'assets/tabbar/home.png',
    selectedIconPath: 'assets/tabbar/home-active.png',
    customIconPath: '/assets/tabbar/home.png',
    customSelectedIconPath: '/assets/tabbar/home-active.png'
  },
  {
    key: 'list',
    pagePath: 'pages/list/index',
    text: '提醒',
    iconPath: 'assets/tabbar/list.png',
    selectedIconPath: 'assets/tabbar/list-active.png',
    customIconPath: '/assets/tabbar/list.png',
    customSelectedIconPath: '/assets/tabbar/list-active.png'
  },
  {
    key: 'medicines',
    pagePath: 'pages/medicines/index',
    text: '药箱',
    iconPath: 'assets/tabbar/medicines.png',
    selectedIconPath: 'assets/tabbar/medicines-active.png',
    customIconPath: '/assets/tabbar/medicines.png',
    customSelectedIconPath: '/assets/tabbar/medicines-active.png'
  },
  {
    key: 'profile',
    pagePath: 'pages/profile/index',
    text: '我的',
    iconPath: 'assets/tabbar/user.png',
    selectedIconPath: 'assets/tabbar/user-active.png',
    customIconPath: '/assets/tabbar/user.png',
    customSelectedIconPath: '/assets/tabbar/user-active.png'
  }
];

export const APP_TAB_BAR_LIST = MAIN_TAB_BAR_ITEMS.map(
  ({ pagePath, text, iconPath, selectedIconPath }) => ({
    pagePath,
    text,
    iconPath,
    selectedIconPath
  })
);
