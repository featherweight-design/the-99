// The Anthropic cost read, with `fetch` mocked: no request leaves the test. The key is a sentinel,
// and every test that touches it checks where it went.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ calls: [] as { keyParts: string[]; opts: { revalidate?: number } }[] }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, keyParts: string[], opts: { revalidate?: number }) => {
    cache.calls.push({ keyParts, opts });
    return () => fn();
  },
}));

const { cachedWorkspaceCost, clearNegativeMemo, NEGATIVE_MEMO_MS, readWorkspaceCost, COST_LOG } = await import("./anthropic-cost");
const { MAX_PAGES } = await import("./anthropic-cost-rule");
const { DEPLOYMENT_ID } = await import("../cache/deployment");

const KEY = "sk-ant-admin-SENTINEL-4f1c";
const OCT = { year: 2026, month: 9 };
const SEP = { year: 2026, month: 8 };
const NOW = new Date("2026-10-17T14:05:42Z");

type Call = { url: string; init: RequestInit };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const costPage = (results: unknown[], more: { has_more?: boolean; next_page?: string | null } = {}) =>
  ({ data: [{ starting_at: "2026-10-01T00:00:00Z", ending_at: "2026-10-02T00:00:00Z", results }], has_more: false, next_page: null, ...more });
const wsPage = (data: unknown[], more: { has_more?: boolean; last_id?: string | null } = {}) =>
  ({ data, has_more: false, first_id: null, last_id: null, ...more });
const THE_99 = { id: "wrkspc_99", name: "The 99", archived_at: null };
const OTHER = { id: "wrkspc_cc", name: "Concert Crawl", archived_at: null };

/** A fake Anthropic: each endpoint answers from its own queue, the last answer repeating. */
function fake(answers: { cost?: (() => Response | Promise<Response>)[]; ws?: (() => Response | Promise<Response>)[] }) {
  const calls: Call[] = [];
  const queues = {
    cost: answers.cost ?? [() => json(costPage([{ amount: "12454", currency: "USD", workspace_id: "wrkspc_99" }, { amount: "900", currency: "USD", workspace_id: null }]))],
    ws: answers.ws ?? [() => json(wsPage([OTHER, THE_99]))],
  };
  const seen = { cost: 0, ws: 0 };
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const which = url.includes("/cost_report") ? "cost" : "ws";
    const q = queues[which];
    const answer = q[Math.min(seen[which]++, q.length - 1)];
    return answer();
  });
  const log = vi.fn();
  return { calls, fetch, log, deps: (...a: [key?: string | undefined]) => ({ key: a.length ? a[0] : KEY, now: () => NOW, fetch: fetch as unknown as typeof globalThis.fetch, log }) };
}

beforeEach(() => {
  cache.calls.length = 0;
  clearNegativeMemo();
});

describe("readWorkspaceCost", () => {
  it("reads The 99's month from the cost report", async () => {
    const f = fake({});
    expect(await readWorkspaceCost(OCT, NOW, f.deps())).toEqual({ ok: true, asOf: NOW.toISOString(), workspaceMicro: 124_540_000 });
    // One line on success too, so a deployed read can be confirmed from the logs: the days read, nothing else.
    expect(f.log.mock.calls).toEqual([[expect.stringMatching(/^\[costs\] anthropic cost_report ok days=\d+$/)]]);
    for (const c of f.calls) {
      expect(c.init.cache).toBe("no-store");
      expect(c.init.headers).toEqual({ "x-api-key": KEY, "anthropic-version": "2023-06-01", "user-agent": "the-99-admin" });
    }
  });

  it.each([undefined, "", "   "])("is no_key with the key %j: no fetch, no log", async (key) => {
    const f = fake({});
    expect(await readWorkspaceCost(OCT, NOW, f.deps(key))).toEqual({ ok: false, kind: "no_key" });
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.log).not.toHaveBeenCalled();
  });

  it.each([
    [401, "refused"],
    [403, "refused"],
    [400, "rejected"],
    [404, "rejected"],
    [422, "rejected"],
    [429, "upstream"],
    [500, "upstream"],
    [503, "upstream"],
    [418, "upstream"],
  ])("reads a %i as %s, with one fixed log line", async (status, kind) => {
    const f = fake({ cost: [() => json({ error: { message: `leak ${KEY}` } }, status)] });
    expect(await readWorkspaceCost(OCT, NOW, f.deps())).toEqual({ ok: false, kind });
    // The status, and nothing of the body: the line never carries what the server said.
    expect(f.log.mock.calls).toEqual([[`${COST_LOG} unread kind=${kind} status=${status}`]]);
  });

  it("reads a status from the workspace list the same way", async () => {
    const f = fake({ ws: [() => json({}, 403)] });
    expect(await readWorkspaceCost(OCT, NOW, f.deps())).toEqual({ ok: false, kind: "refused" });
  });

  it("reads a rejected fetch and an abort as upstream", async () => {
    const network = fake({ cost: [() => Promise.reject(new TypeError(`fetch failed ${KEY}`))] });
    expect(await readWorkspaceCost(OCT, NOW, network.deps())).toEqual({ ok: false, kind: "upstream" });
    const abort = fake({ ws: [() => Promise.reject(new DOMException("The operation timed out.", "TimeoutError"))] });
    expect(await readWorkspaceCost(OCT, NOW, abort.deps())).toEqual({ ok: false, kind: "upstream" });
    expect(abort.log.mock.calls).toEqual([[`${COST_LOG} unread kind=upstream`]]);
  });

  it("reads a body that breaks or times out mid-read as upstream, and only a body that is not JSON as shape", async () => {
    const broken = () => {
      const body = new ReadableStream({ start: (c) => c.error(new DOMException("The operation timed out.", "TimeoutError")) });
      return Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
    };
    const midBody = fake({ cost: [broken] });
    expect(await readWorkspaceCost(OCT, NOW, midBody.deps())).toEqual({ ok: false, kind: "upstream" });
    const notJson = fake({ cost: [() => Promise.resolve(new Response("<html>", { status: 200 }))] });
    expect(await readWorkspaceCost(OCT, NOW, notJson.deps())).toEqual({ ok: false, kind: "shape" });
  });

  it("reads a bad body, a body that is not JSON and a non-USD line as shape", async () => {
    for (const answer of [
      () => json({ nope: true }),
      () => new Response("<html>", { status: 200 }),
      () => json(costPage([{ amount: "1", currency: "EUR", workspace_id: "wrkspc_99" }])),
    ]) {
      const f = fake({ cost: [answer] });
      expect(await readWorkspaceCost(OCT, NOW, f.deps())).toEqual({ ok: false, kind: "shape" });
    }
  });

  it("follows next_page, and refuses an eleventh page as shape", async () => {
    const two = fake({
      cost: [
        () => json(costPage([{ amount: "100", currency: "USD", workspace_id: "wrkspc_99" }], { has_more: true, next_page: "p2" })),
        () => json(costPage([{ amount: "50", currency: "USD", workspace_id: "wrkspc_99" }])),
      ],
    });
    expect(await readWorkspaceCost(OCT, NOW, two.deps())).toMatchObject({ ok: true, workspaceMicro: 1_500_000 });
    const costCalls = two.calls.filter((c) => c.url.includes("/cost_report"));
    expect(costCalls).toHaveLength(2);
    expect(costCalls[0].url).not.toContain("page=");
    expect(costCalls[1].url).toContain("page=p2");

    const endless = fake({ cost: [() => json(costPage([], { has_more: true, next_page: "again" }))] });
    expect(await readWorkspaceCost(OCT, NOW, endless.deps())).toEqual({ ok: false, kind: "shape" });
    expect(endless.calls.filter((c) => c.url.includes("/cost_report"))).toHaveLength(MAX_PAGES);
  });

  it("follows the workspace list by after_id = last_id", async () => {
    const f = fake({ ws: [() => json(wsPage([OTHER], { has_more: true, last_id: "wrkspc_cc" })), () => json(wsPage([THE_99]))] });
    expect(await readWorkspaceCost(OCT, NOW, f.deps())).toMatchObject({ ok: true, workspaceMicro: 124_540_000 });
    const wsCalls = f.calls.filter((c) => c.url.includes("/workspaces"));
    expect(wsCalls.map((c) => c.url)).toEqual([
      "https://api.anthropic.com/v1/organizations/workspaces?limit=1000",
      "https://api.anthropic.com/v1/organizations/workspaces?limit=1000&after_id=wrkspc_cc",
    ]);
  });

  it("gives every request in one read the same signal", async () => {
    const f = fake({ ws: [() => json(wsPage([OTHER], { has_more: true, last_id: "wrkspc_cc" })), () => json(wsPage([THE_99]))] });
    await readWorkspaceCost(OCT, NOW, f.deps());
    expect(f.calls.length).toBe(3);
    const signal = f.calls[0].init.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    for (const c of f.calls) expect(c.init.signal).toBe(signal);
  });

  it("finds no workspace, or two, and never guesses", async () => {
    const none = fake({ ws: [() => json(wsPage([OTHER]))] });
    expect(await readWorkspaceCost(OCT, NOW, none.deps())).toEqual({ ok: false, kind: "no_workspace" });
    expect(none.log.mock.calls).toEqual([[`${COST_LOG} unread kind=no_workspace`]]);
    const two = fake({ ws: [() => json(wsPage([THE_99, { id: "wrkspc_dup", name: "the 99", archived_at: null }]))] });
    expect(await readWorkspaceCost(OCT, NOW, two.deps())).toEqual({ ok: false, kind: "ambiguous_workspace", count: 2 });
  });

  it("asks a past month for the whole month, and the current one up to the minute", async () => {
    const f = fake({});
    await readWorkspaceCost(SEP, NOW, f.deps());
    await readWorkspaceCost(OCT, NOW, f.deps());
    const urls = f.calls.filter((c) => c.url.includes("/cost_report")).map((c) => c.url);
    expect(urls[0]).toContain("ending_at=2026-10-01T00%3A00%3A00Z");
    expect(urls[1]).toContain("ending_at=2026-10-17T14%3A05%3A00Z");
  });

  it("never lets the key escape: no URL, result, log line or thrown value carries it", async () => {
    const outcomes = [
      fake({}),
      fake({ cost: [() => json({ error: KEY }, 401)] }),
      fake({ cost: [() => Promise.reject(new Error(KEY))] }),
      fake({ ws: [() => json(wsPage([OTHER]))] }),
    ];
    for (const f of outcomes) {
      const result = await readWorkspaceCost(OCT, NOW, f.deps());
      expect(JSON.stringify(result)).not.toContain(KEY);
      for (const line of f.log.mock.calls.flat()) expect(String(line)).not.toContain(KEY);
      for (const c of f.calls) {
        expect(c.url).not.toContain(KEY);
        const headers = Object.values(c.init.headers as Record<string, string>);
        expect(headers.filter((h) => h.includes(KEY))).toHaveLength(1);
      }
    }
  });
});

describe("cachedWorkspaceCost", () => {
  it("shares one in-flight read between overlapping requests for a month, so an outage costs one poll", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const f = fake({ cost: [() => gate.then(() => json({}, 503))] });
    const a = cachedWorkspaceCost(OCT, NOW, f.deps());
    const b = cachedWorkspaceCost(OCT, NOW, f.deps());
    release();
    expect(await a).toEqual({ ok: false, kind: "upstream" });
    expect(await b).toEqual({ ok: false, kind: "upstream" });
    expect(f.calls.filter((c) => c.url.includes("/cost_report"))).toHaveLength(1);
  });

  it("is no_key before the cache and the memo: no fetch, no unstable_cache", async () => {
    const f = fake({});
    expect(await cachedWorkspaceCost(OCT, NOW, f.deps(""))).toEqual({ ok: false, kind: "no_key" });
    expect(await cachedWorkspaceCost(OCT, NOW, f.deps(undefined))).toEqual({ ok: false, kind: "no_key" });
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.log).not.toHaveBeenCalled();
    expect(cache.calls).toEqual([]);
  });

  it("keys the current month on the deployment, the month and the five-minute bucket, never the key", async () => {
    const f = fake({});
    expect(await cachedWorkspaceCost(OCT, NOW, f.deps())).toMatchObject({ ok: true, workspaceMicro: 124_540_000 });
    expect(cache.calls).toEqual([
      { keyParts: ["anthropic-cost", DEPLOYMENT_ID, "2026-10", String(Math.floor(NOW.getTime() / 300_000))], opts: { revalidate: 300 } },
    ]);
    expect(JSON.stringify(cache.calls)).not.toContain(KEY);
  });

  it("keys a past month by the hour, so an expired figure is read in the foreground", async () => {
    const f = fake({});
    await cachedWorkspaceCost(SEP, NOW, f.deps());
    const hour = Math.floor(NOW.getTime() / 3_600_000);
    expect(cache.calls).toEqual([{ keyParts: ["anthropic-cost", DEPLOYMENT_ID, "2026-09", String(hour)], opts: { revalidate: 3600 } }]);
    // The next hour is a new key: a miss, never a stale entry refreshed (and failing) behind the reader's back.
    await cachedWorkspaceCost(SEP, new Date(NOW.getTime() + 3_600_000), f.deps());
    expect(cache.calls[1].keyParts.at(-1)).toBe(String(hour + 1));
  });

  it("serves a failure unstored, holds it 60 seconds per month, then asks again", async () => {
    const f = fake({ cost: [() => json({}, 401)] });
    expect(await cachedWorkspaceCost(OCT, NOW, f.deps())).toEqual({ ok: false, kind: "refused" });
    const first = f.fetch.mock.calls.length;
    expect(first).toBeGreaterThan(0);

    // Inside the window: the same kind, no fetch, no cache.
    const later = new Date(NOW.getTime() + 59_000);
    expect(await cachedWorkspaceCost(OCT, later, f.deps())).toEqual({ ok: false, kind: "refused" });
    expect(f.fetch.mock.calls.length).toBe(first);
    expect(cache.calls).toHaveLength(1);

    // Another month is its own entry.
    await cachedWorkspaceCost(SEP, later, f.deps());
    expect(f.fetch.mock.calls.length).toBeGreaterThan(first);

    // Past the window: asked again.
    const before = f.fetch.mock.calls.length;
    expect(await cachedWorkspaceCost(OCT, new Date(NOW.getTime() + NEGATIVE_MEMO_MS + 1_000), f.deps())).toEqual({ ok: false, kind: "refused" });
    expect(f.fetch.mock.calls.length).toBeGreaterThan(before);
  });

  it("carries an ambiguous count through the memo", async () => {
    const f = fake({ ws: [() => json(wsPage([THE_99, { id: "wrkspc_dup", name: "The 99", archived_at: null }]))] });
    await cachedWorkspaceCost(OCT, NOW, f.deps());
    expect(await cachedWorkspaceCost(OCT, new Date(NOW.getTime() + 1_000), f.deps())).toEqual({ ok: false, kind: "ambiguous_workspace", count: 2 });
  });

  it("never memoizes a success, and the memo never answers with figures", async () => {
    const f = fake({});
    await cachedWorkspaceCost(OCT, NOW, f.deps());
    const after = f.fetch.mock.calls.length;
    // A second call goes to the cache again (here, through to the loader), not to a memo.
    expect(await cachedWorkspaceCost(OCT, new Date(NOW.getTime() + 1_000), f.deps())).toMatchObject({ ok: true });
    expect(cache.calls).toHaveLength(2);
    expect(f.fetch.mock.calls.length).toBeGreaterThan(after);
  });
});

describe("no route opts out of the fetch and cache behavior this read assumes (L3)", () => {
  it("no file under src/app/admin/ exports dynamic or fetchCache", () => {
    const root = join(process.cwd(), "src/app/admin");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => /export\s+(const|let|var)\s+(dynamic|fetchCache)\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
