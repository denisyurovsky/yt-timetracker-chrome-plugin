const ChromeStorageMap = {
  local: chrome?.storage?.local,
  sync: chrome?.storage?.sync,
};

export type KeysOfChromeStorage = keyof typeof ChromeStorageMap;

interface ChromeStorageOptions {
  storageArea: KeysOfChromeStorage;
  key: string;
}

const devStorage = {
  local: {
    get: async (key: string) => {
      const item = localStorage.getItem(key);
      return item ? { [key]: JSON.parse(item) } : {};
    },
    set: async (data: Record<string, unknown>) => {
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
    },
  },
  sync: {
    get: async (key: string) => {
      const item = localStorage.getItem(`sync_${key}`);
      return item ? { [key]: JSON.parse(item) } : {};
    },
    set: async (data: Record<string, unknown>) => {
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(`sync_${key}`, JSON.stringify(value));
      });
    },
  },
};

/**
 * chrome.storage клонирует значение через structured clone, который падает на
 * Vue-прокси (reactive/ref). Прогоняем через JSON, чтобы отдать чистый
 * сериализуемый объект без реактивности.
 */
function toPlain<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getChromeStorage<T = unknown>({
  key,
  storageArea,
}: ChromeStorageOptions): Promise<T> {
  if (import.meta.env.DEV) {
    const devResult = await devStorage[storageArea].get(key);
    return devResult?.[key] as T;
  }

  const result = await ChromeStorageMap[storageArea].get(key);
  return result?.[key] as T;
}

export async function setChromeStorage<T = unknown>({
  key,
  storageArea,
  value,
}: ChromeStorageOptions & { value: T }): Promise<void> {
  if (import.meta.env.DEV) {
    await devStorage[storageArea].set({
      [key]: value,
    });
    return;
  }

  await ChromeStorageMap[storageArea].set({
    [key]: toPlain(value),
  });
}
