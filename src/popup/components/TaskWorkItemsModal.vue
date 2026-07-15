<script setup lang="ts">
import YTService from "@/popup/youtrack-service";
import { LOCALES } from "@/popup/locales";
import { formatDate, formatMinutes } from "@/popup/format";
import TaskModalHeader from "@/popup/components/TaskModalHeader.vue";
import type { YTRegularTask, YTWorkItem } from "@/shared/types";
import { Delete } from "@element-plus/icons-vue";
import { notify } from "@/popup/notify";
import { computed, ref } from "vue";

const props = defineProps<{
  task: YTRegularTask | null;
  baseUrl: string;
  userId: string;
}>();

const modelValue = defineModel<boolean>();

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const workItems = ref<YTWorkItem[]>([]);
const isLoading = ref(false);
const deletingId = ref<string | null>(null);

const myTotalMinutes = computed(() =>
  workItems.value.reduce(
    (acc, item) => acc + (item.duration?.minutes ?? 0),
    0,
  ),
);

function notifyError(message: string) {
  notify({ type: "error", title: LOCALES.DEFAULT_ERROR, message });
}

async function onOpen() {
  workItems.value = [];
  if (!props.task) return;

  isLoading.value = true;
  const res = await YTService.getTimeTracking(props.task.id, 0, Date.now());
  isLoading.value = false;

  if (res.isLeft()) {
    notifyError(res.value.message);
    return;
  }

  workItems.value = res.value.workItems
    .filter((item) => item.author?.id === props.userId)
    .sort((a, b) => b.date - a.date);
}

async function remove(item: YTWorkItem) {
  if (!props.task) return;

  deletingId.value = item.id;
  const res = await YTService.deleteWorkItem(props.task.id, item.id);
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
      emit("changed");
    },
  );
}
</script>

<template>
  <el-dialog
    v-model="modelValue"
    fullscreen
    :show-close="false"
    :title="task?.idReadable ?? ''"
    class="worklog-modal"
    @open="onOpen"
  >
    <template #header>
      <TaskModalHeader
        :task="task"
        :total-minutes="myTotalMinutes"
        :base-url="baseUrl"
        @close="modelValue = false"
      />
    </template>

    <div v-loading="isLoading" class="worklog-modal__body">
      <div
        v-for="item in workItems"
        :key="item.id"
        class="worklog-modal__row"
      >
        <div class="worklog-modal__info">
          <span class="worklog-modal__date">{{ formatDate(item.date) }}</span>
          <el-text class="worklog-modal__type" type="info">
            {{ item.type?.name ?? "—" }}
          </el-text>
          <el-text v-if="item.text" class="worklog-modal__comment">
            {{ item.text }}
          </el-text>
        </div>
        <div class="worklog-modal__right">
          <span class="worklog-modal__time">
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

      <el-empty
        v-if="!isLoading && !workItems.length"
        :description="LOCALES.NO_WORKITEMS"
      />
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.worklog-modal {
  &__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 2px;
    overflow-y: auto;

    :deep(.el-empty) {
      margin: auto;
    }
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

  &__date {
    flex-shrink: 0;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--el-border-radius-small);
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
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
    font-size: 13px;
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

<style lang="scss">
// Fullscreen-диалог — flex-колонка, тело со списком скроллится.
.worklog-modal.el-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;
}

.worklog-modal .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: #fafafa;
}
</style>
