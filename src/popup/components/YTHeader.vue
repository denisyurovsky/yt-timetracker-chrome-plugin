<script setup lang="ts">
import YTLogo from "@/popup/components/YTLogo.vue";
import { RouteNames } from "@/popup/router";
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <header class="app-header">
    <router-link
      v-if="route.name !== RouteNames.Login"
      :to="{
        name: RouteNames.Settings,
      }"
    >
      <el-icon color="white">
        <Setting />
      </el-icon>
    </router-link>
    <div class="app-header__main">
      <YTLogo class="app-header__logo" />
      <el-text class="app-header__text"> YouTrack Time Tracker </el-text>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  padding: 6px;
  background-color: #5720c9;
  border-radius: 4px 4px 0 0;
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: space-between;

  &__main {
    display: flex;
    gap: 4px;
    flex: 1;
    justify-content: center;
  }

  &__logo {
    width: 20px;
    height: 20px;
  }

  &__text {
    color: white;
  }
}
</style>
