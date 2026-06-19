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
  /** Базовый URL YouTrack для ссылки на задачу. */
  baseUrl: string;
  /** ID текущего пользователя — по нему фильтруем списания. */
  userId: string;
}>();

const modelValue = defineModel<boolean>();

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const workItems = ref<YTWorkItem[]>([]);
const isLoading = ref(false);
const deletingId = ref<string | null>(null);

// Только моё суммарное время по задаче (сумма отображаемых списаний).
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

  // Только списания текущего пользователя, новые сверху.
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
    overflow-y: auto;
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
    gap: 6px;
  }

  &__date {
    font-weight: 500;
  }

  &__comment {
    font-size: 12px;
    white-space: normal;
    word-break: break-word;
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
}
</style>
