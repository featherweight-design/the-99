// The apply action's input guards (#277). A server action is callable directly,
// so passing through the diff proves nothing about the request that arrives
// here. What is tested is the one consequence that matters: a list that parsed
// to nothing plans every card in the deck as a removal, and the apply has to
// refuse it before the transaction rather than delete the deck.

import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const stub = vi.hoisted(() => {
  const state = {
    deck: [{ id: "deck-1", name: "Kykar, Wind's Fury", commanderOracleId: "o-kykar" }],
    rows: [
      { oracleId: "o-sol-ring", quantity: 1, auto: true, name: "Sol Ring", typeLine: "Artifact" },
      { oracleId: "o-island", quantity: 12, auto: true, name: "Island", typeLine: "Basic Land" },
    ],
    // Enough catalog for the real matcher to resolve the list the success-path
    // test pastes. `detailed: true` is what the apply asks for, so the type line
    // travels with each entry.
    catalog: [
      {
        oracleId: "o-sol-ring", scryfallId: "s-sol-ring", name: "Sol Ring",
        typeLine: "Artifact", oracleText: "", commanderLegal: true,
        colorIdentity: [], imageUri: null,
      },
      {
        oracleId: "o-island", scryfallId: "s-island", name: "Island",
        typeLine: "Basic Land — Island", oracleText: "", commanderLegal: true,
        colorIdentity: ["U"], imageUri: null,
      },
      // Scryfall's Jumpstart theme front named "Lands": in the catalog, and not a card.
      {
        oracleId: "o-lands-front", scryfallId: "s-lands-front", name: "Lands",
        typeLine: "Card", oracleText: "", commanderLegal: false,
        colorIdentity: [], imageUri: null, layout: "front_card",
      },
    ],
    transactions: 0,
    updates: [] as { table: string; values: unknown }[],
    // What the unclaim's UPDATE ... RETURNING hands back. One row by default:
    // the success-path list names cards the fill had placed.
    unclaimRows: [{ oracleId: "o-sol-ring" }] as { oracleId: string }[],
  };

  const nameOf = (table: unknown) =>
    (table as { [k: symbol]: string })[Symbol.for("drizzle:Name")] ?? "unknown";

  // Two shapes: the deck read is select().from().where(), the cards read adds an
  // innerJoin between them.
  const select = () => ({
    from: () => ({
      where: async () => state.deck,
      innerJoin: () => ({ where: async () => state.rows }),
    }),
  });

  // The apply path's writes. The success-path test pastes the list the deck
  // already holds, so nothing is deleted or inserted — but the unresolved rows
  // are replaced wholesale on every apply, and the named cards lose `auto`.
  const tx = {
    execute: async () => undefined,
    select,
    // Thenable and chainable: the unresolved-row delete reads back what it
    // cleared, because a deck with no lines to clear was not edited by the
    // statement running.
    delete: () => ({
      where: () => Object.assign(Promise.resolve([]), { returning: async () => [] }),
    }),
    // Thenable and chainable: the deck's stamp awaits the builder, while the
    // unclaim reads back the rows it changed — a list reapplied to a deck whose
    // cards are already the player's changes nothing and must not stamp.
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: () => {
          const name = nameOf(table);
          state.updates.push({ table: name, values });
          const rows = name === "deck_cards" ? state.unclaimRows : [];
          return Object.assign(Promise.resolve(rows), { returning: async () => rows });
        },
      }),
    }),
  };

  const db = {
    select,
    transaction: async (fn: (t: unknown) => Promise<unknown>) => {
      state.transactions += 1;
      return fn(tx);
    },
  };
  return { db, state, tx };
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, updateTag: () => {} }));
vi.mock("../../lib/collection/import", () => ({
  loadMatchInputs: async () => ({ catalog: stub.state.catalog, indexes: {} }),
}));

// The only stub on the success path. The question that test asks is which
// `versioned` comes back and whether the read that decides it ran inside the
// transaction, and the real reader would need a drizzle chain stub to answer
// either. Parsing and planning stay real, so the guard tests above keep proving
// what they were written to prove.
const newest = vi.hoisted(() => vi.fn());
vi.mock("../../lib/decks/versions", () => ({ newestVersion: newest }));

// Locked (never cut): off for every test but the ones that turn it on, with the deck's live locks
// handed back from here, so the apply's re-check can be driven without a database.
const locks = vi.hoisted(() => ({ on: false, live: new Set<string>() }));
vi.mock("../../lib/decks/never-cut-flag", () => ({ neverCutEnabled: () => locks.on }));
vi.mock("../../lib/decks/locks", async (orig) => ({
  ...(await orig<typeof import("../../lib/decks/locks")>()),
  liveLockedIds: async () => locks.live,
}));

const { updateDeckFromList } = await import("./update-actions");

beforeEach(() => {
  stub.state.transactions = 0;
  stub.state.updates.length = 0;
  stub.state.unclaimRows = [{ oracleId: "o-sol-ring" }];
  newest.mockReset();
  locks.on = false;
  locks.live = new Set();
});

/** Whether the apply stamped `decks.last_edited_at` — Home's resume order. */
const stamped = () => stub.state.updates.some((u) => u.table === "decks");

describe("updateDeckFromList input guards", () => {
  // Without this the plan is "everything comes out", and an empty `keep` deletes
  // all of it. The refusal copy promises the deck is exactly as it was, and a
  // request that never reaches the transaction is the strongest way to keep it.
  it("refuses a list with no lines, before opening a transaction", async () => {
    await expect(
      updateDeckFromList({ deckId: "deck-1", text: "   \n\n", source: "paste", keep: [] }),
    ).rejects.toThrow(/no lines/);
    expect(stub.state.transactions).toBe(0);
  });

  // A list whose every line failed to match is the same danger wearing a
  // different parse: `cards` is empty, so nothing in the deck is named.
  it("refuses a list where nothing matched", async () => {
    await expect(
      updateDeckFromList({
        deckId: "deck-1",
        text: "1 Nonesuch Card\n1 Also Not Real",
        source: "paste",
        keep: [],
      }),
    ).rejects.toThrow(/matched/);
    expect(stub.state.transactions).toBe(0);
  });

  // A CSV-shaped file with a bad row is refused before any deck read, exactly
  // like the two guards above — never silently applied with the rows that did parse.
  it("refuses a CSV-shaped file with a bad row, before opening a transaction", async () => {
    await expect(
      updateDeckFromList({
        deckId: "deck-1",
        text: "Name,Quantity\nSol Ring,1\nIsland,abc\n",
        source: "file",
        keep: [],
      }),
    ).rejects.toThrow('Row 3: invalid quantity "abc"');
    expect(stub.state.transactions).toBe(0);
  });

  // A section header resolved to the theme front of that name and was applied as a card.
  // It is not one: since bug batch 2026-10-12 a type header is skipped as a section header, so a
  // list of headers alone has no lines at all and changes nothing.
  it("does not match a 'Lands' header to the theme front of that name", async () => {
    await expect(
      updateDeckFromList({ deckId: "deck-1", text: "Lands\nCreatures", source: "paste", keep: [] }),
    ).rejects.toThrow(/no lines/);
    expect(stub.state.transactions).toBe(0);
  });
});

describe("updateDeckFromList and the deck's version", () => {
  const list = "1 Sol Ring\n12 Island";

  // The caller declines the transient arrival strip on a versioned deck, because
  // that deck's own pending account says the same thing one scroll below.
  it("reports a deck that has committed a version", async () => {
    newest.mockResolvedValue({ id: "v-1", number: 2 });
    const result = await updateDeckFromList({
      deckId: "deck-1", text: list, source: "paste", keep: [],
    });
    expect(result.versioned).toBe(true);
  });

  // The stamp follows the writes, not the act of applying. The deck here already
  // holds exactly what the list names, so nothing is deleted, inserted or
  // requantified and it has no unresolved lines to clear — an apply that changed
  // nothing must not tell Home the deck was edited. The `auto: false` sweep over
  // the named cards is the one write that does happen, and it is a real change
  // to the rows, so it stamps.
  it("stamps the deck when the apply unclaims the cards the list names", async () => {
    newest.mockResolvedValue(null);
    await updateDeckFromList({ deckId: "deck-1", text: list, source: "paste", keep: [] });
    expect(stamped()).toBe(true);
  });

  // The finding round 8 raised: a list reapplied to a deck whose cards are
  // already the player's rewrites nothing. The unclaim's UPDATE is narrowed to
  // rows still marked `auto`, so it matches none, and an unchanged deck must not
  // climb Home's list.
  it("does not stamp when the unclaim matches no row", async () => {
    newest.mockResolvedValue(null);
    stub.state.unclaimRows = [];
    await updateDeckFromList({ deckId: "deck-1", text: list, source: "paste", keep: [] });
    expect(stamped()).toBe(false);
  });

  it("reports a brew as unversioned", async () => {
    newest.mockResolvedValue(null);
    const result = await updateDeckFromList({
      deckId: "deck-1", text: list, source: "paste", keep: [],
    });
    expect(result.versioned).toBe(false);
  });

  // The read used to sit after the commit. A failure there rejected an action
  // whose rows were already written, so the player saw "your deck is exactly as
  // it was" over a deck that had changed — and a retry applied the list twice.
  it("reads the version inside the write transaction", async () => {
    newest.mockResolvedValue(null);
    await updateDeckFromList({ deckId: "deck-1", text: list, source: "paste", keep: [] });
    expect(newest).toHaveBeenCalledWith("deck-1", stub.tx);
  });

  // The other half of that invariant, and the half this code owns: the rollback
  // itself is Postgres's, but it only happens if the rejection leaves the
  // transaction callback instead of being caught and reported as a success. A
  // swallowed failure would answer `versioned: false` over a deck whose rows
  // were written and never rolled back.
  it("lets a failed version read reject the whole action", async () => {
    newest.mockRejectedValue(new Error("connection lost"));
    await expect(
      updateDeckFromList({ deckId: "deck-1", text: list, source: "paste", keep: [] }),
    ).rejects.toThrow(/connection lost/);
  });
});

// Hugh, 2026-10-15: a count the list lowers is copies coming out, and Keep on it holds the deck's
// own count. The apply re-plans from the text, so the kept id is the only thing that can stop the
// requantify; without it, twelve Islands become nine.
describe("updateDeckFromList and a kept count drop", () => {
  const lowered = "1 Sol Ring\n9 Island";
  const requantified = () =>
    stub.state.updates.filter(
      (u) => u.table === "deck_cards" && (u.values as { quantity?: number }).quantity !== undefined,
    );

  it("writes the lower count when the drop is not kept", async () => {
    newest.mockResolvedValue(null);
    await updateDeckFromList({ deckId: "deck-1", text: lowered, source: "paste", keep: [] });
    expect(requantified().map((u) => u.values)).toEqual([{ quantity: 9 }]);
  });

  it("leaves the deck's count when the drop is kept", async () => {
    newest.mockResolvedValue(null);
    await updateDeckFromList({
      deckId: "deck-1", text: lowered, source: "paste", keep: ["o-island"],
    });
    expect(requantified()).toEqual([]);
  });

  it("still writes a raised count whose id arrives in keep", async () => {
    newest.mockResolvedValue(null);
    await updateDeckFromList({
      deckId: "deck-1", text: "1 Sol Ring\n14 Island", source: "paste", keep: ["o-island"],
    });
    expect(requantified().map((u) => u.values)).toEqual([{ quantity: 14 }]);
  });
});

describe("updateDeckFromList's result and a count drop", () => {
  it("reports copies, with a drop's copies out", async () => {
    newest.mockResolvedValue(null);
    const result = await updateDeckFromList({
      deckId: "deck-1", text: "1 Sol Ring\n9 Island", source: "paste", keep: [],
    });
    expect(result).toMatchObject({ in: 0, out: 3, kept: 0 });
  });

  it("counts a kept drop as kept, and none of its copies out", async () => {
    newest.mockResolvedValue(null);
    const result = await updateDeckFromList({
      deckId: "deck-1", text: "1 Sol Ring\n9 Island", source: "paste", keep: ["o-island"],
    });
    expect(result).toMatchObject({ in: 0, out: 0, kept: 1 });
  });

  it("reports a rise's copies in", async () => {
    newest.mockResolvedValue(null);
    const result = await updateDeckFromList({
      deckId: "deck-1", text: "1 Sol Ring\n14 Island", source: "paste", keep: [],
    });
    expect(result).toMatchObject({ in: 2, out: 0 });
  });

  it("refuses a drop of a card locked after the preview", async () => {
    newest.mockResolvedValue(null);
    locks.on = true;
    locks.live = new Set(["o-island"]);
    await expect(
      updateDeckFromList({ deckId: "deck-1", text: "1 Sol Ring\n9 Island", source: "paste", keep: [] }),
    ).rejects.toThrow("a card was locked after the preview");
  });

  it("lets a drop through when the preview showed the lock", async () => {
    newest.mockResolvedValue(null);
    locks.on = true;
    locks.live = new Set(["o-island"]);
    await updateDeckFromList({
      deckId: "deck-1", text: "1 Sol Ring\n9 Island", source: "paste", keep: [],
      lockedSeen: ["o-island"],
    });
  });
});
