import { describe, expect, it, vi } from "vitest";

// client.ts imports db at module level; stub it so the module loads in tests.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { fetchEdhrecUncached } from "./client";

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
