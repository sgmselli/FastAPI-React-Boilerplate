import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent } from "@sentry/react";

// Password reset tokens and the Google name suggestion travel in the URL fragment
const withoutFragment = (url: string | undefined) => url?.split("#")[0];

export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  if (event.request?.url) {
    event.request.url = withoutFragment(event.request.url);
  }
  return event;
};

export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
  if (breadcrumb.category === "navigation" && breadcrumb.data) {
    breadcrumb.data.from = withoutFragment(breadcrumb.data.from);
    breadcrumb.data.to = withoutFragment(breadcrumb.data.to);
  }
  return breadcrumb;
};

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Request bodies would include passwords, one time codes and reset tokens
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Errors from browser extensions and third party scripts aren't ours to fix
    allowUrls: [window.location.origin],
    ignoreErrors: [/^Network Error$/, /^Request aborted$/, /^canceled$/],
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
};
