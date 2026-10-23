import * as Sentry from "@sentry/nextjs";

// Error monitoring (`docs/agents/ops.md`). The server and the edge share one init; it is inert without a DSN.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") await import("./lib/sentry/init-server");
}

// Next calls this for every error it catches: a render, a route handler, a Server Action, the proxy.
export const onRequestError = Sentry.captureRequestError;
