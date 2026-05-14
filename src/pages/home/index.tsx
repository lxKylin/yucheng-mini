import { Text, View } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import { useStore } from "zustand";

import { appStore } from "@/store";

import "./index.scss";

export default function Home() {
  const count = useStore(appStore, (state) => state.count);

  useLoad(() => {
    console.log("home loaded");
  });

  return (
    <View className="page-placeholder">
      <Text className="page-placeholder__text">首页 — 开发中</Text>
      <Text className="page-placeholder__hint">Store 占位值：{count}</Text>
    </View>
  );
}
