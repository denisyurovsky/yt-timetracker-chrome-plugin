<script setup lang="ts">
import YTService from "@/popup/youtrack-service";
import { LOCALES } from "@/popup/locales";
import type { YTWorkItem } from "@/shared/types";
import { formatDate, formatMinutes } from "@/popup/format";
import { loadYouTrackUrl } from "@/storage/settings";
import { Delete } from "@element-plus/icons-vue";
import { notify } from "@/popup/notify";
import { computed, onMounted, ref } from "vue";

const workItems = ref<YTWorkItem[]>([]);
const isLoading = ref(false);
const deletingId = ref<string | null>(null);
const baseUrl = ref("");

const groups = computed(() => {
  const byDate = new Map<string, YTWorkItem[]>();
  for (const item of workItems.value) {
    const key = formatDate(item.date);
    const bucket = byDate.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      byDate.set(key, [item]);
    }
  }
  return [...byDate.entries()].map(([date, items]) => ({ date, items }));
});

function notifyError(message: string) {
  notify({ type: "error", title: LOCALES.DEFAULT_ERROR, message });
}

function issueUrl(idReadable: string): string {
  if (!baseUrl.value) return "#";
  // baseUrl может оканчиваться на /api (REST-база) — для веб-ссылки это лишнее.
  const root = baseUrl.value.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${root}/issue/${idReadable}`;
}

async function remove(item: YTWorkItem) {
  if (!item.issue) return;

  deletingId.value = item.id;
  const res = await YTService.deleteWorkItem(item.issue.id, item.id);
  deletingId.value = null;

  res.fold(
    (error) => notifyError(error.message),
    () => {
      workItems.value = workItems.value.filter((w) => w.id !== item.id);
      notify({
        type: "success",
        title: LOCALES.WORKITEM_DELETED,
        message: "",
      });
    },
  );
}

onMounted(async () => {
  baseUrl.value = await loadYouTrackUrl();

  isLoading.value = true;
  // История — только последние два дня (сегодня + вчера).
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).getTime();
  const res = await YTService.getAllWorkItems("me", 200, start);
  isLoading.value = false;

  if (res.isLeft()) {
    notifyError(res.value.message);
    return;
  }

  workItems.value = res.value.sort((a, b) => b.date - a.date);
});
</script>

<template>
  <div v-loading="isLoading" class="history-page">
    <div v-for="group in groups" :key="group.date" class="history-page__group">
      <div class="history-page__date">{{ group.date }}</div>
      <div
        v-for="item in group.items"
        :key="item.id"
        class="history-page__row"
      >
        <div class="history-page__info">
          <el-link
            class="history-page__id"
            type="primary"
            underline="never"
            :href="issueUrl(item.issue?.idReadable ?? '')"
            :title="LOCALES.OPEN_TASK_IN_YT"
            target="_blank"
            rel="noopener"
          >
            {{ item.issue?.idReadable }}
          </el-link>
          <el-text
            class="history-page__summary"
            type="info"
            :title="item.issue?.summary"
          >
            {{ item.issue?.summary }}
          </el-text>
          <el-text v-if="item.type" class="history-page__type" size="small">
            {{ item.type.name }}
          </el-text>
          <el-text v-if="item.text" class="history-page__comment" size="small">
            {{ item.text }}
          </el-text>
        </div>
        <div class="history-page__right">
          <span class="history-page__time">
            {{ formatMinutes(item.duration?.minutes ?? 0) }}
          </span>
          <el-button
            link
            type="danger"
            :loading="deletingId === item.id"
            :title="LOCALES.DELETE_WORKITEM"
            @click="remove(item)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <el-empty
      v-if="!isLoading && !workItems.length"
      :description="LOCALES.NO_HISTORY"
    />
  </div>
</template>

<style scoped lang="scss">
.history-page {
  height: 100%;
  overflow-y: auto;
  padding: 4px 2px 12px;

  :deep(.el-empty) {
    margin-top: 20%;
  }

  &__group + &__group {
    margin-top: 16px;
  }

  &__date {
    position: sticky;
    top: 0;
    z-index: 1;
    margin-bottom: 8px;
    padding: 4px 2px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--el-text-color-secondary);
    // Совпадает с фоном приложения, чтобы карточки уходили под заголовок при скролле.
    background-color: #fafafa;
  }

  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background-color: #fff;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    & + & {
      margin-top: 8px;
    }

    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 2px 10px rgba(87, 32, 201, 0.1);
    }
  }

  &__info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
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
    max-width: 100%;
    color: var(--el-text-color-regular);
  }

  &__type {
    flex-shrink: 0;
    padding: 1px 10px;
    border-radius: 999px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
  }

  &__comment {
    flex-basis: 100%;
    white-space: normal;
    word-break: break-word;
    color: var(--el-text-color-secondary);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__time {
    white-space: nowrap;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
</style>
