import { describe, expect, it } from "vitest";
import { sentryOptions } from "./options";

const DSN = "https://k@o1.ingest.sentry.io/1";

describe("sentryOptions", () => {
  it("names the release the build plugin uploads source maps under, and the environment it was given", () => {
    const o = sentryOptions(DSN, "production", "0123abcd");
    expect(o.release).toBe("0123abcd");
    expect(o.environment).toBe("production");
    expect(o.enabled).toBe(true);
  });

  it("leaves the release to the SDK when there is no commit, and stays dormant without a DSN or a named environment", () => {
    expect(sentryOptions(DSN, "production", "").release).toBeUndefined();
    expect(sentryOptions(undefined, "production").enabled).toBe(false);
    expect(sentryOptions(DSN, undefined).enabled).toBe(false);
    expect(sentryOptions(DSN, undefined).environment).toBe("local");
  });

  it("streams spans through the sampler and the span scrubber, logs through the log scrubber, and installs no replay", () => {
    const o = sentryOptions(DSN, "staging", "x");
    expect(o.traceLifecycle).toBe("stream");
    expect(o.tracesSampler?.({ name: "GET /api/health", attributes: {}, inheritOrSampleWith: () => 1 })).toBe(0);
    expect(o.tracesSampler?.({ name: "GET /decks", attributes: {}, inheritOrSampleWith: () => 1 })).toBe(0.1);
    expect(o.beforeSendLog?.({ level: "info", message: "not an event" })).toBeNull();
    const span = o.beforeSendSpan?.({ name: "GET /decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b", span_id: "a", trace_id: "b", start_timestamp: 0, status: "ok", is_segment: true, attributes: { "user.id": "user_2NNEqL2nrIRdJ194" } });
    expect(span?.name).toBe("GET /decks/[id]");
    expect(span?.attributes).toEqual({});
    expect(JSON.stringify(Object.keys(o))).not.toMatch(/replay/i);
    expect(o.integrations).toBeUndefined();
  });
});
