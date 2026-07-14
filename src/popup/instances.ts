/**
 * Список инстансов YouTrack для выбора на экране логина. Значения зашиты в
 * исходный код (не через .env), схемы нормализованы: localhost — http,
 * продовые/тестовые — https.
 */
export const YT_INSTANCES = [
  "http://localhost:8080",
  "http://localhost:55000",
  "https://youtrack-mapps.sovcombank.ru",
  "https://youtrack-test.sovcombank.ru",
] as const;
