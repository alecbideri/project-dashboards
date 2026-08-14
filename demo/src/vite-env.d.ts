/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly LLM_API_KEY?: string
  readonly LLM_BASE_URL?: string
  readonly LLM_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
