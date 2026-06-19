import { createApp } from "vue";
import { createPinia } from "pinia";
import "@/assets/styles/main.scss";
import ElementPlus from "element-plus";
import App from "@/popup/App.vue";
import router from "@/popup/router";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.mount("#app");
