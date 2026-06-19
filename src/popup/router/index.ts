import LoginPage from "@/popup/views/LoginPage.vue";
import SettingsPage from "@/popup/views/SettingsPage.vue";
import TrackTasksPage from "@/popup/views/TrackTasksPage.vue";
import { createRouter, createWebHashHistory } from "vue-router";

export enum RouteNames {
  Login = "login",
  Settings = "settings",
  TrackTasks = "track-tasks",
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: RouteNames.Settings,
      path: "/settings",
      component: SettingsPage,
    },
    {
      name: RouteNames.Login,
      path: "/login",
      component: LoginPage,
    },
    {
      name: RouteNames.TrackTasks,
      path: "/",
      component: TrackTasksPage,
    },
  ],
});

export default router;
