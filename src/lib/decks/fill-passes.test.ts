import { describe, expect, it, vi } from "vitest";

// The module imports the db client for its transaction type, and that client
// throws at import without a live URL.
vi.mock("../../db", () => ({ db: {} }));

import {
  recordFillPass,
  summariseFillPasses,
  type DeckCardState,
  type FillPassMember,
  type FillPassRow,
} from "./fill-passes";

const at = (minutes: number) => new Date(Date.UTC(2026, 8, 8, 12, minutes));

const pass = (over: Partial<FillPassRow> & { id: string }): FillPassRow => ({
  kind: "top_off",
  ordinal: 1,
  openSlots: 31,
  createdAt: at(0),
  ...over,
});

const member = (passId: string, oracleId: string, quantity = 1): FillPassMember =>
  ({ passId, oracleId, quantity });

const live = (oracleId: string, quantity = 1): DeckCardState =>
  ({ oracleId, quantity, auto: true });

const kept = (oracleId: string, quantity = 1): DeckCardState =>
  ({ oracleId, quantity, auto: false });

describe("summariseFillPasses", () => {
  it("counts a pass whose every card is still the app's", () => {
    const [line] = summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "a"), member("p1", "b")],
      deckCards: [live("a"), live("b")],
    });
    expect(line).toMatchObject({ id: "p1", live: 2, kept: 0, removed: 0 });
    expect(line.liveCards).toEqual([{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }]);
  });

  it("moves a kept card out of live without any write to the pass", () => {
    const [line] = summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "a"), member("p1", "b")],
      deckCards: [live("a"), kept("b")],
    });
    expect(line).toMatchObject({ live: 1, kept: 1, removed: 0 });
    // The design's ruling stated as a count: `Undo these {n}` cannot reach a
    // card the player has claimed.
    expect(line.liveCards).toEqual([{ oracleId: "a", quantity: 1 }]);
  });

  it("counts a card that has left the deck as removed", () => {
    const [line] = summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "a"), member("p1", "b")],
      deckCards: [live("a")],
    });
    expect(line).toMatchObject({ live: 1, kept: 0, removed: 1 });
  });

  it("carries a stacked card's whole quantity through to the undo", () => {
    const [line] = summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "forest", 30)],
      deckCards: [live("forest", 30)],
    });
    expect(line).toMatchObject({ live: 30, kept: 0, removed: 0 });
    expect(line.liveCards).toEqual([{ oracleId: "forest", quantity: 30 }]);
  });

  it("holds only what the deck still has of a trimmed stack", () => {
    // The mana base placed 30 Forests and the player cut it to 24. Six are gone,
    // and `Undo these 24` is the only honest offer.
    const [line] = summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "forest", 30)],
      deckCards: [live("forest", 24)],
    });
    expect(line).toMatchObject({ live: 24, kept: 0, removed: 6 });
    expect(line.liveCards).toEqual([{ oracleId: "forest", quantity: 24 }]);
  });

  it("never claims copies the player added on top of a stack", () => {
    // The pass placed 8; the deck holds 12. The other four are the player's, and
    // an undo that took them would remove cards the app never placed.
    const [line] = summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "island", 8)],
      deckCards: [live("island", 12)],
    });
    expect(line).toMatchObject({ live: 8, kept: 0, removed: 0 });
    expect(line.liveCards).toEqual([{ oracleId: "island", quantity: 8 }]);
  });

  it("counts a stack the player has claimed as kept, not live", () => {
    expect(summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "swamp", 9)],
      deckCards: [kept("swamp", 9)],
    })).toMatchObject([{ id: "p1", live: 0, kept: 9, removed: 0 }]);
  });

  it("keeps a pass with no live cards, so the record stays whole", () => {
    expect(summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "a"), member("p1", "b")],
      deckCards: [kept("a")],
    })).toMatchObject([{ id: "p1", live: 0, kept: 1, removed: 1, liveCards: [] }]);
  });

  it("keeps a fully undone pass: every card gone, none live or kept", () => {
    expect(summariseFillPasses({
      passes: [pass({ id: "p1" })],
      members: [member("p1", "a"), member("p1", "b")],
      deckCards: [],
    })).toMatchObject([{ id: "p1", live: 0, kept: 0, removed: 2 }]);
  });

  it("leaves no pass live when Keep all clears the deck's auto flags", () => {
    expect(summariseFillPasses({
      passes: [pass({ id: "p1", createdAt: at(0) }), pass({ id: "p2", ordinal: 2, createdAt: at(5) })],
      members: [member("p1", "a"), member("p2", "b")],
      deckCards: [kept("a"), kept("b")],
    }).map((l) => [l.live, l.kept])).toEqual([[0, 1], [0, 1]]);
  });

  it("gives a re-placed card to the newest pass and leaves the older one reading removed", () => {
    // Pass 1 places a card, the player removes it, pass 3 places it again.
    const lines = summariseFillPasses({
      passes: [
        pass({ id: "p1", ordinal: 1, createdAt: at(0) }),
        pass({ id: "p3", ordinal: 3, createdAt: at(10) }),
      ],
      members: [member("p1", "shark"), member("p1", "a"), member("p3", "shark")],
      deckCards: [live("shark"), live("a")],
    });
    expect(lines.map((l) => l.id)).toEqual(["p1", "p3"]);
    expect(lines[0]).toMatchObject({ live: 1, removed: 1 });
    expect(lines[0].liveCards).toEqual([{ oracleId: "a", quantity: 1 }]);
    expect(lines[1]).toMatchObject({ live: 1, removed: 0 });
    expect(lines[1].liveCards).toEqual([{ oracleId: "shark", quantity: 1 }]);
  });

  it("returns lines oldest first, whatever order the passes arrive in", () => {
    const lines = summariseFillPasses({
      passes: [
        pass({ id: "seed", kind: "seed", createdAt: at(0) }),
        pass({ id: "p2", ordinal: 2, createdAt: at(20) }),
        pass({ id: "p1", ordinal: 1, createdAt: at(10) }),
      ],
      members: [member("seed", "s"), member("p1", "a"), member("p2", "b")],
      deckCards: [live("s"), live("a"), live("b")],
    });
    expect(lines.map((l) => l.id)).toEqual(["seed", "p1", "p2"]);
  });

  it("counts a trimmed stack as partly live and partly removed", () => {
    const [line] = summariseFillPasses({
      passes: [pass({ id: "seed", kind: "seed" })],
      members: [member("seed", "forest", 30)],
      deckCards: [live("forest", 24)],
    });
    // Six of the thirty left, and the line says so.
    expect(line).toMatchObject({ live: 24, kept: 0, removed: 6 });
  });

  it("never counts copies the player added on top of a stack the pass placed", () => {
    const [line] = summariseFillPasses({
      passes: [pass({ id: "seed", kind: "seed" })],
      members: [member("seed", "forest", 30)],
      deckCards: [live("forest", 34)],
    });
    // `Undo these 30` must not offer to take the four the player added.
    expect(line).toMatchObject({ live: 30, kept: 0, removed: 0 });
  });

  it("breaks a timestamp tie deterministically, whatever order the passes arrive in", () => {
    // Two passes of different kinds inside one millisecond, both ordinal 1: the
    // ordinal cannot separate them, and attribution decides what an undo deletes.
    const same = { createdAt: at(0), ordinal: 1 };
    const rows = { members: [member("s", "a"), member("t", "a")], deckCards: [live("a")] };
    const forward = summariseFillPasses({
      passes: [pass({ id: "s", kind: "seed", ...same }), pass({ id: "t", kind: "top_off", ...same })],
      ...rows,
    });
    const reversed = summariseFillPasses({
      passes: [pass({ id: "t", kind: "top_off", ...same }), pass({ id: "s", kind: "seed", ...same })],
      ...rows,
    });
    // The top-off owns it either way: a seed is older than any top-off.
    const owner = (ls: typeof forward) => ls.filter((l) => l.live > 0).map((l) => l.id);
    expect(owner(forward)).toEqual(["t"]);
    expect(owner(reversed)).toEqual(["t"]);
  });

  it("holds the invariant: the still-here figures sum to the deck's live auto copies", () => {
    const passes = [
      pass({ id: "seed", kind: "seed", createdAt: at(0) }),
      pass({ id: "p1", ordinal: 1, createdAt: at(10) }),
      pass({ id: "p2", ordinal: 2, createdAt: at(20) }),
    ];
    const members = [
      member("seed", "s1"), member("seed", "s2"), member("p1", "a"), member("p1", "b"),
      member("p1", "c"), member("p2", "d"),
    ];
    // s2 removed, a kept, b removed, d removed (p2 undone), c and s1 live.
    const deck = [live("s1"), kept("a"), live("c")];
    const lines = summariseFillPasses({ passes, members, deckCards: deck });
    const header = deck.filter((r) => r.auto).reduce((n, r) => n + r.quantity, 0);
    expect(lines.map((l) => l.id)).toEqual(["seed", "p1", "p2"]);
    expect(lines.reduce((n, l) => n + l.live, 0)).toBe(header);
  });

  it("holds the invariant: no auto rows leaves only quiet lines", () => {
    const passes = [
      pass({ id: "seed", kind: "seed", createdAt: at(0) }),
      pass({ id: "p1", createdAt: at(10) }),
    ];
    const members = [member("seed", "s"), member("p1", "a")];
    // The sweep deletes every auto row. Nothing is written to a pass; every line reads none still here.
    expect(summariseFillPasses({ passes, members, deckCards: [] }).every((l) => l.live === 0)).toBe(true);
  });
});

/** The transaction handle `recordFillPass` needs: the existing passes it reads
    to allocate an ordinal, and a record of what it inserted. */
function fakeTx(highest = 0) {
  const existing = [{ highest }];
  const inserts: { table: string; values: unknown }[] = [];
  const wheres: unknown[] = [];
  const tx = {
    select: () => ({ from: () => ({ where: async (w: unknown) => { wheres.push(w); return existing; } }) }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        const name = (table as Record<symbol, string>)[Symbol.for("drizzle:Name")];
        inserts.push({ table: name, values });
        return {
          returning: async () => [{ id: "pass-1" }],
          onConflictDoNothing: async () => {},
        };
      },
    }),
  };
  return { tx, inserts, wheres };
}

/** The column names a drizzle condition compares, dug out of its chunks. The
    ordinal read is scoped by kind as well as deck, and a fake tx that ignores
    its `where` cannot show that any other way. */
function columnsIn(condition: unknown): string[] {
  const names: string[] = [];
  // A column points back at its table, which points back at its columns, so an
  // unguarded walk never terminates.
  const seen = new Set<unknown>();
  const walk = (node: unknown) => {
    if (node == null || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    const record = node as Record<string, unknown>;
    if (typeof record.name === "string" && record.table != null) {
      // A column, not a container: its own table is not worth descending into.
      names.push(record.name);
      return;
    }
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };
  walk(condition);
  return names;
}

describe("recordFillPass", () => {
  const row = { oracleId: "a", quantity: 1 };

  it("allocates the first ordinal on a deck with no passes", async () => {
    const { tx, inserts } = fakeTx();
    const id = await recordFillPass(
      tx as never, { deckId: "d1", kind: "seed", openSlots: 99, rows: [row] },
    );
    expect(id).toBe("pass-1");
    expect(inserts.find((i) => i.table === "fill_passes")!.values)
      .toMatchObject({ deckId: "d1", kind: "seed", ordinal: 1, openSlots: 99 });
  });

  it("takes the next ordinal above the highest the deck has ever used", async () => {
    // Ordinals come from max(), not count(), so an undone pass — whose row
    // stays — never has its number handed out a second time.
    const { tx, inserts } = fakeTx(3);
    await recordFillPass(
      tx as never, { deckId: "d1", kind: "top_off", openSlots: 31, rows: [row] },
    );
    expect(inserts.find((i) => i.table === "fill_passes")!.values)
      .toMatchObject({ ordinal: 4 });
  });

  it("scopes the ordinal read by kind, so a deck's first top-off is top-off 1", async () => {
    // The unique constraint is (deck, kind, ordinal), and the label the ledger
    // renders is the ordinal. A deck-wide max would name the first top-off on a
    // seeded deck "top-off 2".
    const { tx, wheres } = fakeTx();
    await recordFillPass(
      tx as never, { deckId: "d1", kind: "top_off", openSlots: 31, rows: [row] },
    );
    expect(columnsIn(wheres[0])).toEqual(expect.arrayContaining(["deck_id", "kind"]));
  });

  it("records one member per oracle id, matching the deck the caller wrote", async () => {
    // `deck_cards` has the same primary key and the same on-conflict rule, so a
    // caller handing the same id twice put one row in the deck. The membership
    // says one too, at the quantity the deck holds.
    const { tx, inserts } = fakeTx();
    await recordFillPass(tx as never, {
      deckId: "d1",
      kind: "seed",
      openSlots: 99,
      rows: [{ oracleId: "a", quantity: 2 }, { oracleId: "a", quantity: 7 }],
    });
    expect(inserts.find((i) => i.table === "fill_pass_cards")!.values)
      .toEqual([{ passId: "pass-1", oracleId: "a", quantity: 2 }]);
  });

  it("writes nothing and returns null when the act placed no cards", async () => {
    const { tx, inserts } = fakeTx();
    expect(await recordFillPass(
      tx as never, { deckId: "d1", kind: "top_off", openSlots: 31, rows: [] },
    )).toBeNull();
    expect(inserts).toEqual([]);
  });
});
