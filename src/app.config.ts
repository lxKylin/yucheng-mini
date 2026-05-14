export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/list/index",
    "pages/messages/index",
    "pages/profile/index",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#f3fbfc",
    navigationBarTitleText: "愈程记",
    navigationBarTextStyle: "black",
  },
  tabBar: {
    custom: false,
    color: "#8aa0a7",
    selectedColor: "#0c839a",
    backgroundColor: "#ffffff",
    borderStyle: "white",
    list: [
      {
        pagePath: "pages/home/index",
        text: "首页",
        iconPath: "assets/tabbar/home.png",
        selectedIconPath: "assets/tabbar/home-active.png",
      },
      {
        pagePath: "pages/list/index",
        text: "提醒列表",
        iconPath: "assets/tabbar/list.png",
        selectedIconPath: "assets/tabbar/list-active.png",
      },
      {
        pagePath: "pages/messages/index",
        text: "提醒中心",
        iconPath: "assets/tabbar/bell.png",
        selectedIconPath: "assets/tabbar/bell-active.png",
      },
      {
        pagePath: "pages/profile/index",
        text: "我的",
        iconPath: "assets/tabbar/user.png",
        selectedIconPath: "assets/tabbar/user-active.png",
      },
    ],
  },
});
