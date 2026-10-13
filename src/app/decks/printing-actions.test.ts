import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const DECK = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({
  texts: [] as string[],
  params: [] as unknown[][],
  /** Rows handed back per statement, matched by a fragment of its text. */
  answers: [] as { match: string; rows: unknown[] }[],
}));

const dialect = new PgDialect();
function render(q: unknown): { sql: string; params: unknown[] } {
  return dialect.sqlToQuery(q as SQL);
}

vi.mock("../../db", () => {
  const execute = async (q: unknown) => {
    const { sql, params } = render(q);
    state.texts.push(sql);
    state.params.push(params);
    const hit = state.answers.find((a) => sql.includes(a.match));
    return { rows: hit ? hit.rows : [] };
  };
  return { db: { execute, transaction: async (fn: (tx: unknown) => unknown) => fn({ execute }) } };
});
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ refresh }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/decks/read", () => ({ requireDeck: async () => ({ id: DECK }) }));

import { setDeckPrinting } from "./printing-actions";

beforeEach(() => {
  state.texts = [];
  state.params = [];
  state.answers = [];
  refresh.mockClear();
  process.env.DECK_PRINTINGS_ENABLED = "true";
});

describe("setDeckPrinting", () => {
  it("does nothing with the switch off", async () => {
    process.env.DECK_PRINTINGS_ENABLED = "";
    expect(await setDeckPrinting(DECK, CARD, { setCode: "KHM", collectorNumber: "31" }))
      .toEqual({ ok: false, reason: "off" });
    expect(state.texts).toEqual([]);
  });

  it("refuses malformed wire input without touching the database", async () => {
    for (const bad of [
      [DECK, "nope", { setCode: "KHM", collectorNumber: "31" }],
      [DECK, CARD, null],
      [DECK, CARD, { setCode: "K'HM", collectorNumber: "31" }],
      [DECK, CARD, { setCode: "KHM", collectorNumber: "31; drop" }],
      [DECK, CARD, { setCode: 4, collectorNumber: "31" }],
    ] as const) {
      expect(await setDeckPrinting(...(bad as unknown as Parameters<typeof setDeckPrinting>)))
        .toEqual({ ok: false, reason: "refused" });
    }
    expect(state.texts).toEqual([]);
  });

  it("refuses a card the deck does not hold, after taking the deck row's lock", async () => {
    const result = await setDeckPrinting(DECK, CARD, { setCode: "KHM", collectorNumber: "31" });
    expect(result).toEqual({ ok: false, reason: "notInDeck" });
    expect(refresh).not.toHaveBeenCalled();
    const lock = state.texts.findIndex((t) => t.includes("for update"));
    const member = state.texts.findIndex((t) => t.includes("deck_cards"));
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(member);
    expect(state.texts.some((t) => t.includes("deck_printings"))).toBe(false);
  });

  it("refuses a printing the player does not hold", async () => {
    state.answers = [{ match: "deck_cards", rows: [{ held: true }] }];
    const result = await setDeckPrinting(DECK, CARD, { setCode: "KHM", collectorNumber: "31" });
    expect(result).toEqual({ ok: false, reason: "notHeld" });
    expect(refresh).not.toHaveBeenCalled();
    expect(state.texts.some((t) => t.includes("insert into deck_printings"))).toBe(false);
  });

  it("accepts a collector number in the catalog's underscore form", async () => {
    state.answers = [
      { match: "deck_cards", rows: [{ held: true }] },
      { match: "collection_items", rows: [{ held: true }] },
    ];
    expect(await setDeckPrinting(DECK, CARD, { setCode: "PRM", collectorNumber: "a1_2007" }))
      .toEqual({ ok: true });
  });

  it("upserts the lowercase set code, answers ok and reads nothing back", async () => {
    state.answers = [
      { match: "deck_cards", rows: [{ held: true }] },
      { match: "collection_items", rows: [{ held: true }] },
    ];
    const result = await setDeckPrinting(DECK, CARD, { setCode: "KHM", collectorNumber: "31" });
    expect(result).toEqual({ ok: true });
    // The deck page re-renders with the pick: every row, the commanders and the prices at once.
    expect(refresh).toHaveBeenCalledTimes(1);
    const i = state.texts.findIndex((t) => t.includes("insert into deck_printings"));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(state.texts[i]).toContain("on conflict (deck_id, oracle_id) do update");
    expect(state.params[i]).toEqual([DECK, CARD, "khm", "31"]);
    // Nothing after the write: a read failing there would report a stored pick as refused.
    expect(state.texts.slice(i + 1)).toEqual([]);
    // The ownership check asks for the stored (lowercase) form too.
    const own = state.texts.findIndex((t) => t.includes("collection_items"));
    expect(state.params[own]).toContain("khm");
    // And it lowers the stored side, which older holdings carry uppercase.
    expect(state.texts[own]).toContain("lower(ci.set_code) =");
  });
});
