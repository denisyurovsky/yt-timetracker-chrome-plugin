<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { notify } from "@/popup/notify";
import YTService from "@/popup/youtrack-service";
import { useRouter } from "vue-router";
import { RouteNames } from "@/popup/router";
import { LOCALES } from "@/popup/locales";
import { YT_INSTANCES } from "@/popup/instances";

const router = useRouter();

const ytToken = ref("");
const ytUrl = ref<string>(YT_INSTANCES[0]);
const isChecking = ref(false);
const hasFailed = ref(false);

async function verifyToken() {
  if (isChecking.value || isProceedDisabled.value) return;

  isChecking.value = true;

  try {
    // Токен и URL уходят в service worker (в DEV — в localStorage) перед проверкой:
    // getUserInfo читает их из хранилища и ходит в /api/users/me.
    await YTService.saveCredentials(ytToken.value, ytUrl.value);

    const res = await YTService.getUserInfo({ silentInvalidToken: true });

    if (res.isLeft()) {
      hasFailed.value = true;
      return notify({
        title: LOCALES.DEFAULT_ERROR,
        type: "error",
        message: res.value.message,
      });
    }

    hasFailed.value = false;
    router.push({ name: RouteNames.Settings });
  } finally {
    isChecking.value = false;
  }
}

const isProceedDisabled = computed(
  () => !ytToken.value.length || !ytUrl.value.length || isChecking.value,
);

const buttonLabel = computed(() =>
  hasFailed.value ? LOCALES.RETRY_TOKEN_CHECK : LOCALES.VERIFY_TOKEN,
);

watch([ytToken, ytUrl], () => {
  hasFailed.value = false;
});
</script>

<template>
  <div class="login-page">
    <div class="login-page__inputs">
      <el-select
        class="my-m"
        placeholder="URL YouTrack"
        v-model="ytUrl"
        :disabled="isChecking"
        :title="LOCALES.SELECT_YT_URL"
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
        :disabled="isChecking"
        :title="LOCALES.ENTER_TOKEN"
        @keydown.enter="verifyToken"
      />
      <el-text size="small">
        {{ LOCALES.HOW_TO_RETRIEVE_TOKEN }}
      </el-text>
    </div>
    <el-button
      class="login-page__proceed"
      type="primary"
      :disabled="isProceedDisabled"
      :loading="isChecking"
      :title="buttonLabel"
      @click="verifyToken"
    >
      {{ buttonLabel }}
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
