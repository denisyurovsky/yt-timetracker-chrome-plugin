import { ElNotification, type NotificationOptions } from "element-plus";

/**
 * Обёртка над ElNotification с едиными правилами:
 * - позиция снизу (горизонтальное центрирование — в глобальных стилях);
 * - закрытие по клику на уведомление.
 */
export function notify(options: Partial<NotificationOptions>) {
  const handle = ElNotification({
    position: "bottom-right",
    ...options,
    onClick: () => handle.close(),
  });

  return handle;
}
