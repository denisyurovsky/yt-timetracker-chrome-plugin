export interface YTMe {
  id: string;
  $type: string;
}

export interface YTProject {
  shortName: string;
  name: string;
  id: string;
  $type: string;
}

export interface YTWorkItemType {
  name: string;
  id: string;
  $type: string;
}

export interface YTRegularTask {
  id: string;
  idReadable: string;
  summary: string;
  $type: string;
}

export interface YTWorkItemRef {
  id: string;
  name: string;
}

export interface YTWorkItem {
  id: string;
  duration: { minutes: number };
  date: number;
  type: YTWorkItemRef | null;
  author?: { id: string };
  text?: string | null;
  /** Задача списания — приходит только из глобального /api/workItems. */
  issue?: { id: string; idReadable: string; summary: string };
  $type?: string;
}

export interface YTTimeTracking {
  workItems: YTWorkItem[];
}

export interface YTSettings {
  /** ID проекта по умолчанию (sync). */
  projectId: string;
  /** ID типа работы по умолчанию (sync). */
  workTypeId: string;
  /** Шаг списания в минутах (sync). */
  step: number;
  /** Постоянные задачи (sync). */
  regularTasks: YTRegularTask[];
  /** Задачи на день (local). */
  dailyTasks: YTRegularTask[];
}
