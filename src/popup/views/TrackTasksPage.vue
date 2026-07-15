<script setup lang="ts">
import YTService from "@/popup/youtrack-service";
import { LOCALES } from "@/popup/locales";
import type { YTRegularTask, YTWorkItem } from "@/shared/types";
import { DEFAULT_STEP, loadSettings, loadYouTrackUrl } from "@/storage/settings";
import { formatMinutes } from "@/popup/format";
import TrackTimeModal from "@/popup/components/TrackTimeModal.vue";
import TaskWorkItemsModal from "@/popup/components/TaskWorkItemsModal.vue";
import { Loading, Plus } from "@element-plus/icons-vue";
import { notify } from "@/popup/notify";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RouteNames } from "@/popup/router";

interface TrackRow {
  task: YTRegularTask;
  /** Всё списанное на задачу время (все люди, все типы), в минутах. */
  minutes: number;
  loading: boolean;
}

const router = useRouter();

const regularRows = ref<TrackRow[]>([]);
const dailyRows = ref<TrackRow[]>([]);
const baseUrl = ref("");

// Настройки, нужные модалке списания.
const projectId = ref("");
const defaultTypeId = ref("");
const step = ref(DEFAULT_STEP);

// Модалка списания.
const isModalOpen = ref(false);
const activeRow = ref<TrackRow | null>(null);

// Модалка со списаниями пользователя по задаче.
const isWorklogOpen = ref(false);
const userId = ref("");

const hasTasks = computed(
  () => regularRows.value.length > 0 || dailyRows.value.length > 0,
);

const sections = computed(() => [
  {  rows: regularRows.value },
  { rows: dailyRows.value },
]);

function notifyError(message: string) {
  notify({ type: "error", title: LOCALES.DEFAULT_ERROR, message });
}

function sumMinutes(workItems: YTWorkItem[]): number {
  return workItems.reduce(
    (acc, item) => acc + (item.duration?.minutes ?? 0),
    0,
  );
}

function issueUrl(idReadable: string): string {
  if (!baseUrl.value) return "#";
  // baseUrl может оканчиваться на /api (REST-база) — для веб-ссылки это лишнее.
  const root = baseUrl.value.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${root}/issue/${idReadable}`;
}

async function loadMinutes(row: TrackRow) {
  row.loading = true;
  // from=0..now — всё время по задаче, без фильтра по дате/автору/типу.
  const res = await YTService.getTimeTracking(row.task.id, 0, Date.now());
  row.loading = false;

  if (res.isLeft()) {
    notifyError(res.value.message);
    return;
  }

  row.minutes = sumMinutes(res.value.workItems);
}

function openTimeModal(row: TrackRow) {
  activeRow.value = row;
  isModalOpen.value = true;
}

// Обновляем суммарное время по задаче после изменения списаний.
function reloadActiveRow() {
  if (activeRow.value) {
    loadMinutes(activeRow.value);
  }
}

function openWorklog(row: TrackRow) {
  activeRow.value = row;
  isWorklogOpen.value = true;
}

function goToSettings() {
  router.push({ name: RouteNames.Settings });
}

onMounted(async () => {
  const [settings, url] = await Promise.all([
    loadSettings(),
    loadYouTrackUrl(),
  ]);

  baseUrl.value = url;
  projectId.value = settings.projectId;
  defaultTypeId.value = settings.workTypeId;
  step.value = settings.step;
  regularRows.value = settings.regularTasks.map((task) => ({
    task,
    minutes: 0,
    loading: false,
  }));
  dailyRows.value = settings.dailyTasks.map((task) => ({
    task,
    minutes: 0,
    loading: false,
  }));

  // Валидация токена/URL при открытии. При невалидном токене фасад сам
  // уводит на экран логина.
  const me = await YTService.getUserInfo();
  if (me.isLeft()) {
    return;
  }
  userId.value = me.value.id;

  await Promise.all(
    [...regularRows.value, ...dailyRows.value].map(loadMinutes),
  );
});
</script>

<template>
  <div class="track-tasks-page">
    <template v-for="(section, index) in sections" :key="index">
      <template v-if="section.rows.length">
        <div
          v-for="row in section.rows"
          :key="row.task.id"
          class="track-tasks-page__row"
        >
          <div class="track-tasks-page__info">
            <el-link
              class="track-tasks-page__id"
              type="primary"
              underline="never"
              :href="issueUrl(row.task.idReadable)"
              target="_blank"
              rel="noopener"
            >
              {{ row.task.idReadable }}
            </el-link>
            <el-text
              class="track-tasks-page__summary"
              type="info"
              :title="row.task.summary"
              @click="openWorklog(row)"
            >
              {{ row.task.summary }}
            </el-text>
          </div>
          <div class="track-tasks-page__right">
            <el-text class="track-tasks-page__time">
              <el-icon v-if="row.loading" class="is-loading">
                <Loading />
              </el-icon>
              <template v-else>
                {{ formatMinutes(row.minutes) }}
              </template>
            </el-text>
            <el-button type="primary" circle :icon="Plus" @click="openTimeModal(row)" />
          </div>
        </div>
      </template>
    </template>

    <el-empty v-if="!hasTasks" :description="LOCALES.NO_TASKS_HINT">
      <el-button type="primary" @click="goToSettings">
        {{ LOCALES.GO_TO_SETTINGS }}
      </el-button>
    </el-empty>

    <TrackTimeModal
      v-model="isModalOpen"
      :task="activeRow?.task ?? null"
      :total-minutes="activeRow?.minutes ?? 0"
      :base-url="baseUrl"
      :project-id="projectId"
      :default-type-id="defaultTypeId"
      :step="step"
      @saved="reloadActiveRow"
    />

    <TaskWorkItemsModal
      v-model="isWorklogOpen"
      :task="activeRow?.task ?? null"
      :base-url="baseUrl"
      :user-id="userId"
      @changed="reloadActiveRow"
    />
  </div>
</template>


<style scoped lang="scss">
.track-tasks-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px 12px;
  overflow-y: auto;

  // Пустое состояние центрируется по вертикали в списке.
  :deep(.el-empty) {
    margin: auto;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background-color: #fff;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 2px 10px rgba(87, 32, 201, 0.1);
    }
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  &__id {
    flex-shrink: 0;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--el-border-radius-small);
    background-color: var(--el-color-primary-light-9);
    transition: background-color 0.15s ease;

    &:hover {
      background-color: var(--el-color-primary-light-8);
    }
  }

  &__summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--el-text-color-regular);
    cursor: pointer;
    transition: color 0.15s ease;

    &:hover {
      color: var(--el-color-primary);
      text-decoration: underline;
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  &__time {
    white-space: nowrap;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
</style>
