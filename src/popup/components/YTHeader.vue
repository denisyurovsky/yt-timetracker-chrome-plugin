<script setup lang="ts">
import YTLogo from "@/popup/components/YTLogo.vue";
import { LOCALES } from "@/popup/locales";
import { RouteNames } from "@/popup/router";
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();

// На вложенных экранах (настройки, история) показываем стрелку «назад» на
// главный экран вместо шестерёнки, которая на самих настройках вела бы на себя.
const showBack = computed(
  () =>
    route.name === RouteNames.Settings || route.name === RouteNames.History,
);

const showMainNav = computed(() => route.name === RouteNames.TrackTasks);
</script>

<template>
  <header class="app-header">
    <div class="app-header__nav">
      <router-link
        v-if="showBack"
        class="app-header__link"
        :to="{ name: RouteNames.TrackTasks }"
        :title="LOCALES.BACK"
        :aria-label="LOCALES.BACK"
      >
        <el-icon color="white">
          <ArrowLeft />
        </el-icon>
      </router-link>
      <template v-else-if="showMainNav">
        <router-link
          class="app-header__link"
          :to="{ name: RouteNames.Settings }"
          :title="LOCALES.SETTINGS"
          :aria-label="LOCALES.SETTINGS"
        >
          <el-icon color="white">
            <Setting />
          </el-icon>
        </router-link>
        <router-link
          class="app-header__link"
          :to="{ name: RouteNames.History }"
          :title="LOCALES.HISTORY"
          :aria-label="LOCALES.HISTORY"
        >
          <el-icon color="white">
            <Clock />
          </el-icon>
        </router-link>
      </template>
    </div>
    <div class="app-header__brand" aria-hidden="true">
      <YTLogo class="app-header__logo" />
      <el-text class="app-header__text">YouTrack Time Tracker</el-text>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  position: relative;
  padding: 8px 12px;
  background-color: #5720c9;
  border-radius: 12px 12px 0 0;
  display: flex;
  height: 46px;
  align-items: center;

  :deep(.el-icon) {
    font-size: 22px;
  }

  &__nav {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__link {
    display: flex;
    align-items: center;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.7;
    }
  }

  &__brand {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    user-select: none;
  }

  &__logo {
    width: 28px;
    height: 28px;
  }

  &__text {
    color: white;
    font-size: 16px;
    font-weight: 500;
  }
}
</style>
