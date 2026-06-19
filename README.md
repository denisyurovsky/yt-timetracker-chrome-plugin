## Запуск проекта

1. Скачайте образ с докер хаба командой `docker pull jetbrains/youtrack:2026.1.12024`
2. Настройте порт контейнера (понадобится в дальнейших шагах)
3. Проведите настройку инстанса YouTrack перейдя в браузере в локально развернутый инстанс YouTrack
4. Выпустите токен пользователя в локальном YouTrack
5. Запустите в терминале команду `npm i`
6. Создайте .env файл в корне проекта с двумя переменными
   `VITE_YT_URL` - адрес вашего локально развернутого YouTrack (продовый адрес задается пользователем в интерфейсе приложения)
   `VITE_DEV_YT_TOKEN` - Bearer токен пользователя из вашего локально развернутого YouTrack
7. Запустите в терминале команду `npm run dev`

# Архитектура и структура проекта

Браузерное расширение (Chrome, Manifest V3) для быстрого списания времени в
YouTrack. Пользователь настраивает постоянный список задач и задачи на день, а
затем кнопками `+`/`-` меняет учтённое время прямо из попапа, не заходя в
веб-интерфейс YouTrack.

---

## 1. Технологии

| Слой             | Инструмент                                                  |
| ---------------- | ----------------------------------------------------------- |
| UI               | Vue 3 (`<script setup>`, Composition API)                   |
| Компоненты       | Element Plus + `@element-plus/icons-vue`                    |
| Роутинг          | vue-router (hash-history — обязателен внутри попапа)        |
| HTTP             | ky (поверх `fetch`)                                         |
| Обработка ошибок | `@sweet-monads/either` (`Right`/`Left` вместо throw наружу) |
| Сборка           | Vite (мульти-entry: попап + service worker)                 |
| Язык             | TypeScript                                                  |
| Тесты            | Vitest                                                      |

---

## 2. Ключевая идея: два рантайм-контекста и изоляция токена

Это главное, что нужно понять про проект. Код исполняется в **двух разных
контекстах**, и от этого зависит вся раскладка файлов.

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  POPUP (UI, Vue-приложение)  │         │   SERVICE WORKER (фон)       │
│                              │         │                              │
│  Views / компоненты          │  msg →  │  Принимает сообщения         │
│  YTService (фасад) ──────────┼─────────┼─→ youtrack-client (запросы)  │
│                              │  ← DTO  │   http (ky) + ТОКЕН          │
│  НИКОГДА не видит токен      │         │   auth (save/delete токена)  │
└──────────────────────────────┘         └──────────────────────────────┘
            │                                         │
            └──────────── shared (контракт) ──────────┘
```

**Требование ИБ:** пользовательский токен читается и используется **только** в
service worker. Попап его не хранит, не подставляет в заголовки, не светит в
URL/логах. Поэтому:

- Все запросы к YouTrack выполняет воркер ([`background/`](src/background)),
  токен подставляется в `Authorization: Bearer` внутри воркера.
- Попап общается с воркером через `chrome.runtime.sendMessage` и получает уже
  готовые данные.
- Граница между контекстами вынесена в **структуру папок**, чтобы её было видно:
  `background/` (воркер) ↔ `popup/` (UI) ↔ `shared/` (общий контракт).

### Мост Either через границу сообщений

`Either` (`Right`/`Left`) — это инстансы классов. `chrome.runtime.sendMessage`
сериализует данные structured-clone'ом, который срезает прототип, и на той
стороне у объекта нет методов `.fold/.isLeft/.value`. Поэтому на границе:

1. Воркер сворачивает `Either` в плоский DTO `SerializedEither`
   (`{ ok: true, data } | { ok: false, error, invalidToken }`).
2. Попап разворачивает DTO обратно в `Either`.

Обе половины моста живут вместе в [`shared/either.ts`](src/shared/either.ts), так
что код компонентов работает с `Either` как обычно и ничего не знает о транспорте.

---

## 3. Структура каталогов

```
src/
├── background/          # исполняется в service worker (единственный знает токен)
│   ├── index.ts             # точка входа SW: слушает chrome.runtime.onMessage
│   ├── youtrack-client.ts   # запросы к YouTrack + диспетчер callYtApi
│   ├── http.ts              # конфиг ky: резолв baseUrl/токена, обработка 401
│   ├── auth.ts              # сохранение/удаление токена и URL
│   └── map-error.ts         # маппинг ошибок ky → читаемый KyError (+ isObject)
│
├── popup/              # исполняется в UI (Vue-приложение попапа)
│   ├── main.ts              # точка входа: создаёт app, подключает плагины
│   ├── App.vue              # корневой компонент: header + <router-view>
│   ├── youtrack-service.ts  # ФАСАД: те же сигнатуры, транспорт = сообщения/прямой вызов
│   ├── locales.ts           # тексты UI (LOCALES)
│   ├── router/
│   │   └── index.ts         # маршруты + enum RouteNames
│   ├── components/
│   │   ├── YTHeader.vue     # шапка с логотипом и переходом в настройки
│   │   └── YTLogo.vue       # SVG-логотип
│   ├── views/
│   │   ├── LoginPage.vue        # ввод URL + токена, подключение
│   │   ├── SettingsPage.vue     # проект, тип работы, шаг, списки задач
│   │   └── TrackTasksPage.vue   # главный экран: счётчики и кнопки +/-
│   └── __tests__/
│       └── App.spec.ts
│
├── shared/             # общий контракт обоих контекстов
│   ├── messages.ts          # типы сообщений, параметры методов, INVALID_TOKEN
│   ├── either.ts            # SerializedEither + serialize/deserialize
│   └── types.ts             # DTO YouTrack (YTProject, YTWorkItem, …) + YTSettings
│
├── storage/            # слой персистентности (chrome.storage)
│   ├── chrome-storage.ts    # обёртка над chrome.storage (+ DEV-мок на localStorage)
│   ├── keys.ts              # ключи хранилища (KEYS)
│   └── settings.ts          # типизированный load/saveSettings + DEFAULT_STEP
│
└── assets/             # стили (SCSS) и шрифты
    ├── styles/
    └── fonts/
```

### Что где лежит и почему

- **`background/`** — всё, что трогает токен. Никаких импортов UI (нет `router`,
  `ElNotification`): в воркере нет DOM. Зависит от `shared/` и `storage/`.
- **`popup/`** — всё, что про интерфейс. Никогда не импортирует `background/*`
  напрямую в проде (только динамический импорт в DEV, см. §6).
- **`shared/`** — контракт. Не зависит ни от `background/`, ни от `popup/`.
- **`storage/`** — единая точка работы с `chrome.storage`. Используется и
  воркером (токен/URL), и попапом (несекретные настройки).

---

## 4. Жизненный цикл запроса

Пример: экран настроек запрашивает список проектов.

```
SettingsPage.vue
  └─ YTService.getProjects()                 // popup/youtrack-service.ts (фасад)
        │
        ├─ DEV:  import('@/background/youtrack-client').callYtApi('getProjects')
        │
        └─ PROD: chrome.runtime.sendMessage({ kind:'yt-api', method:'getProjects' })
                    │
                    ▼
              background/index.ts            // слушатель сообщений
                    └─ callYtApi('getProjects')          // youtrack-client.ts
                          └─ getKyInstance() + GET /api/admin/projects   // http.ts (+токен)
                          └─ Either → serializeEither → DTO
                    ◄── sendResponse(DTO)
        ◄── DTO
  ◄─ deserializeEither(DTO) → Either<KyError, YTProject[]>
SettingsPage: res.fold(onError, onData)
```

Реакция на невалидный токен (`invalidToken: true` в DTO) обрабатывается в фасаде
попапа: показывает уведомление и уводит на экран логина. Воркер при 401
дополнительно чистит токен из хранилища ([`http.ts`](src/background/http.ts)).

### Контракт сообщений ([`shared/messages.ts`](src/shared/messages.ts))

| `kind`             | Назначение                                  |
| ------------------ | ------------------------------------------- |
| `yt-api`           | вызов метода API (`method` + `params`)      |
| `save-credentials` | воркер сохраняет токен (local) и URL (sync) |
| `delete-token`     | воркер удаляет токен                        |

Методы API: `getUserInfo`, `getProjects`, `getProjectsWorkTypes`, `getTasks`,
`getIssueById`, `getTimeTracking`, `addWorkItem`, `deleteWorkItem`.

---

## 5. Хранение данных ([`storage/`](src/storage))

| Что                     | Хранилище | Ключ             |
| ----------------------- | --------- | ---------------- |
| Токен (секрет)          | `local`   | `ytToken`        |
| URL YouTrack            | `sync`    | `ytUrl`          |
| Проект по умолчанию     | `sync`    | `ytProject`      |
| Тип работы по умолчанию | `sync`    | `ytWorkType`     |
| Шаг списания            | `sync`    | `ytStep`         |
| Постоянные задачи       | `sync`    | `ytRegularTasks` |
| Задачи на день          | `local`   | `ytDailyTasks`   |

Особенности [`chrome-storage.ts`](src/storage/chrome-storage.ts):

- В **DEV** (`npm run dev`, без расширения) `chrome.storage` недоступен, поэтому
  используется мок поверх `localStorage`.
- Перед записью значение прогоняется через `toPlain` (`JSON.parse(JSON.stringify)`)
  — снимает реактивность Vue (`chrome.storage` не умеет клонировать `Proxy`).

---

## 6. DEV vs PROD

В фасаде [`youtrack-service.ts`](src/popup/youtrack-service.ts) и в
[`http.ts`](src/background/http.ts) есть ветвления `import.meta.env.DEV`:

- **PROD (собранное расширение):** есть service worker; попап ходит к нему
  сообщениями; токен/URL берутся из `chrome.storage`.
- **DEV (`npm run dev`, обычная вкладка):** воркера нет, `chrome.*` недоступен.
  Фасад **динамически** импортирует реализацию из `background/` и вызывает её
  напрямую; токен берётся из `.env` (`VITE_DEV_YT_TOKEN`), URL — из `VITE_YT_URL`.

Динамический `import()` под `if (import.meta.env.DEV)` важен: в проде эта ветка
вырезается сборкой, поэтому ky и логика запросов **не попадают** в бандл попапа —
токен остаётся только в воркере.

---

## 7. Сборка и точки входа

[`vite.config.ts`](vite.config.ts) собирает **два** entry:

| Entry            | Источник                           | Результат                                 |
| ---------------- | ---------------------------------- | ----------------------------------------- |
| `index`          | `index.html` → `src/popup/main.ts` | попап (`assets/*`)                        |
| `service-worker` | `src/background/index.ts`          | `dist/service-worker.js` (стабильное имя) |

[`public/manifest.json`](public/manifest.json) (MV3):

- `action.default_popup: index.html` — попап по клику на иконку.
- `background.service_worker: service-worker.js`, `type: module`.
- `permissions: ["storage"]` — минимально необходимое.
- `host_permissions` — только домен YouTrack (узко, не `<all_urls>`).

Команды (`package.json`):

```bash
npm run dev          # Vite dev-сервер (мок storage, токен из .env)
npm run build        # type-check + прод-сборка в dist/
npm run test:unit    # Vitest
npm run lint         # oxlint + eslint
```

---

## 8. Конвенции

- **Импорты** — через алиас `@/` (= `src/`). Имя файла отражает роль:
  `youtrack-client` (реализация в воркере) vs `youtrack-service` (фасад в попапе).
- **Ошибки** — функции API возвращают `Either<KyError, T>`; компоненты разбирают
  через `.fold(onError, onOk)` или `.isLeft()/.value`. Наружу не бросаем.
- **Стили** — SCSS + BEM в `scoped`-блоках; общие отступы — классы `my-*`.
- **Тексты UI** — только через `LOCALES` ([`popup/locales.ts`](src/popup/locales.ts)).
- **Границы контекстов** — `popup/` не импортирует `background/*` статически;
  `background/` не импортирует UI. Общее — только через `shared/`.

---

## 9. Краткая навигация «где менять что»

| Задача                  | Файл(ы)                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Новый запрос к YouTrack | `shared/messages.ts` (метод/параметры) → `background/youtrack-client.ts` (реализация + `callYtApi`) → `popup/youtrack-service.ts` (метод фасада) |
| Новый экран             | `popup/views/*` + маршрут в `popup/router/index.ts`                                                                                              |
| Новое поле настроек     | `shared/types.ts` (`YTSettings`) → `storage/keys.ts` → `storage/settings.ts` → `popup/views/SettingsPage.vue`                                    |
| Текст в интерфейсе      | `popup/locales.ts`                                                                                                                               |
| Логика работы с токеном | `background/auth.ts`, `background/http.ts`                                                                                                       |
| Формат/маппинг ошибок   | `background/map-error.ts`                                                                                                                        |
