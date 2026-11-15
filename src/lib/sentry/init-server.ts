import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "./options";
import { forgetIncomingSampling } from "./sampler";

Sentry.init(sentryOptions(process.env.SENTRY_DSN, process.env.SENTRY_ENVIRONMENT, process.env.VERCEL_GIT_COMMIT_SHA));
// After the SDK's own listener (registered when the client was built): an incoming trace never decides our sampling.
Sentry.getClient()?.on("prepareSpanScope", forgetIncomingSampling);
