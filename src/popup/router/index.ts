import LoginPage from "@/popup/views/LoginPage.vue";
import SettingsPage from "@/popup/views/SettingsPage.vue";
import TrackTasksPage from "@/popup/views/TrackTasksPage.vue";
import HistoryPage from "@/popup/views/HistoryPage.vue";
import { createRouter, createWebHashHistory } from "vue-router";

export enum RouteNames {
  Login = "login",
  Settings = "settings",
  TrackTasks = "track-tasks",
  History = "history",
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
    {
      name: RouteNames.History,
      path: "/history",
      component: HistoryPage,
    },
  ],
});

export default router;
