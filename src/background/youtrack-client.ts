import {
  type YTWorkItemType,
  type YTMe,
  type YTProject,
  type YTRegularTask,
  type YTWorkItem,
  type YTTimeTracking,
} from "@/shared/types";
import { getKyInstance } from "@/background/http";
import { right, left, type Either } from "@sweet-monads/either";
import { mapError } from "@/background/map-error";
import { KyError } from "ky";
import { serializeEither, type SerializedEither } from "@/shared/either";
import type {
  YtRequestMethod,
  GetProjectsWorkTypesParams,
  GetTasksParams,
  GetIssueByIdParams,
  GetTimeTrackingParams,
  AddWorkItemParams,
  DeleteWorkItemParams,
} from "@/shared/messages";

/**
 * Реальные запросы к YouTrack. Исполняются только в доверенном контексте
 * (service worker в проде, страница в DEV). Токен подставляется внутри
 * getKyInstance и наружу из этого модуля не выходит.
 */

async function getUserInfo(): Promise<Either<KyError, YTMe>> {
  try {
    const ky = await getKyInstance();
    const res = await ky.get<YTMe>("/api/users/me").json();
    return right(res);
  } catch (error) {
    return left(mapError(error, "Не удалось получить данные пользователя"));
  }
}

async function getProjects(): Promise<Either<KyError, YTProject[]>> {
  try {
    const ky = await getKyInstance();
    const res = await ky
      .get<YTProject[]>("/api/admin/projects?fields=id,name,shortName")
      .json();

    return right(res);
  } catch (error) {
    return left(mapError(error, "Не удалось получить список проектов"));
  }
}

async function getProjectsWorkTypes(
  projectId: string,
): Promise<Either<KyError, { workItemTypes: YTWorkItemType[] }>> {
  try {
    const ky = await getKyInstance();
    const res = await ky
      .get<{
        workItemTypes: YTWorkItemType[];
      }>(
        `/api/admin/projects/${projectId}/timeTrackingSettings?fields=workItemTypes(id,name)`,
      )
      .json();

    return right(res);
  } catch (error) {
    return left(mapError(error, "Не удалось получить типы работ"));
  }
}

async function getTasks(
  query: string,
): Promise<Either<KyError, YTRegularTask[]>> {
  try {
    const ky = await getKyInstance();
    const res = await ky
      .get<
        YTRegularTask[]
      >(`/api/issues?fields=id,idReadable,summary&query=${encodeURIComponent(query)}`)
      .json();

    return right(res);
  } catch (error) {
    return left(mapError(error, "Не удалось получить список задач"));
  }
}

async function getIssueById(
  issueId: string,
): Promise<Either<KyError, YTRegularTask>> {
  try {
    const ky = await getKyInstance();
    const res = await ky
      .get<YTRegularTask>(
        `/api/issues/${encodeURIComponent(issueId)}?fields=id,idReadable,summary`,
      )
      .json();

    return right(res);
  } catch (error) {
    return left(mapError(error, "Задача не найдена"));
  }
}

async function getTimeTracking(
  issueId: string,
  from: number,
  to: number,
): Promise<Either<KyError, YTTimeTracking>> {
  try {
    const ky = await getKyInstance();
    const res = await ky
      .get<YTTimeTracking>(
        `/api/issues/${encodeURIComponent(issueId)}/timeTracking?fields=workItems(id,duration(minutes),date,type(id,name),author(id),text)&from=${from}&to=${to}`,
      )
      .json();

    return right(res);
  } catch (error) {
    return left(mapError(error, "Не удалось получить списания за день"));
  }
}

async function addWorkItem(
  issueId: string,
  minutes: number,
  date: number,
  typeId: string,
  comment?: string,
): Promise<Either<KyError, YTWorkItem>> {
  try {
    const ky = await getKyInstance();
    const res = await ky
      .post<YTWorkItem>(
        `/api/issues/${encodeURIComponent(issueId)}/timeTracking/workItems?fields=id,duration(minutes),date,type(id,name)`,
        {
          json: {
            duration: { minutes },
            date,
            type: { id: typeId },
            ...(comment ? { text: comment } : {}),
          },
        },
      )
      .json();

    return right(res);
  } catch (error) {
    return left(mapError(error, "Не удалось добавить списание"));
  }
}

async function deleteWorkItem(
  issueId: string,
  workItemId: string,
): Promise<Either<KyError, null>> {
  try {
    const ky = await getKyInstance();
    await ky.delete(
      `/api/issues/${encodeURIComponent(issueId)}/timeTracking/workItems/${encodeURIComponent(workItemId)}`,
    );

    return right(null);
  } catch (error) {
    return left(mapError(error, "Не удалось удалить списание"));
  }
}

/** Единая точка вызова API по имени метода — используется воркером и DEV-фасадом. */
export async function callYtApi(
  method: YtRequestMethod,
  params?: Record<string, unknown>,
): Promise<SerializedEither<unknown>> {
  switch (method) {
    case "getUserInfo":
      return serializeEither(await getUserInfo());
    case "getProjects":
      return serializeEither(await getProjects());
    case "getProjectsWorkTypes": {
      const p = params as unknown as GetProjectsWorkTypesParams;
      return serializeEither(await getProjectsWorkTypes(p.projectId));
    }
    case "getTasks": {
      const p = params as unknown as GetTasksParams;
      return serializeEither(await getTasks(p.query));
    }
    case "getIssueById": {
      const p = params as unknown as GetIssueByIdParams;
      return serializeEither(await getIssueById(p.issueId));
    }
    case "getTimeTracking": {
      const p = params as unknown as GetTimeTrackingParams;
      return serializeEither(await getTimeTracking(p.issueId, p.from, p.to));
    }
    case "addWorkItem": {
      const p = params as unknown as AddWorkItemParams;
      return serializeEither(
        await addWorkItem(p.issueId, p.minutes, p.date, p.typeId, p.comment),
      );
    }
    case "deleteWorkItem": {
      const p = params as unknown as DeleteWorkItemParams;
      return serializeEither(await deleteWorkItem(p.issueId, p.workItemId));
    }
  }
}
