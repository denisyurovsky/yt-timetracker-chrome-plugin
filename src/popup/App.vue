<script setup lang="ts">
import YTHeader from "@/popup/components/YTHeader.vue";
import { onMounted, ref } from "vue";
import YTService from "@/popup/youtrack-service";
import router, { RouteNames } from "@/popup/router";

const isInit = ref(false);

onMounted(async () => {
  isInit.value = true;

  // Без валидного токена/URL уводим на логин (любая неудача getUserInfo:
  // 401, протухший токен, отсутствие URL/сети).
  const me = await YTService.getUserInfo();
  if (me.isLeft()) {
    router.push({ name: RouteNames.Login });
  }
});
</script>

<template>
  <div class="app-container">
    <YTHeader />
    <router-view v-slot="{ Component }">
      <Transition v-if="isInit" name="fade" mode="out-in">
        <component :is="Component" class="layout" />
      </Transition>
    </router-view>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.layout {
  flex: 1;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
