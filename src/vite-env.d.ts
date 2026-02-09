/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENV: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string;
  readonly VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: string;
  readonly VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for Sentry
interface Window {
  Sentry?: any;
}
