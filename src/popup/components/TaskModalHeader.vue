<script setup lang="ts">
import { formatMinutes } from "@/popup/format";
import type { YTRegularTask } from "@/shared/types";
import { Close } from "@element-plus/icons-vue";
import { computed } from "vue";

const props = defineProps<{
  task: YTRegularTask | null;
  /** Всё затреканное время по задаче, в минутах. */
  totalMinutes: number;
  /** Базовый URL YouTrack для ссылки на задачу. */
  baseUrl: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const issueUrl = computed(() => {
  if (!props.baseUrl || !props.task) return "#";
  const root = props.baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${root}/issue/${props.task.idReadable}`;
});
</script>

<template>
  <div class="task-modal-header">
    <span class="task-modal-header__total">
      {{ formatMinutes(totalMinutes) }}
    </span>

    <div v-if="task" class="task-modal-header__task">
      <el-link
        class="task-modal-header__id"
        underline="never"
        :href="issueUrl"
        target="_blank"
        rel="noopener"
      >
        {{ task.idReadable }}
      </el-link>
      <el-text class="task-modal-header__summary" :title="task.summary">
        {{ task.summary }}
      </el-text>
    </div>

    <button
      class="task-modal-header__close"
      type="button"
      aria-label="Закрыть"
      @click="emit('close')"
    >
      <el-icon><Close /></el-icon>
    </button>
  </div>
</template>

<style scoped lang="scss">
.task-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  color: #fff;
  font-size: 15px;

  &__total {
    white-space: nowrap;
    font-weight: 600;
    // Время — слева, всё остальное прижато вправо.
    margin-right: auto;
  }

  &__task {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    min-width: 0;
  }

  &__id {
    --el-link-text-color: #fff;
    --el-link-hover-text-color: #fff;
    font-weight: 500;
  }

  &__summary {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.85);
  }

  &__close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 0;
    border: none;
    background: none;
    color: #fff;
    cursor: pointer;

    .el-icon {
      font-size: 24px;
    }
  }
}
</style>
