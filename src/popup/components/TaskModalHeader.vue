<script setup lang="ts">
import { formatMinutes } from "@/popup/format";
import { LOCALES } from "@/popup/locales";
import type { YTRegularTask } from "@/shared/types";
import { Close } from "@element-plus/icons-vue";
import { computed } from "vue";

const props = defineProps<{
  task: YTRegularTask | null;
  totalMinutes: number;
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
        :title="LOCALES.OPEN_TASK_IN_YT"
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
      :aria-label="LOCALES.CLOSE"
      :title="LOCALES.CLOSE"
      @click="emit('close')"
    >
      <el-icon><Close /></el-icon>
    </button>
  </div>
</template>

<style scoped lang="scss">
.task-modal-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  // Симметричные отступы под кнопку закрытия — центрируемый текст не наезжает на неё.
  padding: 0 30px;
  color: #fff;
  font-size: 15px;

  &__total {
    white-space: nowrap;
    font-weight: 600;
  }

  &__task {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  &__id {
    --el-link-text-color: #fff;
    --el-link-hover-text-color: #fff;
    font-weight: 500;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }

  &__summary {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.85);
  }

  &__close {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 0;
    border: none;
    background: none;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.7;
    }

    .el-icon {
      font-size: 24px;
    }
  }
}
</style>
