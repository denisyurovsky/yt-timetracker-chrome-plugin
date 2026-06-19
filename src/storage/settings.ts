import { getChromeStorage, setChromeStorage } from "@/storage/chrome-storage";
import { KEYS } from "@/storage/keys";
import type { YTRegularTask, YTSettings } from "@/shared/types";

/**
 * Несекретные настройки списания. Раскладка хранилищ — по спецификации:
 * - sync: проект, тип работы, шаг, постоянные задачи;
 * - local: задачи на день.
 * Токен здесь не участвует — им управляет только service worker.
 */

export const DEFAULT_STEP = 30;

export async function loadSettings(): Promise<YTSettings> {
  const [projectId, workTypeId, step, regularTasks, dailyTasks] =
    await Promise.all([
      getChromeStorage<string>({ storageArea: "sync", key: KEYS.PROJECT }),
      getChromeStorage<string>({ storageArea: "sync", key: KEYS.WORK_TYPE }),
      getChromeStorage<number>({ storageArea: "sync", key: KEYS.STEP }),
      getChromeStorage<YTRegularTask[]>({
        storageArea: "sync",
        key: KEYS.REGULAR_TASKS,
      }),
      getChromeStorage<YTRegularTask[]>({
        storageArea: "local",
        key: KEYS.DAILY_TASKS,
      }),
    ]);

  return {
    projectId: typeof projectId === "string" ? projectId : "",
    workTypeId: typeof workTypeId === "string" ? workTypeId : "",
    step: Number(step) || DEFAULT_STEP,
    regularTasks: Array.isArray(regularTasks) ? regularTasks : [],
    dailyTasks: Array.isArray(dailyTasks) ? dailyTasks : [],
  };
}

export async function saveSettings(settings: YTSettings): Promise<void> {
  await Promise.all([
    setChromeStorage({
      storageArea: "sync",
      key: KEYS.PROJECT,
      value: settings.projectId,
    }),
    setChromeStorage({
      storageArea: "sync",
      key: KEYS.WORK_TYPE,
      value: settings.workTypeId,
    }),
    setChromeStorage({
      storageArea: "sync",
      key: KEYS.STEP,
      value: settings.step,
    }),
    setChromeStorage({
      storageArea: "sync",
      key: KEYS.REGULAR_TASKS,
      value: settings.regularTasks,
    }),
    setChromeStorage({
      storageArea: "local",
      key: KEYS.DAILY_TASKS,
      value: settings.dailyTasks,
    }),
  ]);
}

/** Базовый URL YouTrack (несекретный) — для ссылок на задачи из попапа. */
export async function loadYouTrackUrl(): Promise<string> {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_YT_URL;
  }

  const url = await getChromeStorage<string>({
    storageArea: "sync",
    key: KEYS.YTURL,
  });

  return typeof url === "string" ? url : "";
}
