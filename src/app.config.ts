export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/list/index',
    'pages/medicines/index',
    'pages/profile/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f8fcfa',
    navigationBarTitleText: '愈程记',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: false,
    color: '#8aa0a7',
    selectedColor: '#157a66',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/list/index',
        text: '提醒',
        iconPath: 'assets/tabbar/list.png',
        selectedIconPath: 'assets/tabbar/list-active.png'
      },
      {
        pagePath: 'pages/medicines/index',
        text: '药箱',
        iconPath: 'assets/tabbar/medicines.png',
        selectedIconPath: 'assets/tabbar/medicines-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/user.png',
        selectedIconPath: 'assets/tabbar/user-active.png'
      }
    ]
  }
});
