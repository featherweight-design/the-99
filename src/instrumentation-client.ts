import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "./lib/sentry/options";

// Literal `process.env.NEXT_PUBLIC_*` reads: Next inlines them into the bundle at build time (the commit's twin is inlined by
// `next.config.ts`'s `env`). Page loads and navigations are traced at the shared sample rate; `browserTracingIntegration`
// registers web vitals (LCP, CLS, INP, all on by default) and the default `browserSessionIntegration` counts sessions per
// release for crash-free rates. No replay integration: replay stays off.
Sentry.init({
  ...sentryOptions(
    process.env.NEXT_PUBLIC_SENTRY_DSN,
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  ),
  integrations: [Sentry.browserTracingIntegration()],
});

// App Router navigations start their span here, so a soft navigation is timed from the click.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
