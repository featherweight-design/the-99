import * as Sentry from "@sentry/nextjs";

// Error monitoring (`docs/agents/ops.md`). The server and the edge share one init; it is inert without a DSN.
export async function register() {
  // The runtime's own Node build, once per server start, for checking a security patch reached it (Vercel picks the
  // patch itself; `docs/agents/ci.md`, "The Node version"). A log line, never a response: no endpoint reports it.
  if (process.env.NEXT_RUNTIME === "nodejs") console.info(`[runtime] node ${process.version}`);
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") await import("./lib/sentry/init-server");
}

// Next calls this for every error it catches: a render, a route handler, a Server Action, the proxy.
export const onRequestError = Sentry.captureRequestError;
