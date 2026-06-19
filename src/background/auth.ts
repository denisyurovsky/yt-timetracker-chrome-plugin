import { setChromeStorage } from "@/storage/chrome-storage";
import { KEYS } from "@/storage/keys";

/**
 * Управление учётными данными. Токен пишет и удаляет только воркер,
 * popup передаёт его сюда сообщением и сам в хранилище не лезет.
 */

export async function saveCredentials(
  token: string,
  url: string,
): Promise<void> {
  await setChromeStorage({
    storageArea: "local",
    key: KEYS.YTTOKEN,
    value: token,
  });
  await setChromeStorage({
    storageArea: "sync",
    key: KEYS.YTURL,
    value: url,
  });
}

export async function deleteToken(): Promise<void> {
  await setChromeStorage({
    storageArea: "local",
    key: KEYS.YTTOKEN,
    value: "",
  });
}
