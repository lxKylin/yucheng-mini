import { View, Text } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import "./index.scss";
import { Button } from "@taroify/core";

export default function Index() {
  useLoad(() => {
    console.log("Page loaded.");
  });

  return (
    <View className="index">
      <Text>Hello world!</Text>
      <Button color="primary">按钮</Button>
    </View>
  );
}
