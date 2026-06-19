import ky from "ky";
import { KEYS } from "@/storage/keys";
import { getChromeStorage, setChromeStorage } from "@/storage/chrome-storage";

/**
 * Этот модуль исполняется только в доверенном контексте:
 * - в проде — внутри service worker;
 * - в DEV (npm run dev) — на странице, токен берётся из .env.
 *
 * Здесь нет импортов UI (router, ElNotification): в service worker нет DOM,
 * реакция на 401 (уведомление + редирект) живёт в popup.
 */

async function resolveBaseUrl(): Promise<string> {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_YT_URL;
  }

  return getChromeStorage<string>({ storageArea: "sync", key: KEYS.YTURL });
}

async function resolveToken(): Promise<string> {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_DEV_YT_TOKEN;
  }

  return getChromeStorage<string>({ storageArea: "local", key: KEYS.YTTOKEN });
}

export async function getKyInstance() {
  return ky.create({
    baseUrl: await resolveBaseUrl(),
    hooks: {
      beforeRequest: [
        async ({ request }) => {
          const token = await resolveToken();
          request.headers.set("Authorization", `Bearer ${token}`);
        },
      ],
      afterResponse: [
        async ({ response }) => {
          if (response.status === 401 && !import.meta.env.DEV) {
            await setChromeStorage({
              storageArea: "local",
              key: KEYS.YTTOKEN,
              value: "",
            });
          }
        },
      ],
    },
  });
}
