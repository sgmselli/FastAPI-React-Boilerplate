export {};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }

  interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_GA_MEASUREMENT_ID?: string;
  }
}