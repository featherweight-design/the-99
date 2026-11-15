import { describe, expect, it } from "vitest";
import { QUIET_SAMPLE_RATE, TRACE_SAMPLE_RATE, traceRate } from "./sampler";

describe("traceRate", () => {
  it("samples ordinary pages and routes at the one rate, 10%", () => {
    expect(TRACE_SAMPLE_RATE).toBe(0.1);
    expect(traceRate({ name: "GET /decks/[id]" })).toBe(0.1);
    expect(traceRate({ name: "/collection", location: { pathname: "/collection" } })).toBe(0.1);
    expect(traceRate({ name: "POST /api/stripe-webhook" })).toBe(0.1);
  });

  it("drops health, liveness, every cron and the CSP sink, wherever the path is found", () => {
    expect(traceRate({ name: "GET /api/health" })).toBe(0);
    expect(traceRate({ name: "GET /api/health/" })).toBe(0);
    expect(traceRate({ name: "GET /api/live" })).toBe(0);
    expect(traceRate({ name: "GET /api/cron/push-flush" })).toBe(0);
    expect(traceRate({ name: "GET", normalizedRequest: { url: "https://the-99.dev/api/cron/invite-sweep?x=1" } })).toBe(0);
    expect(traceRate({ name: "GET", attributes: { "url.path": "/api/cron/account-sweep" } })).toBe(0);
    expect(traceRate({ name: "GET", attributes: { "http.target": "/api/health?probe=1" } })).toBe(0);
    expect(traceRate({ name: "POST /api/csp-report" })).toBe(0);
    // Not a prefix match on a different route.
    expect(traceRate({ name: "GET /api/healthy" })).toBe(0.1);
  });

  it("samples the chatty routes at a hundredth", () => {
    expect(QUIET_SAMPLE_RATE).toBe(0.01);
    expect(traceRate({ name: "POST /api/card-scan/match" })).toBe(0.01);
    expect(traceRate({ name: "POST /api/card-scan/timing" })).toBe(0.01);
    expect(traceRate({ name: "GET /api/rule-zero/tables/3f2a1b4c" })).toBe(0.01);
    expect(traceRate({ name: "GET /api/rule-zero/tables/[id]" })).toBe(0.01);
    expect(traceRate({ name: "POST /api/nav-stall" })).toBe(0.01);
    expect(traceRate({ name: "POST /api/scan-lab/spike" })).toBe(0.01);
  });

  it("decides each root itself: a caller's sampled=1 is not inherited", () => {
    expect(traceRate({ name: "GET /api/health", parentSampled: true } as never)).toBe(0);
    expect(traceRate({ name: "GET /decks", parentSampled: true } as never)).toBe(0.1);
  });
});
