import { Text, View } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";

import "./index.scss";

export default function ListPage() {
  useLoad(() => {
    console.log("list loaded");
  });

  return (
    <View className="page-placeholder">
      <Text className="page-placeholder__text">提醒列表 — 开发中</Text>
    </View>
  );
}
