import { describe, expect, it } from "vitest";
import { envelopeUrl, failureEnvelope, parseDsn } from "./synthetic-probe-lib.mjs";

describe("parseDsn", () => {
  it("reads key, host and project from a Sentry DSN", () => {
    expect(parseDsn("https://abc123@o42.ingest.us.sentry.io/4501")).toEqual({ key: "abc123", host: "o42.ingest.us.sentry.io", projectId: "4501" });
  });
  it("refuses anything that is not an https DSN with a numeric project", () => {
    for (const bad of ["", "nope", "http://k@h/1", "https://h/1", "https://k@h/x", undefined]) expect(parseDsn(bad)).toBeNull();
  });
});

describe("failureEnvelope", () => {
  const e = failureEnvelope({ failed: ["landing", "sign-in"], base: "https://the-99.dev", eventId: "a".repeat(32), now: 1_800_000_000_000 });
  const [header, item, body] = e.split("\n");
  it("is three lines: header, item header with the exact body length, the event", () => {
    expect(JSON.parse(header).event_id).toBe("a".repeat(32));
    expect(JSON.parse(item)).toEqual({ type: "event", length: Buffer.byteLength(body) });
  });
  it("names the failed steps and the base and carries nothing else of a visitor", () => {
    const ev = JSON.parse(body);
    expect(ev.message).toBe("Synthetic probe failed: landing, sign-in");
    expect(ev.tags).toEqual({ site: "synthetic-probe", steps: "landing,sign-in", base: "https://the-99.dev" });
    expect(Object.keys(ev).sort()).toEqual(["environment", "event_id", "level", "logger", "message", "platform", "tags", "timestamp"]);
  });
  it("files a run against another origin under staging, not production", () => {
    const other = failureEnvelope({ failed: ["landing"], base: "https://staging.the-99.dev", eventId: "b".repeat(32), now: 1_800_000_000_000 });
    expect(JSON.parse(other.split("\n")[2]).environment).toBe("staging");
    expect(JSON.parse(body).environment).toBe("production");
  });
  it("builds the endpoint from a parsed DSN", () => {
    expect(envelopeUrl({ host: "o42.ingest.us.sentry.io", projectId: "4501", key: "abc123" })).toBe(
      "https://o42.ingest.us.sentry.io/api/4501/envelope/?sentry_version=7&sentry_key=abc123",
    );
  });
});
