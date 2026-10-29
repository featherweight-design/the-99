/**
 * Where an ingest alert goes: a Vercel log line and a Sentry event, the cron catch sites' channel
 * (`captureServerError`, docs/agents/ops.md). Sentry's scrubber drops messages and extras, so what identifies the
 * alert travels as tags: the kind, the post's slug (public), and an HTTP status. Fingerprinted per kind and post,
 * so a post that stays overdue run after run is one issue, not one per run.
 */
import * as Sentry from "@sentry/nextjs";
import type { IngestAlert } from "./ingest";

export function alertTags(a: IngestAlert): Record<string, string> {
  const tags: Record<string, string> = { site: "announcements-ingest", alert: a.kind };
  if ("url" in a) tags.post = a.url.split("/").pop() ?? a.url;
  if ("status" in a && a.status !== null) tags.status = String(a.status);
  return tags;
}

export function reportIngestAlert(a: IngestAlert): void {
  const tags = alertTags(a);
  console.warn(`[announcements-ingest] ${Object.entries(tags).filter(([k]) => k !== "site").map(([k, v]) => `${k}=${v}`).join(" ")}`);
  Sentry.captureException(new Error(`announcements-ingest:${a.kind}`), {
    level: "warning",
    tags,
    fingerprint: ["announcements-ingest", a.kind, tags.post ?? ""],
  });
}
