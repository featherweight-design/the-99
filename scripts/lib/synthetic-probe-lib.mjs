// The pure half of the hourly synthetic probe (`scripts/synthetic-probe.mjs`): reporting a failure to Sentry with a plain `fetch`
// of an envelope, so the probe needs no SDK. Nothing here reads the environment or the network by itself.

/** `{ key, host, projectId }` from a Sentry DSN (`https://<key>@<host>/<project>`), or null for anything else. */
export function parseDsn(dsn) {
  try {
    const url = new URL(String(dsn).trim());
    const projectId = url.pathname.replace(/^\/+/, "").split("/").pop();
    if (url.protocol !== "https:" || !url.username || !url.hostname || !/^\d+$/.test(projectId ?? "")) return null;
    return { key: url.username, host: url.host, projectId };
  } catch {
    return null;
  }
}

/**
 * The Sentry envelope for one failed run: a fixed message, the names of the steps that failed and the base address (a public
 * origin), nothing else. No cookie, no page text, no address a visitor typed.
 */
export function failureEnvelope({ failed, base, eventId, now }) {
  const event = {
    event_id: eventId,
    timestamp: Math.floor(now / 1000),
    platform: "javascript",
    level: "error",
    logger: "synthetic-probe",
    message: `Synthetic probe failed: ${failed.join(", ")}`,
    environment: "production",
    tags: { site: "synthetic-probe", steps: failed.join(","), base },
  };
  const body = JSON.stringify(event);
  return [
    JSON.stringify({ event_id: eventId, sent_at: new Date(now).toISOString() }),
    JSON.stringify({ type: "event", length: Buffer.byteLength(body) }),
    body,
  ].join("\n");
}

/** The envelope endpoint for a parsed DSN. */
export const envelopeUrl = (dsn) => `https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_version=7&sentry_key=${dsn.key}`;
