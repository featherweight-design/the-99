import { describe, expect, it, vi } from "vitest";

// client.ts imports db at module level; stub it so the module loads in tests.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { cacheRowRetired, fetchEdhrecUncached, resolveEdhrecData, type EdhrecCacheRow } from "./client";
import { parseEdhrecPayload } from "./parse";

function mockFetch(status: number, htmlStatus = 200): ReturnType<typeof vi.fn> {
  // The JSON API is asked first; a 403 then asks the HTML page, which is the only
  // request made with method HEAD.
  const fn = vi.fn((_url: string, init?: RequestInit) => {
    const s = init?.method === "HEAD" ? htmlStatus : status;
    return Promise.resolve({ status: s, ok: s >= 200 && s < 300 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("fetchEdhrecUncached", () => {
  it("returns unreachable: true for a 429 so the previous index row is preserved", async () => {
    mockFetch(429);
    const result = await fetchEdhrecUncached("Ghoulcaller Gisa");
    expect(result).toEqual({ data: null, unreachable: true });
  });

  it("returns unreachable: true for a 403 whose page exists, so the previous index row is preserved", async () => {
    mockFetch(403, 200);
    const result = await fetchEdhrecUncached("Ghoulcaller Gisa");
    expect(result).toEqual({ data: null, unreachable: true });
  });

  // #712: EDHREC answers a slug with no page at all with a JSON 403 too. The HTML
  // page's 404 is what says so, and it makes the commander absent — written once
  // and never retried — instead of an outage every resumed run fails on.
  it("returns absent for a 403 whose HTML page is a 404", async () => {
    const fn = mockFetch(403, 404);
    const result = await fetchEdhrecUncached("The Eternity Elevator");
    expect(result).toEqual({ data: null, unreachable: false });
    expect(fn).toHaveBeenLastCalledWith(
      "https://edhrec.com/commanders/the-eternity-elevator",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("stays unreachable when the HTML page cannot be read either", async () => {
    for (const html of [403, 429, 503]) {
      mockFetch(403, html);
      expect(await fetchEdhrecUncached("Ghoulcaller Gisa")).toEqual({ data: null, unreachable: true });
    }
    vi.stubGlobal("fetch", vi.fn((_u: string, init?: RequestInit) =>
      init?.method === "HEAD" ? Promise.reject(new Error("timeout")) : Promise.resolve({ status: 403, ok: false })));
    expect(await fetchEdhrecUncached("Ghoulcaller Gisa")).toEqual({ data: null, unreachable: true });
  });

  it("never asks the HTML page for a 429", async () => {
    const fn = mockFetch(429, 404);
    expect(await fetchEdhrecUncached("Ghoulcaller Gisa")).toEqual({ data: null, unreachable: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns unreachable: false (absent) for a 404 — commander is genuinely not on EDHREC", async () => {
    mockFetch(404);
    const result = await fetchEdhrecUncached("Ghoulcaller Gisa");
    expect(result).toEqual({ data: null, unreachable: false });
  });
});


// How it works §5.2: an index build retires every cached page fetched before the index fetched
// the same commander, so the live half and the index read one EDHREC snapshot.
describe("the index retires a cached page it has replaced", () => {
  const day = 24 * 60 * 60 * 1000;
  const ago = (ms: number) => new Date(Date.now() - ms);
  const row = (fetchedAt: Date, indexComputedAt: Date | null): EdhrecCacheRow => ({
    commanderOracleId: "00000000-0000-0000-0000-000000000001",
    payload: { container: { json_dict: { cardlists: [] } } },
    fetchedAt,
    indexComputedAt,
  });
  const upserts: unknown[] = [];
  const answer = (ok: boolean) => {
    const fn = vi.fn(() =>
      ok
        ? Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ container: { json_dict: { cardlists: [] } } }) })
        : Promise.reject(new Error("unreachable")),
    );
    vi.stubGlobal("fetch", fn);
    stub.db.insert = () => ({
      values: (v: unknown) => ({ onConflictDoUpdate: () => (upserts.push(v), Promise.resolve()) }),
    });
    return fn;
  };

  it("retires a page older than the index's fetch of that commander", () => {
    expect(cacheRowRetired(row(ago(3 * day), ago(1 * day)))).toBe(true);
  });

  it("keeps a page fetched after the index's fetch", () => {
    expect(cacheRowRetired(row(ago(1 * day), ago(3 * day)))).toBe(false);
  });

  it("keeps a page the index holds no row for: the TTL alone governs it", () => {
    // A missing index row means "nothing to disagree with", never "indexed just now".
    expect(cacheRowRetired(row(ago(3 * day), null))).toBe(false);
  });

  it("refetches a retired page even inside the TTL, and stores the new one", async () => {
    upserts.length = 0;
    const fetch = answer(true);
    await resolveEdhrecData("00000000-0000-0000-0000-000000000001", "Atraxa, Praetors' Voice", row(ago(3 * day), ago(1 * day)));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(upserts).toHaveLength(1);
  });

  it("serves a current page from the cache without asking EDHREC", async () => {
    const fetch = answer(true);
    const result = await resolveEdhrecData("00000000-0000-0000-0000-000000000001", "Atraxa, Praetors' Voice", row(ago(1 * day), ago(3 * day)));
    expect(fetch).not.toHaveBeenCalled();
    expect(result.data).not.toBeNull();
  });

  it("answers with the page EDHREC just sent even when storing it fails, never the retired one", async () => {
    const fresh = { container: { json_dict: { cardlists: [{ tag: "newcards", cardviews: [{ name: "Fresh Card", inclusion: 9, potential_decks: 10 }] }] } } };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(fresh) })));
    stub.db.insert = () => { throw new Error("write failed"); };
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await resolveEdhrecData("00000000-0000-0000-0000-000000000001", "Atraxa, Praetors' Voice", row(ago(3 * day), ago(1 * day)));
    // Said out loud, because a write that keeps failing refetches on every read and is otherwise silent.
    expect(logged).toHaveBeenCalledWith("edhrec cache upsert failed", expect.any(Error));
    logged.mockRestore();
    expect(result.data).toEqual(parseEdhrecPayload(fresh));
    expect(result.data).not.toEqual(parseEdhrecPayload(row(ago(3 * day), null).payload));
  });

  // A 4xx with no body: the page probe (a HEAD) answers its own status.
  const answerStatus = (status: number, htmlStatus = 200) => {
    const fn = vi.fn((_url: string, init?: RequestInit) => {
      const s = init?.method === "HEAD" ? htmlStatus : status;
      return Promise.resolve({ status: s, ok: s >= 200 && s < 300 });
    });
    vi.stubGlobal("fetch", fn);
    return fn;
  };
  const retired = () => row(ago(3 * day), ago(1 * day));
  const expired = () => row(ago(31 * day), ago(40 * day));
  const id = "00000000-0000-0000-0000-000000000001";

  it("answers absent for a retired page EDHREC confirms is gone, rather than the older snapshot", async () => {
    answerStatus(404);
    expect((await resolveEdhrecData(id, "Atraxa, Praetors' Voice", retired())).data).toBeNull();
    answerStatus(403, 404);
    expect((await resolveEdhrecData(id, "Atraxa, Praetors' Voice", retired())).data).toBeNull();
  });

  it("keeps a retired page through a throttle, which confirms nothing", async () => {
    answerStatus(429);
    expect((await resolveEdhrecData(id, "Atraxa, Praetors' Voice", retired())).data).not.toBeNull();
    answerStatus(403, 200);
    expect((await resolveEdhrecData(id, "Atraxa, Praetors' Voice", retired())).data).not.toBeNull();
  });

  it("leaves a page that is only past its TTL as it was: a 404 still serves it", async () => {
    answerStatus(404);
    expect((await resolveEdhrecData(id, "Atraxa, Praetors' Voice", expired())).data).not.toBeNull();
  });

  it("still serves a retired page when EDHREC cannot be reached, rather than nothing", async () => {
    const fetch = answer(false);
    const result = await resolveEdhrecData("00000000-0000-0000-0000-000000000001", "Atraxa, Praetors' Voice", row(ago(3 * day), ago(1 * day)));
    // EDHREC was asked, so this answer is the fallback's, not an in-TTL serve of the cache.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: expect.anything(), unreachable: false });
    expect(result.data).not.toBeNull();
  });
});
