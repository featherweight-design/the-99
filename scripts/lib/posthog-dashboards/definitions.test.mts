import { describe, expect, it, vi } from "vitest";
import { FUNNEL_EVENTS } from "../../../src/lib/analytics/funnel-events";
import { ENGAGEMENT_EVENT_VALUES } from "../../../src/lib/analytics/engagement-events";
import { apiHostFor, makeClient } from "./client.mts";
import { DASHBOARDS, NOT_YET_SENT, eventNamesIn } from "./definitions.mts";
import { contains, planRun, summarize } from "./plan.mts";

const sent = new Set<string>([...Object.keys(ENGAGEMENT_EVENT_VALUES), ...FUNNEL_EVENTS]);
const all = DASHBOARDS.flatMap((d) => d.insights);

describe("the dashboard definitions", () => {
  it("count only events something sends, or one named in NOT_YET_SENT", () => {
    const counted = eventNamesIn(DASHBOARDS);
    const unknown = [...counted].filter((e) => !sent.has(e) && !(NOT_YET_SENT as readonly string[]).includes(e));
    expect(unknown).toEqual([]);
  });

  it("drop a NOT_YET_SENT name once the registry sends it", () => {
    expect(NOT_YET_SENT.filter((e) => sent.has(e))).toEqual([]);
  });

  it("name every dashboard and insight once, so a match by name is unambiguous", () => {
    const names = [...DASHBOARDS.map((d) => d.name), ...all.map((i) => i.name)];
    expect(new Set(names).size).toBe(names.length);
  });

  it("give every insight a description and a query PostHog can read", () => {
    for (const i of all) {
      expect(i.description.length).toBeGreaterThan(10);
      expect(["TrendsQuery", "FunnelsQuery", "RetentionQuery"]).toContain((i.query.source as { kind: string }).kind);
    }
  });

  it("break down only by a property the event carries", () => {
    for (const i of all) {
      const src = i.query.source as { series?: { event: string }[]; breakdownFilter?: { breakdown: string } };
      const by = src.breakdownFilter?.breakdown;
      if (!by) continue;
      const event = src.series![0]!.event as keyof typeof ENGAGEMENT_EVENT_VALUES;
      if (!(event in ENGAGEMENT_EVENT_VALUES)) continue;
      expect(Object.keys(ENGAGEMENT_EVENT_VALUES[event])).toContain(by);
    }
  });
});

describe("planRun", () => {
  const first = DASHBOARDS[0]!;
  const one = first.insights[0]!;

  it("creates everything in an empty project", () => {
    const steps = planRun(DASHBOARDS, [], []);
    expect(steps.filter((s) => s.action === "create").length).toBe(DASHBOARDS.length + all.length);
  });

  it("keeps what matches, whatever extra defaults PostHog added", () => {
    const have = [{ id: 7, name: one.name, description: one.description, query: { ...one.query, extra: 1 }, dashboards: [1] }];
    const steps = planRun([first], [{ id: 1, name: first.name }], have);
    expect(steps.find((s) => s.name === one.name)?.action).toBe("keep");
  });

  it("updates an insight whose query or description changed, or that is missing from the dashboard", () => {
    const base = { id: 7, name: one.name, description: one.description, query: one.query as unknown, dashboards: [1] };
    const act = (have: typeof base) => planRun([first], [{ id: 1, name: first.name }], [have]).find((s) => s.name === one.name)?.action;
    expect(act({ ...base, description: "old" })).toBe("update");
    expect(act({ ...base, query: { kind: "InsightVizNode", source: { kind: "TrendsQuery" } } })).toBe("update");
    expect(act({ ...base, dashboards: [] })).toBe("update");
  });

  it("never plans a delete", () => {
    const steps = planRun(DASHBOARDS, [{ id: 1, name: "By hand" }], [{ id: 2, name: "By hand too" }]);
    expect(steps.every((s) => ["create", "keep", "update"].includes(s.action))).toBe(true);
  });

  it("summarizes", () => {
    expect(summarize(planRun(DASHBOARDS, [], []))).toContain(`${DASHBOARDS.length} to create`);
  });

  it("contains is a subset match that is strict on arrays", () => {
    expect(contains({ a: 1, b: 2 }, { a: 1 })).toBe(true);
    expect(contains({ a: [1, 2] }, { a: [1] })).toBe(false);
  });
});

describe("the client", () => {
  it("derives the app host from the ingest host", () => {
    expect(apiHostFor({})).toBe("https://us.posthog.com");
    expect(apiHostFor({ NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com/" })).toBe("https://eu.posthog.com");
    expect(apiHostFor({ POSTHOG_API_HOST: "https://ph.example.com/" })).toBe("https://ph.example.com");
  });

  it("sends the key as a bearer to its own host and never follows a next link elsewhere", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ results: [], next: "https://evil.example/api/x" }), { status: 200 }));
    const c = makeClient("https://us.posthog.com", "12", "phx_secret", fetchImpl as unknown as typeof fetch);
    await expect(c.dashboards()).rejects.toThrow(/refusing to send the key to https:\/\/evil.example/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>).authorization).toBe("Bearer phx_secret");
  });

  it("reports a failure by status and path, not by body or key", async () => {
    const fetchImpl = vi.fn(async () => new Response("phx_secret echoed", { status: 403 }));
    const c = makeClient("https://us.posthog.com", "12", "phx_secret", fetchImpl as unknown as typeof fetch);
    const err = await c.dashboards().catch((e: Error) => e.message);
    expect(err).toBe("PostHog GET /api/projects/12/dashboards/ answered 403");
  });
});
