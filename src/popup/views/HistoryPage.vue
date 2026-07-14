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

// Списания сгруппированы по дате (новые сверху), внутри группы — тоже новые сверху.
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
  const res = await YTService.getAllWorkItems();
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
            :title="LOCALES.DELETE"
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
  padding-top: 6px;

  &__date {
    font-weight: 600;
    margin: 8px 0 4px;
  }

  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__info {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  &__id {
    flex-shrink: 0;
    font-weight: 500;
  }

  &__summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  &__comment {
    white-space: normal;
    word-break: break-word;
    flex-basis: 100%;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__time {
    white-space: nowrap;
  }
}
</style>
