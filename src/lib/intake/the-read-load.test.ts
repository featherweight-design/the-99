import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: rows.rows })) } }));

const matched = vi.hoisted(() => ({ chips: [] as unknown[] }));
vi.mock("./match", () => ({ matchWords: () => ({ chips: matched.chips }) }));

import { db } from "../../db";
import { loadReadCards, loadReadDecks, READ_DECKS_MAX } from "./the-read-load";

describe("loadReadDecks", () => {
  it("shows the judgement at most READ_DECKS_MAX decks, so a big account cannot outgrow the priced ceiling", async () => {
    rows.rows = Array.from({ length: READ_DECKS_MAX + 10 }, (_, i) => ({ id: `c${i}`, name: `Commander ${String(i).padStart(3, "0")}`, partner: null, tags: [] }));
    const decks = await loadReadDecks("u");
    expect(decks).toHaveLength(READ_DECKS_MAX);
    expect(decks[0].commander).toBe("Commander 000");
  });

  it("reads two decks led by one commander as one", async () => {
    rows.rows = [{ id: "a", name: "Alpha", partner: null, tags: [] }, { id: "a", name: "Alpha", partner: null, tags: [] }];
    expect(await loadReadDecks("u")).toHaveLength(1);
  });
});

describe("loadReadCards", () => {
  const list = { keyOf: new Map([["cmd-a", 1], ["cmd-b", 2]]) } as never;
  const pool = new Set([1, 2]);
  const answer = (card: string) => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [{ id: card, text: "Draw a card." }] } as never)
      .mockResolvedValueOnce({ rows: [{ card, commander: "cmd-a" }, { card, commander: "cmd-b" }] } as never);
  };

  it("puts a tagged card first and marks it required, and a name only typed in the words is not", async () => {
    matched.chips = [{ kind: "card", oracleId: "typed", name: "Typed Card" }];
    answer("tagged");
    const cards = await loadReadCards("w", {} as never, list, pool, [{ oracleId: "tagged", name: "Tagged Card" }]);
    expect(cards.map((c) => [c.name, c.required])).toEqual([["Tagged Card", true], ["Typed Card", false]]);
    expect(cards[0].runBy).toEqual([1, 2]);
    expect(cards[0].eligible).toEqual([1, 2]);
    expect(cards[1].eligible).toBeUndefined();
  });

  it("reads a card both tagged and typed once, as the required one", async () => {
    matched.chips = [{ kind: "card", oracleId: "tagged", name: "Tagged Card" }];
    answer("tagged");
    const cards = await loadReadCards("w", {} as never, list, pool, [{ oracleId: "tagged", name: "Tagged Card" }]);
    expect(cards).toHaveLength(1);
    expect(cards[0].required).toBe(true);
  });
});
