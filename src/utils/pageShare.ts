interface ShareablePageComponent {
  enableShareAppMessage?: boolean;
  enableShareTimeline?: boolean;
}

export function withPageShare<T extends (...args: any[]) => unknown>(
  component: T
): T & ShareablePageComponent {
  const shareableComponent = component as T & ShareablePageComponent;
  shareableComponent.enableShareAppMessage = true;
  shareableComponent.enableShareTimeline = true;
  return shareableComponent;
}
