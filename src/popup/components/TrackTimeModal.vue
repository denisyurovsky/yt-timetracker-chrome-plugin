<script setup lang="ts">
import YTService from "@/popup/youtrack-service";
import { LOCALES } from "@/popup/locales";
import { formatDuration, parseDuration } from "@/popup/format";
import TaskModalHeader from "@/popup/components/TaskModalHeader.vue";
import type { YTRegularTask, YTWorkItemType } from "@/shared/types";
import { notify } from "@/popup/notify";
import { computed, ref } from "vue";

const props = defineProps<{
  task: YTRegularTask | null;
  totalMinutes: number;
  baseUrl: string;
  projectId: string;
  defaultTypeId: string;
  step: number;
}>();

const modelValue = defineModel<boolean>();

const emit = defineEmits<{
  (e: "saved"): void;
}>();

const workTypes = ref<YTWorkItemType[]>([]);
const selectedTypeId = ref("");
const durationText = ref("");
const comment = ref("");
const isTypesLoading = ref(false);
const isSaving = ref(false);

const presets = computed(() => {
  const values = new Set<number>([props.step, 15, 30, 45, 60, 120, 180, 240, 360, 480]);
  return [...values].sort((a, b) => a - b);
});

function setDuration(value: number) {
  durationText.value = formatDuration(value);
}

function close() {
  modelValue.value = false;
}

async function onOpen() {
  comment.value = "";
  durationText.value = formatDuration(props.step);
  selectedTypeId.value = props.defaultTypeId;
  workTypes.value = [];

  if (!props.projectId) return;

  isTypesLoading.value = true;
  const res = await YTService.getProjectsWorkTypes(props.projectId);
  isTypesLoading.value = false;

  res.fold(
    (error) => {
      notify({
        type: "error",
        title: LOCALES.DEFAULT_ERROR,
        message: error.message,
      });
    },
    ({ workItemTypes }) => {
      workTypes.value = workItemTypes;
    },
  );
}

async function save() {
  if (!props.task) return;

  if (!selectedTypeId.value) {
    return notify({
      type: "error",
      title: LOCALES.DEFAULT_ERROR,
      message: LOCALES.NO_WORKTYPE,
    });
  }

  const now = new Date();
  // Полдень локального дня: при конвертации в UTC дата не «съедет» на день назад.
  const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
  ).getTime();

  isSaving.value = true;
  const res = await YTService.addWorkItem(
    props.task.id,
    Math.max(1, parseDuration(durationText.value) || props.step),
    date,
    selectedTypeId.value,
    comment.value.trim() || undefined,
  );
  isSaving.value = false;

  res.fold(
    (error) => {
      notify({
        type: "error",
        title: LOCALES.DEFAULT_ERROR,
        message: error.message,
      });
    },
    () => {
      notify({
        type: "success",
        title: LOCALES.WORKITEM_SAVED,
        message: "",
      });
      emit("saved");
      close();
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
    class="track-modal"
    @open="onOpen"
  >
    <template #header>
      <TaskModalHeader
        :task="task"
        :total-minutes="totalMinutes"
        :base-url="baseUrl"
        @close="close"
      />
    </template>

    <div class="track-modal__body">
      <div class="track-modal__presets">
        <el-button
          v-for="preset in presets"
          :key="preset"
          size="small"
          :type="parseDuration(durationText) === preset ? 'primary' : ''"
          @click="setDuration(preset)"
        >
          {{ formatDuration(preset) }}
        </el-button>
      </div>

      <el-input
        v-model="durationText"
        class="track-modal__minutes"
        :placeholder="LOCALES.DURATION_PLACEHOLDER"
      />

      <el-select
        v-model="selectedTypeId"
        class="track-modal__type"
        :loading="isTypesLoading"
      >
        <el-option
          v-for="type in workTypes"
          :key="type.id"
          :label="type.name"
          :value="type.id"
        />
      </el-select>

      <el-input
        v-model="comment"
        class="track-modal__comment"
        type="textarea"
        resize="none"
        :placeholder="LOCALES.COMMENT_PLACEHOLDER"
      />

      <el-button
        class="track-modal__save"
        type="primary"
        :loading="isSaving"
        @click="save"
      >
        {{ LOCALES.SAVE }}
      </el-button>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.track-modal {
  &__presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    :deep(.el-button) {
      --el-button-size: 30px;
    }

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    gap: 8px;
    padding-top: 4px;
  }

  &__comment {
    flex: 1;
    min-height: 0;

    :deep(.el-textarea),
    :deep(.el-textarea__inner) {
      height: 100%;
      resize: none;
    }
  }

  &__save {
    width: 100%;
  }
}
</style>

<style lang="scss">
// Делаем fullscreen-диалог flex-колонкой, чтобы его тело (а с ним textarea)
// тянулось на всю доступную высоту. Класс track-modal уникален — глобально безопасно.
.track-modal.el-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;
}

.track-modal .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
