import { Text, View } from "@tarojs/components"
import { useLoad } from "@tarojs/taro"

import "./index.scss"

export default function Messages() {
  useLoad(() => {
    console.log("messages loaded")
  })

  return (
    <View className="page-placeholder">
      <Text className="page-placeholder__text">提醒中心 — 开发中</Text>
    </View>
  )
}