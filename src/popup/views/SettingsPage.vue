<script setup lang="ts">
import YTService from "@/popup/youtrack-service";
import { LOCALES } from "@/popup/locales";
import {
  type YTProject,
  type YTRegularTask,
  type YTWorkItemType,
} from "@/shared/types";
import debounce from "lodash/debounce";
import { notify } from "@/popup/notify";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RouteNames } from "@/popup/router";
import {
  loadSettings,
  loadYouTrackUrl,
  saveSettings,
  saveYouTrackUrl,
} from "@/storage/settings";
import { formatDuration, tryParseDuration } from "@/popup/format";
import { YT_INSTANCES } from "@/popup/instances";

const popperOptions = {
  modifiers: [
    {
      name: "flip",
      options: {
        fallbackPlacements: ["bottom-start", "bottom-end"],
      },
    },
  ],
};

const router = useRouter();

const projects = ref<YTProject[]>([]);
const selectedProjectId = ref("");

const workItemTypes = ref<YTWorkItemType[]>([]);
const selectedWorkTypeId = ref("");

const isTasksLoading = ref(false);
const taskSearchResults = ref<YTRegularTask[]>([]);
const regularTasks = ref<YTRegularTask[]>([]);
const selectedRegularIds = ref<string[]>([]);

const isDailyTasksLoading = ref(false);
const dailyTaskSearchResults = ref<YTRegularTask[]>([]);
const dailyTasks = ref<YTRegularTask[]>([]);
const selectedDailyIds = ref<string[]>([]);

// Задача может быть только в одном из списков.
const regularIds = computed(
  () => new Set(regularTasks.value.map((task) => task.id)),
);
const dailyIds = computed(
  () => new Set(dailyTasks.value.map((task) => task.id)),
);

// Опции селекта = выбранные задачи (чтобы их теги не теряли подпись после
// очистки результатов поиска) + результаты поиска, исключая задачи, уже
// добавленные в другой список.
const regularOptions = computed(() => {
  const byId = new Map<string, YTRegularTask>();
  for (const task of regularTasks.value) byId.set(task.id, task);
  for (const task of taskSearchResults.value) {
    if (!byId.has(task.id) && !dailyIds.value.has(task.id)) {
      byId.set(task.id, task);
    }
  }
  return [...byId.values()];
});

const dailyOptions = computed(() => {
  const byId = new Map<string, YTRegularTask>();
  for (const task of dailyTasks.value) byId.set(task.id, task);
  for (const task of dailyTaskSearchResults.value) {
    if (!byId.has(task.id) && !regularIds.value.has(task.id)) {
      byId.set(task.id, task);
    }
  }
  return [...byId.values()];
});

const stepText = ref("");
const ytUrl = ref<string>(YT_INSTANCES[0]);
const isDev = import.meta.env.DEV;

const instanceOptions = computed(() => {
  const urls = new Set<string>(YT_INSTANCES);
  if (ytUrl.value) urls.add(ytUrl.value);
  return [...urls];
});

function notifyError(message: string) {
  notify({ type: "error", title: LOCALES.DEFAULT_ERROR, message });
}

async function fetchProjects(): Promise<YTProject[]> {
  const res = await YTService.getProjects();

  return res.fold(
    (error) => {
      notifyError(error.message);
      projects.value = [];
      return [];
    },
    (data) => {
      projects.value = data;
      return data;
    },
  );
}

async function fetchWorkTypes(projectId: string): Promise<YTWorkItemType[]> {
  if (!projectId) {
    workItemTypes.value = [];
    return [];
  }

  const res = await YTService.getProjectsWorkTypes(projectId);

  return res.fold(
    (error) => {
      notifyError(error.message);
      workItemTypes.value = [];
      return [];
    },
    ({ workItemTypes: items }) => {
      workItemTypes.value = items;
      return items;
    },
  );
}

function onProjectChange(projectId: string) {
  selectedWorkTypeId.value = "";
  fetchWorkTypes(projectId);
}

/**
 * Первая настройка: если проект/тип работы ещё не сохранены —
 * берём первые из ответа API и сразу пишем в storage.
 */
async function applyDefaultProjectAndWorkType(settings: {
  projectId: string;
  workTypeId: string;
  step: number;
  regularTasks: YTRegularTask[];
  dailyTasks: YTRegularTask[];
}): Promise<void> {
  let projectId = settings.projectId;
  let workTypeId = settings.workTypeId;
  let changed = false;

  const firstProject = projects.value[0];
  if (!projectId && firstProject) {
    projectId = firstProject.id;
    changed = true;
  }

  selectedProjectId.value = projectId;

  if (projectId) {
    const types = await fetchWorkTypes(projectId);
    const firstType = types[0];
    if (!workTypeId && firstType) {
      workTypeId = firstType.id;
      changed = true;
    }
  }

  selectedWorkTypeId.value = workTypeId;

  if (!changed) return;

  await saveSettings({
    ...settings,
    projectId,
    workTypeId,
  });
}

const TASKS_TOP = 20;

async function loadTasks(
  query: string,
  target: "regular" | "daily",
): Promise<void> {
  const loading = target === "regular" ? isTasksLoading : isDailyTasksLoading;
  const results =
    target === "regular" ? taskSearchResults : dailyTaskSearchResults;

  loading.value = true;
  const res = await YTService.getTasks(query, TASKS_TOP);
  loading.value = false;

  res.fold(
    (error) => notifyError(error.message),
    (data) => (results.value = data),
  );
}

const searchTasks = debounce(async (query: string) => {
  const trimmed = query.trim();
  if (trimmed.length > 0 && trimmed.length < 2) return;
  await loadTasks(trimmed, "regular");
}, 500);

const searchDailyTasks = debounce(async (query: string) => {
  const trimmed = query.trim();
  if (trimmed.length > 0 && trimmed.length < 2) return;
  await loadTasks(trimmed, "daily");
}, 500);

function onRegularVisibleChange(open: boolean) {
  if (open) void loadTasks("", "regular");
}

function onDailyVisibleChange(open: boolean) {
  if (open) void loadTasks("", "daily");
}

function onRegularChange(ids: string[]) {
  regularTasks.value = ids
    .map((id) => regularOptions.value.find((task) => task.id === id))
    .filter((task): task is YTRegularTask => Boolean(task));
}

function onDailyChange(ids: string[]) {
  dailyTasks.value = ids
    .map((id) => dailyOptions.value.find((task) => task.id === id))
    .filter((task): task is YTRegularTask => Boolean(task));
}

async function save() {
  const parsedStep = tryParseDuration(stepText.value);
  if (!parsedStep.ok || parsedStep.minutes < 1) {
    return notifyError(LOCALES.INVALID_DURATION);
  }

  try {
    await saveYouTrackUrl(ytUrl.value);
    await saveSettings({
      projectId: selectedProjectId.value,
      workTypeId: selectedWorkTypeId.value,
      step: parsedStep.minutes,
      regularTasks: regularTasks.value,
      dailyTasks: dailyTasks.value,
    });
  } catch (error) {
    return notifyError(
      error instanceof Error ? error.message : LOCALES.DEFAULT_ERROR,
    );
  }

  notify({
    type: "success",
    title: LOCALES.SETTINGS_SAVED,
    message: "",
  });

  router.push({ name: RouteNames.TrackTasks });
}

async function deleteToken() {
  try {
    await ElMessageBox.confirm(LOCALES.DELETE_TOKEN_CONFIRM, LOCALES.DELETE_TOKEN, {
      confirmButtonText: LOCALES.CONFIRM_YES,
      cancelButtonText: LOCALES.CONFIRM_NO,
      type: "warning",
    });
  } catch {
    // Отмена подтверждения — ничего не делаем.
    return;
  }

  await YTService.deleteToken();

  notify({
    type: "success",
    title: LOCALES.TOKEN_DELETED,
    message: "",
  });

  router.push({ name: RouteNames.Login });
}

onMounted(async () => {
  const [settings, url] = await Promise.all([
    loadSettings(),
    loadYouTrackUrl(),
    fetchProjects(),
  ]);

  stepText.value = formatDuration(settings.step);
  regularTasks.value = settings.regularTasks;
  selectedRegularIds.value = settings.regularTasks.map((task) => task.id);
  dailyTasks.value = settings.dailyTasks;
  selectedDailyIds.value = settings.dailyTasks.map((task) => task.id);
  ytUrl.value = url || YT_INSTANCES[0];

  await applyDefaultProjectAndWorkType(settings);
});
</script>

<template>
  <div class="settings-page">
    <div class="settings-page__settings">
      <el-text tag="div">{{ LOCALES.YT_URL }}</el-text>
      <el-select
        v-model="ytUrl"
        class="my-m"
        :disabled="isDev"
        :title="LOCALES.SELECT_YT_URL"
        :popper-options
      >
        <el-option
          v-for="instance in instanceOptions"
          :key="instance"
          :label="instance"
          :value="instance"
        />
      </el-select>

      <el-text tag="div">{{ LOCALES.PROJECT }}</el-text>
      <el-select
        v-model="selectedProjectId"
        class="my-m"
        filterable
        :title="LOCALES.SELECT_PROJECT"
        :popper-options
        @change="onProjectChange"
      >
        <el-option
          v-for="item in projects"
          :key="item.id"
          :label="item.name || item.shortName"
          :value="item.id"
        />
      </el-select>

      <el-text tag="div">{{ LOCALES.WORK_TYPE }}</el-text>
      <el-select
        v-model="selectedWorkTypeId"
        class="my-m"
        :disabled="!selectedProjectId"
        :title="LOCALES.SELECT_WORK_TYPE"
        :popper-options
      >
        <el-option
          v-for="item in workItemTypes"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
      </el-select>

      <el-text tag="div">{{ LOCALES.REGULAR_TASKS }}</el-text>
      <el-select
        v-model="selectedRegularIds"
        multiple
        filterable
        remote
        :remote-method="searchTasks"
        :loading="isTasksLoading"
        :placeholder="LOCALES.TASK_SEARCH_PLACEHOLDER"
        :title="LOCALES.SELECT_REGULAR_TASKS"
        class="my-m"
        :popper-options
        @visible-change="onRegularVisibleChange"
        @change="onRegularChange"
      >
        <el-option
          v-for="task in regularOptions"
          :key="task.id"
          :label="`${task.idReadable}: ${task.summary}`"
          :value="task.id"
        />
      </el-select>

      <el-text tag="div">{{ LOCALES.DAILY_TASKS }}</el-text>
      <el-select
        v-model="selectedDailyIds"
        multiple
        filterable
        remote
        :remote-method="searchDailyTasks"
        :loading="isDailyTasksLoading"
        :placeholder="LOCALES.TASK_SEARCH_PLACEHOLDER"
        :title="LOCALES.SELECT_DAILY_TASKS"
        class="my-m"
        :popper-options
        @visible-change="onDailyVisibleChange"
        @change="onDailyChange"
      >
        <el-option
          v-for="task in dailyOptions"
          :key="task.id"
          :label="`${task.idReadable}: ${task.summary}`"
          :value="task.id"
        />
      </el-select>
    </div>

    <div class="settings-page__footer">
      <div class="settings-page__step">
        <el-text>{{ LOCALES.STEP }}</el-text>
        <div>
          <el-input
            v-model="stepText"
            :placeholder="LOCALES.DURATION_PLACEHOLDER"
            :title="LOCALES.ENTER_STEP"
            style="width: 110px"
          />
        </div>
      </div>
      <div class="settings-page__actions">
        <el-button
          type="danger"
          plain
          :title="LOCALES.DELETE_TOKEN"
          @click="deleteToken"
        >
          {{ LOCALES.DELETE_TOKEN }}
        </el-button>
        <el-button type="primary" :title="LOCALES.SAVE" @click="save">
          {{ LOCALES.SAVE }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-top: 6px;

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 8px;
  }
  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>
