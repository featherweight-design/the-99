import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "./lib/sentry/options";

// Literal `process.env.NEXT_PUBLIC_*` reads: Next inlines them into the bundle at build time.
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT));
