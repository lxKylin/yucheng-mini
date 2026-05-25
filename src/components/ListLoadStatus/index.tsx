import { Text, View } from '@tarojs/components';

import './index.scss';

interface ListLoadStatusProps {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
}

export default function ListLoadStatus({
  visibleCount,
  totalCount,
  hasMore
}: ListLoadStatusProps) {
  if (totalCount === 0) {
    return null;
  }

  const text = hasMore
    ? `已显示 ${visibleCount} / ${totalCount} 条，继续上拉查看更多`
    : `已显示全部 ${totalCount} 条`;

  return (
    <View className="list-load-status" aria-label={text}>
      <Text className="list-load-status__text">{text}</Text>
    </View>
  );
}
