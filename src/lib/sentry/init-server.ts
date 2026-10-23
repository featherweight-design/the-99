import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "./options";

Sentry.init(sentryOptions(process.env.SENTRY_DSN, process.env.SENTRY_ENVIRONMENT));
