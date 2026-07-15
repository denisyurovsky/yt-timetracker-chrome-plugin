import { ElNotification, type NotificationOptions } from "element-plus";

export function notify(options: Partial<NotificationOptions>) {
  const handle = ElNotification({
    position: "bottom-right",
    ...options,
    onClick: () => handle.close(),
  });

  return handle;
}
