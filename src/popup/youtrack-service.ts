import { type Either } from "@sweet-monads/either";
import { KyError } from "ky";
import { notify } from "@/popup/notify";
import router, { RouteNames } from "@/popup/router";
import { LOCALES } from "@/popup/locales";
import { INVALID_TOKEN } from "@/shared/messages";
import { deserializeEither, type SerializedEither } from "@/shared/either";
import type { WorkerMessage, YtRequestMethod } from "@/shared/messages";
import type {
  YTMe,
  YTProject,
  YTRegularTask,
  YTWorkItem,
  YTWorkItemType,
  YTTimeTracking,
} from "@/shared/types";

/**
 * Фасад для UI. Сигнатуры и возвращаемый Either не меняются — компоненты
 * работают как раньше. Меняется только транспорт:
 * - prod: сообщение в service worker (токен остаётся в воркере);
 * - dev: прямой вызов реализации (npm run dev без расширения).
 */

function handleInvalidToken() {
  notify({
    title: LOCALES.DEFAULT_ERROR,
    type: "error",
    message: INVALID_TOKEN,
  });

  router.push({ name: RouteNames.Login });
}

async function send<R>(message: WorkerMessage): Promise<R> {
  return chrome.runtime.sendMessage(message);
}

async function request<T>(
  method: YtRequestMethod,
  params?: Record<string, unknown>,
): Promise<Either<KyError, T>> {
  let result: SerializedEither<T>;

  if (import.meta.env.DEV) {
    const { callYtApi } = await import("@/background/youtrack-client");
    result = (await callYtApi(method, params)) as SerializedEither<T>;
  } else {
    result = await send<SerializedEither<T>>({
      kind: "yt-api",
      method,
      params,
    });
  }

  if (!result.ok && result.invalidToken) {
    handleInvalidToken();
  }

  return deserializeEither(result);
}

export default class YTService {
  static getUserInfo() {
    return request<YTMe>("getUserInfo");
  }

  static getProjects() {
    return request<YTProject[]>("getProjects");
  }

  static getProjectsWorkTypes(projectId: string) {
    return request<{ workItemTypes: YTWorkItemType[] }>(
      "getProjectsWorkTypes",
      { projectId },
    );
  }

  static getTasks(query: string) {
    return request<YTRegularTask[]>("getTasks", { query });
  }

  static getIssueById(issueId: string) {
    return request<YTRegularTask>("getIssueById", { issueId });
  }

  static getTimeTracking(issueId: string, from: number, to: number) {
    return request<YTTimeTracking>("getTimeTracking", { issueId, from, to });
  }

  static addWorkItem(
    issueId: string,
    minutes: number,
    date: number,
    typeId: string,
    comment?: string,
  ) {
    return request<YTWorkItem>("addWorkItem", {
      issueId,
      minutes,
      date,
      typeId,
      comment,
    });
  }

  static deleteWorkItem(issueId: string, workItemId: string) {
    return request<null>("deleteWorkItem", { issueId, workItemId });
  }

  static async saveCredentials(token: string, url: string): Promise<void> {
    if (import.meta.env.DEV) {
      const { saveCredentials } = await import("@/background/auth");
      return saveCredentials(token, url);
    }

    await send({ kind: "save-credentials", token, url });
  }

  static async deleteToken(): Promise<void> {
    if (import.meta.env.DEV) {
      const { deleteToken } = await import("@/background/auth");
      return deleteToken();
    }

    await send({ kind: "delete-token" });
  }
}
