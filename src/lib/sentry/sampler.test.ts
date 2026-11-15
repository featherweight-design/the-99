import { describe, expect, it } from "vitest";
import { forgetIncomingSampling, QUIET_SAMPLE_RATE, TRACE_SAMPLE_RATE, traceRate } from "./sampler";

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

describe("forgetIncomingSampling", () => {
  // Core keeps a root span when `sampleRand < rate` (`tracing/sampling.js`); the rate is ours, the `sampleRand` is the scope's.
  type Ctx = { traceId: string; parentSpanId?: string; sampled?: boolean; sampleRand: number; dsc?: unknown };
  const incoming = (): Ctx => ({ traceId: "t", parentSpanId: "p", sampled: true, sampleRand: 0.000001, dsc: { sample_rand: "0.000001", sampled: "true" } });
  const scopeWith = (ctx: Ctx) => ({ getPropagationContext: () => ctx, setPropagationContext: (next: Ctx) => void (ctx = next), get: () => ctx });

  it("a caller's sampled=1 with sample_rand=0.000001 would force a quiet route without it", () => {
    expect(incoming().sampleRand < traceRate({ name: "POST /api/card-scan/match" })).toBe(true);
  });

  it("gives an incoming trace a fresh sample_rand and no inherited decision, so the 0.01 and 0 routes are not forced", () => {
    for (const name of ["POST /api/card-scan/match", "GET /api/rule-zero/tables/x", "GET /api/health", "GET /api/cron/push-flush"]) {
      const scope = scopeWith(incoming());
      forgetIncomingSampling({ scope, parentSpan: undefined }, () => 0.5);
      const ctx = scope.get();
      expect(ctx).toEqual({ traceId: "t", parentSpanId: "p", sampleRand: 0.5 });
      expect(ctx.sampleRand < traceRate({ name, parentSampled: ctx.sampled } as never)).toBe(false);
    }
  });

  it("leaves a child of a local span, and a request with no incoming trace, alone", () => {
    const child = scopeWith(incoming());
    forgetIncomingSampling({ scope: child, parentSpan: {} }, () => 0.5);
    expect(child.get().sampleRand).toBe(0.000001);
    const fresh = scopeWith({ traceId: "t", sampleRand: 0.3 });
    forgetIncomingSampling({ scope: fresh, parentSpan: undefined }, () => 0.5);
    expect(fresh.get().sampleRand).toBe(0.3);
  });
});
