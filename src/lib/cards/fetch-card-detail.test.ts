import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_DECK_SCOPE } from "../combos/deck-scope-param";
import { encodeCardDetail } from "./card-detail-wire";
import { fetchCardDetail } from "./fetch-card-detail";

const asked: string[] = [];
function answer(status: number, body: unknown, redirected = false, headers: Record<string, string> = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    asked.push(url);
    return { status, ok: status >= 200 && status < 300, redirected, headers: new Headers(headers), text: async () => encodeCardDetail(body) };
  }));
}
afterEach(() => { asked.length = 0; vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("fetchCardDetail", () => {
  it("sends a draft longer than any legal deck capped, so its cards still open", async () => {
    answer(200, { oracleId: "o-1" });
    const scope = Array.from({ length: MAX_DECK_SCOPE + 30 }, (_, i) => `id-${i}`);
    await fetchCardDetail("o-1", scope);
    const sent = new URL(asked[0], "http://x").searchParams.get("scope")!.split(",");
    expect(sent).toHaveLength(MAX_DECK_SCOPE);
    expect(sent[0]).toBe("id-0");
  });

  it("reads a 404 as a card that is not there, and a redirect or a failure as a failed read", async () => {
    answer(404, null);
    expect(await fetchCardDetail("o-1")).toBeNull();
    answer(200, "<html>", true);
    await expect(fetchCardDetail("o-1")).rejects.toThrow();
    answer(500, null);
    await expect(fetchCardDetail("o-1")).rejects.toThrow();
  });

  it("brings the card's Dates back as Dates", async () => {
    const asOf = new Date("2026-09-21T09:00:00.000Z");
    answer(200, { oracleId: "o-1", prices: { newestAsOf: asOf } });
    const card = await fetchCardDetail("o-1");
    expect((card as unknown as { prices: { newestAsOf: Date } }).prices.newestAsOf.getTime()).toBe(asOf.getTime());
  });

  it("holds the read-ahead off for a 429's Retry-After, asking nothing until the window ends", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
    answer(429, null, false, { "retry-after": "20" });
    await expect(fetchCardDetail("o-1")).rejects.toThrow();
    expect(asked).toHaveLength(1);
    asked.length = 0;
    answer(200, { oracleId: "o-1" });
    vi.setSystemTime(new Date("2026-11-11T12:00:19Z"));
    await expect(fetchCardDetail("o-1")).rejects.toThrow();
    expect(asked).toHaveLength(0);
    vi.setSystemTime(new Date("2026-11-11T12:00:21Z"));
    expect(await fetchCardDetail("o-1")).toEqual({ oracleId: "o-1" });
    expect(asked).toHaveLength(1);
  });
});
