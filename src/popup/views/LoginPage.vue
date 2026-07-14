<script setup lang="ts">
import { computed, ref } from "vue";
import { notify } from "@/popup/notify";
import YTService from "@/popup/youtrack-service";
import { useRouter } from "vue-router";
import { RouteNames } from "@/popup/router";
import { LOCALES } from "@/popup/locales";
import { YT_INSTANCES } from "@/popup/instances";

const router = useRouter();

const ytToken = ref("");
const ytUrl = ref<string>(YT_INSTANCES[0]);

async function proceed() {
  if (!import.meta.env.DEV) {
    // Токен и URL уходят в service worker — он их сохраняет и использует.
    // Сам токен в popup не хранится.
    await YTService.saveCredentials(ytToken.value, ytUrl.value);

    const res = await YTService.getUserInfo();

    if (res.isLeft()) {
      return notify({
        title: LOCALES.DEFAULT_ERROR,
        type: "error",
        message: res.value.message,
      });
    }
  }

  router.push({ name: RouteNames.Settings });
}

const isProceedDisabled = computed(
  () => !ytToken.value.length || !ytUrl.value.length,
);
</script>

<template>
  <div class="login-page">
    <div class="login-page__inputs">
      <el-select
        class="my-m"
        placeholder="URL YouTrack"
        v-model="ytUrl"
      >
        <el-option
          v-for="instance in YT_INSTANCES"
          :key="instance"
          :label="instance"
          :value="instance"
        />
      </el-select>
      <el-input
        type="password"
        class="my-s"
        v-model="ytToken"
        clearable
        size="large"
        autofocus
        placeholder="Ввести токен YouTrack"
        @keydown.enter="proceed"
      />
      <el-text size="small">
        {{ LOCALES.HOW_TO_RETRIEVE_TOKEN }}
      </el-text>
    </div>
    <el-button
      class="login-page__proceed"
      type="primary"
      :disabled="isProceedDisabled"
      @click="proceed"
    >
      {{ LOCALES.CONNECT }}
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &__inputs,
  &__proceed {
    margin-top: auto;
  }
}
</style>
