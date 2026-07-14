import { createApp } from "vue";
import { createPinia } from "pinia";
import "@/assets/styles/main.scss";
import ElementPlus from "element-plus";
import App from "@/popup/App.vue";
import router from "@/popup/router";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

// Только в браузере на localhost: включаем дев-рамку 600x600 по центру экрана
// (см. src/assets/styles/_dev.scss). В продакшн-сборке ветка удаляется, класс
// не навешивается, поэтому на работу расширения это не влияет.
if (import.meta.env.DEV) {
  document.documentElement.classList.add("dev-preview");
}

const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.mount("#app");
