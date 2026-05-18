import Taro, { useDidShow } from '@tarojs/taro';

export function useTabScrollToTop() {
  useDidShow(() => {
    void Taro.pageScrollTo({
      scrollTop: 0,
      duration: 0
    });
  });
}
