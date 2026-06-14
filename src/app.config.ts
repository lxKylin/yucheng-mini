import { APP_TAB_BAR_LIST } from './constants/tabBar';

export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/list/index',
    'pages/medicines/index',
    'pages/profile/index',
    'pages/health-status-records/index',
    'pages/health-metrics/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#f8fcfa',
    navigationBarTitleText: '愈历',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#8aa0a7',
    selectedColor: '#157a66',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: APP_TAB_BAR_LIST
  }
});
