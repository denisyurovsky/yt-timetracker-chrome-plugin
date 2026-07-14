<script setup lang="ts">
import YTLogo from "@/popup/components/YTLogo.vue";
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

// Кнопки навигации на главном экране: настройки и история.
const showMainNav = computed(() => route.name === RouteNames.TrackTasks);
</script>

<template>
  <header class="app-header">
    <div class="app-header__nav">
      <router-link
        v-if="showBack"
        class="app-header__link"
        :to="{ name: RouteNames.TrackTasks }"
        aria-label="Назад"
      >
        <el-icon color="white">
          <ArrowLeft />
        </el-icon>
      </router-link>
      <template v-else-if="showMainNav">
        <router-link
          class="app-header__link"
          :to="{ name: RouteNames.Settings }"
          aria-label="Настройки"
        >
          <el-icon color="white">
            <Setting />
          </el-icon>
        </router-link>
        <router-link
          class="app-header__link"
          :to="{ name: RouteNames.History }"
          aria-label="История списаний"
        >
          <el-icon color="white">
            <Clock />
          </el-icon>
        </router-link>
      </template>
    </div>
    <div class="app-header__main">
      <YTLogo class="app-header__logo" />
      <el-text class="app-header__text"> YouTrack Time Tracker </el-text>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  padding: 8px 12px;
  background-color: #5720c9;
  border-radius: 12px 12px 0 0;
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: space-between;

  // Иконки навигации крупнее вместе с шапкой.
  :deep(.el-icon) {
    font-size: 22px;
  }

  &__nav {
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

  &__main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: center;
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
