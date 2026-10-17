import { SCAN_MODEL } from "../card-scan/match";
import { describe, expect, it, vi } from "vitest";
import { encodeEmbedding, LOOKUP_BACKOFF_MS, lookupCard, marginClears, scoredPrintings, SURE_MARGIN } from "./lookup";

const MODEL = SCAN_MODEL;
const emb = new Float32Array(256).fill(1 / 16);
const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const MATCH = { index: "all-20261014", guesses: [{ oracleId: "o1", name: "Sol Ring", scryfallId: "s1", score: 0.93 }, { oracleId: "o2", name: "Mana Crypt", scryfallId: "s2", score: 0.6 }], margin: 0.33 };

function deps(...replies: (ReturnType<typeof reply> | Error)[]) {
  const fetch = vi.fn();
  for (const r of replies) {
    if (r instanceof Error) fetch.mockRejectedValueOnce(r);
    else fetch.mockResolvedValueOnce(r);
  }
  return { fetch, wait: vi.fn().mockResolvedValue(undefined), onRetry: vi.fn() };
}

describe("encodeEmbedding", () => {
  it("is base64 of the values as little-endian float32, 1,024 bytes for 256 of them", () => {
    const b = Uint8Array.from(atob(encodeEmbedding(emb)), (c) => c.charCodeAt(0));
    expect(b.length).toBe(1024);
    expect(new DataView(b.buffer).getFloat32(4, true)).toBeCloseTo(1 / 16);
  });
});

describe("marginClears", () => {
  it("takes the top guess only when it clears the runner-up by the sure margin", () => {
    expect(marginClears(SURE_MARGIN)).toBe(true);
    expect(marginClears(SURE_MARGIN - 0.001)).toBe(false);
    expect(marginClears(0.05)).toBe(false);
    expect(marginClears(null)).toBe(true);
  });
});

describe("lookupCard", () => {
  it("sends the model and the embedding once, and reads the match", async () => {
    const d = deps(reply(200, MATCH));
    const out = await lookupCard(emb, MODEL, d);
    expect(d.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = d.fetch.mock.calls[0];
    expect(url).toBe("/api/card-scan/match");
    expect(JSON.parse(init.body)).toEqual({ model: MODEL, embedding: encodeEmbedding(emb) });
    // An answer from before guesses carried printings reads each as having none.
    expect(out).toEqual({ kind: "match", ...MATCH, guesses: MATCH.guesses.map((g) => ({ ...g, printings: [] })), sure: true });
  });

  it("calls a match under the margin unsure", async () => {
    const out = await lookupCard(emb, MODEL, deps(reply(200, { ...MATCH, margin: 0.005 })));
    expect(out.kind === "match" && out.sure).toBe(false);
  });

  it("retries a failure that may pass, saying so before each retry, and reads the answer that lands", async () => {
    const d = deps(new Error("offline"), reply(503), reply(200, MATCH));
    const out = await lookupCard(emb, MODEL, d);
    expect(out.kind).toBe("match");
    expect(d.onRetry.mock.calls).toEqual([[1], [2]]);
    expect(d.wait.mock.calls).toEqual(LOOKUP_BACKOFF_MS.map((ms) => [ms]));
  });

  it("says not ready, with no retry, when the server has no scan index yet", async () => {
    const d = deps(reply(503, { error: "no-index" }), reply(200, MATCH));
    expect(await lookupCard(emb, MODEL, d)).toEqual({ kind: "refused", reason: "notReady" });
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });

  it("gives up after its retries", async () => {
    const d = deps(reply(500), reply(500), reply(500), reply(200, MATCH));
    expect(await lookupCard(emb, MODEL, d)).toEqual({ kind: "failed" });
    expect(d.fetch).toHaveBeenCalledTimes(1 + LOOKUP_BACKOFF_MS.length);
  });

  it.each([[400, "badEmbedding"], [401, "signedOut"], [404, "off"], [409, "model"]] as const)(
    "never retries a %i (%s)", async (status, reason) => {
      const d = deps(reply(status));
      expect(await lookupCard(emb, MODEL, d)).toEqual({ kind: "refused", reason });
      expect(d.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("stops when the scan is abandoned", async () => {
    const ctl = new AbortController();
    const d = deps(reply(500));
    d.wait.mockImplementation(async () => ctl.abort());
    expect(await lookupCard(emb, MODEL, { ...d, signal: ctl.signal })).toEqual({ kind: "failed" });
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });
  it("reads a sign-in redirect, or a page that is not the route's JSON, as unavailable, and never retries it", async () => {
    const redirected = deps({ ok: true, status: 200, json: async () => ({ signIn: true }) } as never);
    expect(await lookupCard(emb, MODEL, redirected)).toEqual({ kind: "refused", reason: "unavailable" });
    const html = deps({ ok: true, status: 200, json: async () => { throw new Error("html"); } } as never);
    expect(await lookupCard(emb, MODEL, html)).toEqual({ kind: "refused", reason: "unavailable" });
    expect(redirected.fetch).toHaveBeenCalledTimes(1);
    expect(html.fetch).toHaveBeenCalledTimes(1);
  });
  it("reads the proxy's own 404 to a signed-out request (not JSON) as unavailable, and the route's JSON 404 as off", async () => {
    const proxy = deps({ ok: false, status: 404, json: async () => { throw new Error("html"); } } as never);
    expect(await lookupCard(emb, MODEL, proxy)).toEqual({ kind: "refused", reason: "unavailable" });
    expect(await lookupCard(emb, MODEL, deps(reply(404, null)))).toEqual({ kind: "refused", reason: "off" });
  });
});

describe("scoredPrintings", () => {
  it("keeps entries with a string id and a finite score, and reads anything else as none", () => {
    expect(scoredPrintings([{ scryfallId: "a", score: 0.9 }, { scryfallId: 3, score: 1 }, { scryfallId: "b", score: NaN }, null, { scryfallId: "c", score: 0.5 }]))
      .toEqual([{ scryfallId: "a", score: 0.9 }, { scryfallId: "c", score: 0.5 }]);
    expect(scoredPrintings(undefined)).toEqual([]);
    expect(scoredPrintings("x")).toEqual([]);
  });
});
