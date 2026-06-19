/// <reference types="vite/client" />
/// <reference types="chrome-types" />

interface ImportMetaEnv {
  readonly VITE_YT_URL: string;
  readonly VITE_DEV_YT_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const chrome: typeof chrome;
