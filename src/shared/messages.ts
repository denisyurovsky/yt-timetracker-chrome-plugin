/**
 * Контракт обмена сообщениями между popup (UI) и service worker.
 * Токен живёт и используется только в воркере, поэтому popup общается с ним
 * исключительно через эти сообщения.
 */

/** Маркер невалидного токена — общий для воркера (генерирует) и popup (реагирует). */
export const INVALID_TOKEN = "Невалидный токен";

export type YtRequestMethod =
  | "getUserInfo"
  | "getProjects"
  | "getProjectsWorkTypes"
  | "getTasks"
  | "getIssueById"
  | "getTimeTracking"
  | "getAllWorkItems"
  | "addWorkItem"
  | "deleteWorkItem";

export interface GetProjectsWorkTypesParams {
  projectId: string;
}

export interface GetTasksParams {
  query: string;
}

export interface GetIssueByIdParams {
  issueId: string;
}

export interface GetTimeTrackingParams {
  issueId: string;
  from: number;
  to: number;
}

export interface GetAllWorkItemsParams {
  /** Автор списаний: id/login/ringId или "me" для текущего пользователя. */
  author?: string;
  /** Максимальное число возвращаемых записей ($top). */
  top?: number;
}

export interface AddWorkItemParams {
  issueId: string;
  minutes: number;
  date: number;
  typeId: string;
  comment?: string;
}

export interface DeleteWorkItemParams {
  issueId: string;
  workItemId: string;
}

export interface YtApiMessage {
  kind: "yt-api";
  method: YtRequestMethod;
  params?: Record<string, unknown>;
}

export interface SaveCredentialsMessage {
  kind: "save-credentials";
  token: string;
  url: string;
}

export interface DeleteTokenMessage {
  kind: "delete-token";
}

export type WorkerMessage =
  | YtApiMessage
  | SaveCredentialsMessage
  | DeleteTokenMessage;
