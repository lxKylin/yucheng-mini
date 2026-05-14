import { Text, View } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";

import "./index.scss";

export default function Profile() {
  useLoad(() => {
    console.log("profile loaded");
  });

  return (
    <View className="page-placeholder">
      <Text className="page-placeholder__text">我的 — 开发中</Text>
    </View>
  );
}
