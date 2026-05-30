export const sharedSentryConfig = {
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
};
