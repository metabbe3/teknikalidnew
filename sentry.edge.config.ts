import * as Sentry from "@sentry/nextjs";
import { sharedSentryConfig } from "./sentry.config";

Sentry.init(sharedSentryConfig);
