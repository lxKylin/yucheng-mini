import type { ReactNode } from "react";

import { Text, View } from "@tarojs/components";

import "./index.scss";

interface AppBarProps {
  title: string;
  caption?: string;
  right?: ReactNode;
}

export default function AppBar({ title, caption, right }: AppBarProps) {
  return (
    <View className="appbar">
      <View className="appbar__main">
        <Text className="appbar__title">{title}</Text>
        {caption ? <Text className="appbar__caption">{caption}</Text> : null}
      </View>
      {right ? <View className="appbar__right">{right}</View> : null}
    </View>
  );
}
