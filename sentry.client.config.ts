import * as Sentry from "@sentry/nextjs";
import { sharedSentryConfig } from "./sentry.config";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    ...sharedSentryConfig,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}
