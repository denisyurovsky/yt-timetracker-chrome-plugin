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
import { DEFAULT_STEP, loadSettings, saveSettings } from "@/storage/settings";
import { formatDuration, parseDuration } from "@/popup/format";

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

function notifyError(message: string) {
  notify({ type: "error", title: LOCALES.DEFAULT_ERROR, message });
}

async function fetchProjects() {
  const res = await YTService.getProjects();

  res.fold(
    (error) => notifyError(error.message),
    (data) => (projects.value = data),
  );
}

async function fetchWorkTypes(projectId: string) {
  if (!projectId) {
    workItemTypes.value = [];
    return;
  }

  const res = await YTService.getProjectsWorkTypes(projectId);

  res.fold(
    (error) => notifyError(error.message),
    ({ workItemTypes: items }) => (workItemTypes.value = items),
  );
}

function onProjectChange(projectId: string) {
  selectedWorkTypeId.value = "";
  fetchWorkTypes(projectId);
}

const searchTasks = debounce(async (query: string) => {
  if (query.length < 2) return;

  isTasksLoading.value = true;
  const res = await YTService.getTasks(query);
  isTasksLoading.value = false;

  res.fold(
    (error) => notifyError(error.message),
    (data) => (taskSearchResults.value = data),
  );
}, 500);

function onRegularChange(ids: string[]) {
  regularTasks.value = ids
    .map((id) => regularOptions.value.find((task) => task.id === id))
    .filter((task): task is YTRegularTask => Boolean(task));
}

const searchDailyTasks = debounce(async (query: string) => {
  if (query.length < 2) return;

  isDailyTasksLoading.value = true;
  const res = await YTService.getTasks(query);
  isDailyTasksLoading.value = false;

  res.fold(
    (error) => notifyError(error.message),
    (data) => (dailyTaskSearchResults.value = data),
  );
}, 500);

function onDailyChange(ids: string[]) {
  dailyTasks.value = ids
    .map((id) => dailyOptions.value.find((task) => task.id === id))
    .filter((task): task is YTRegularTask => Boolean(task));
}

async function save() {
  try {
    await saveSettings({
      projectId: selectedProjectId.value,
      workTypeId: selectedWorkTypeId.value,
      step: Math.max(1, parseDuration(stepText.value) || DEFAULT_STEP),
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
  await fetchProjects();

  const settings = await loadSettings();
  selectedProjectId.value = settings.projectId;
  selectedWorkTypeId.value = settings.workTypeId;
  stepText.value = formatDuration(settings.step);
  regularTasks.value = settings.regularTasks;
  selectedRegularIds.value = settings.regularTasks.map((task) => task.id);
  dailyTasks.value = settings.dailyTasks;
  selectedDailyIds.value = settings.dailyTasks.map((task) => task.id);

  if (settings.projectId) {
    await fetchWorkTypes(settings.projectId);
  }
});
</script>

<template>
  <div class="settings-page">
    <div class="settings-page__settings">
      <el-text tag="div">{{ LOCALES.PROJECT }}</el-text>
      <el-select
        v-model="selectedProjectId"
        class="my-m"
        filterable
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
        class="my-m"
        :popper-options
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
        class="my-m"
        :popper-options
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
            style="width: 110px"
          />
        </div>
      </div>
      <div class="settings-page__actions">
        <el-button @click="deleteToken" type="danger" plain>
          {{ LOCALES.DELETE_TOKEN }}
        </el-button>
        <el-button @click="save" type="primary">{{ LOCALES.SAVE }}</el-button>
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
