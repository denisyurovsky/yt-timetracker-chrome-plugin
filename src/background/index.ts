import { callYtApi } from "@/background/youtrack-client";
import { saveCredentials, deleteToken } from "@/background/auth";
import type { WorkerMessage } from "@/shared/messages";

/**
 * Точка входа service worker — единственный контекст, где читается и
 * используется пользовательский токен. Popup сюда отправляет сообщения и
 * получает обратно готовые данные; сам токен в popup/DOM/URL/логи не попадает.
 */
chrome.runtime.onMessage.addListener(
  (message: WorkerMessage, _sender, sendResponse) => {
    (async () => {
      switch (message.kind) {
        case "yt-api":
          sendResponse(await callYtApi(message.method, message.params));
          break;
        case "save-credentials":
          await saveCredentials(message.token, message.url);
          sendResponse({ ok: true });
          break;
        case "delete-token":
          await deleteToken();
          sendResponse({ ok: true });
          break;
      }
    })();

    // Отвечаем асинхронно — держим канал сообщения открытым.
    return true;
  },
);
