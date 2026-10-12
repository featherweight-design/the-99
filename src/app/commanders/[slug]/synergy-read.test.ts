import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));
const committed = vi.hoisted(() => ({ value: new Map<string, { id: string; name: string }>() }));
const selected = vi.hoisted(() => ({ value: [] as Record<string, unknown>[] }));
const grouped = vi.hoisted(() => ({ value: [] as unknown[][] }));
/** Which table each select read FROM. The pair branch and the merged-singles branch differ
 *  in their source before they differ in anything a shaped row can show, so a test that only
 *  read the projection could not tell them apart. */
const sources = vi.hoisted(() => ({ value: [] as string[] }));
/** Rows the PAIR query resolves to, separately from the singles. One fixture for both would
 *  make every pair test short-circuit on the singles' rows and assert nothing. */
const pairRows = vi.hoisted(() => ({ value: null as unknown[] | null }));

// One chainable builder answers both queries this module builds: the ownership
// subquery, which ends at `.as`, and the outer select, which is awaited at
// `.groupBy`. The builder is thenable so the await resolves to the fixture rows.
vi.mock("../../../db", () => {
  const chain: Record<string, unknown> = {
    // The subquery's `.as` stands in for a Drizzle subquery, so it carries the
    // two columns the outer select reads off it. Returning a bare `{}` would
    // hand `undefined` to the join and the group-by, and the test would pass
    // without ever describing the query it claims to.
    as: () => ({ oracleId: "owned.oracle_id", qty: "owned.qty" }),
    then: (resolve: (value: unknown) => void) => resolve(rows.value),
  };
  for (const step of ["innerJoin", "leftJoin", "where"]) {
    chain[step] = () => chain;
  }
  // Drizzle tables carry their SQL name on a symbol; the mock reads the one property a test
  // can name instead, so a rename in schema.ts surfaces here rather than passing silently.
  chain.from = (table: unknown) => {
    // Drizzle keeps the SQL name on a symbol, `Symbol(drizzle:Name)`. Read it by description
    // rather than importing a private export, so this survives a Drizzle minor.
    const named = Object.getOwnPropertySymbols(table as object)
      .find((sym) => sym.description === "drizzle:Name");
    const name = named ? String((table as Record<symbol, unknown>)[named]) : String(table);
    sources.value.push(name);
    // The pair query is awaited at `.where`, the singles at `.groupBy`, so the pair branch
    // needs its own resolution rather than the shared `then` below.
    if (name === "commander_pair_support_cards" && pairRows.value !== null) {
      const pairChain: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) => resolve(pairRows.value),
      };
      for (const step of ["innerJoin", "leftJoin", "where"]) pairChain[step] = () => pairChain;
      return pairChain;
    }
    return chain;
  };
  // The group-by's arguments are captured for the same reason the projection is:
  // the image column has to be grouped exactly when it is selected, and those two
  // drifted apart once — the projection went opt-in while the group-by kept
  // naming the column, so the database read it either way.
  chain.groupBy = (...keys: unknown[]) => {
    grouped.value.push(keys);
    return chain;
  };
  // The projection is captured, so a test can ask WHICH columns were selected —
  // the one thing `withImages` changes, and a thing no shaped row can show.
  return {
    db: {
      select: (projection: Record<string, unknown>) => {
        selected.value.push(projection);
        return chain;
      },
    },
  };
});

// Deck membership has its own query and its own tests. Mocked here so this file
// keeps describing one shape of row rather than two.
vi.mock("../../../lib/decks/committed", () => ({
  readCommittedDecks: () => Promise.resolve(committed.value),
}));

import { readSynergyCards } from "./synergy-read";

beforeEach(() => {
  rows.value = [];
  committed.value = new Map();
  selected.value = [];
  grouped.value = [];
  sources.value = [];
  pairRows.value = null;
});

/** The outer select's projection — the second `db.select` this module makes. */
const projection = () => selected.value[selected.value.length - 1];
/** The outer select's group-by keys. */
const groupKeys = () => grouped.value[grouped.value.length - 1];

describe("readSynergyCards — the image column", () => {
  // This reader serves callers that draw a preview (the deck page, and the commander page's
  // synergy rows) and callers that never would, so the column is asked for rather than always
  // carried: at about 94 characters a row it is 25KB on an average commander and 40KB at the
  // widest, shipped across the RSC boundary to a caller that would never read it.
  //
  // Asserted on the PROJECTION, because that is the only place the difference
  // exists — a shaped row carries `imageUri` either way, from the stub.
  it("asks for the picture only when the caller wants it", async () => {
    await readSynergyCards("user", ["cmdr"], []);
    const withoutImages = projection();

    await readSynergyCards("user", ["cmdr"], [], true);
    const withImages = projection();

    expect(Object.keys(withoutImages)).toContain("imageUri");
    expect(Object.keys(withImages)).toContain("imageUri");
    // Both name the key — the row shape is one shape — and they differ in what
    // stands behind it: the catalog's column, or a literal null.
    expect(withImages.imageUri).not.toEqual(withoutImages.imageUri);
  });

  it("groups by the picture exactly when it selects it", async () => {
    // The two have to move together: Postgres requires an ungrouped selected
    // column to be aggregated, and naming an unselected one makes the database
    // read and hash a column nothing asked for — most of the work the opt-in
    // exists to avoid.
    await readSynergyCards("user", ["cmdr"], []);
    const withoutImages = groupKeys().length;

    await readSynergyCards("user", ["cmdr"], [], true);
    expect(groupKeys().length).toBe(withoutImages + 1);
  });

  it("carries the picture through to the shaped row", async () => {
    rows.value = [
      { oracleId: "a", name: "Sol Ring", typeLine: "Artifact", imageUri: "https://img/sol.jpg", inclusion: 80, synergy: 0.1, ownedQuantity: 1 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], [], true);
    expect(out[0].imageUri).toBe("https://img/sol.jpg");
  });

  it("reads a card the catalog has no picture for as no preview", async () => {
    rows.value = [
      { oracleId: "a", name: "Sol Ring", typeLine: "Artifact", imageUri: null, inclusion: 80, synergy: 0.1, ownedQuantity: 1 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], [], true);
    expect(out[0].imageUri).toBeNull();
  });
});

describe("readSynergyCards", () => {
  it("scales synergy's fraction into points and rounds inclusion, which is already a percent", async () => {
    rows.value = [
      { oracleId: "a", name: "Command Tower", typeLine: "Land", inclusion: 82.4, synergy: 0.01, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out[0].inclusionPct).toBe(82);
    expect(out[0].synergyPts).toBe(1);
  });

  it("keeps a null figure null rather than turning it into a zero", async () => {
    rows.value = [
      { oracleId: "a", name: "Nulls", typeLine: "Instant", inclusion: null, synergy: null, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out[0].inclusionPct).toBeNull();
    expect(out[0].synergyPts).toBeNull();
  });

  it("orders by synergy and applies the covered-role exclusion", async () => {
    rows.value = [
      { oracleId: "low", name: "Low", typeLine: "Instant", inclusion: 10, synergy: 0.05, ownedQuantity: 0 },
      { oracleId: "high", name: "High", typeLine: "Instant", inclusion: 10, synergy: 0.5, ownedQuantity: 0 },
      { oracleId: "covered", name: "Covered", typeLine: "Artifact", inclusion: 80, synergy: 0.9, ownedQuantity: 2 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], ["covered"]);
    expect(out.map((c) => c.oracleId)).toEqual(["high", "low"]);
  });

  it("reads ownership off the collection quantity", async () => {
    rows.value = [
      { oracleId: "a", name: "Owned", typeLine: "Land", inclusion: null, synergy: 0.2, ownedQuantity: 1 },
      { oracleId: "b", name: "Not", typeLine: "Land", inclusion: null, synergy: 0.1, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out.map((c) => c.owned)).toEqual([true, false]);
  });

  it("names the deck a card is already committed to, and null for the rest", async () => {
    rows.value = [
      { oracleId: "a", name: "Sol Ring", typeLine: "Artifact", inclusion: null, synergy: 0.2, ownedQuantity: 1 },
      { oracleId: "b", name: "Free", typeLine: "Artifact", inclusion: null, synergy: 0.1, ownedQuantity: 1 },
    ];
    committed.value = new Map([["a", { id: "d1", name: "Atraxa" }]]);
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out.map((c) => c.committedTo)).toEqual(["Atraxa", null]);
  });
});

describe("readSynergyCards — the pair's own list", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    oracleId: "c1", name: "Card One", typeLine: "Creature — Human", manaCost: "{1}{G}",
    imageUri: null, inclusion: 40, synergy: 0.5, ownedQuantity: 0, ...over,
  });

  it("reads the pair table for two commanders when a pair list is stored", async () => {
    pairRows.value = [row({ synergy: 0.9 })];
    rows.value = [row({ synergy: 0.1 })];

    const out = await readSynergyCards("u", ["a", "b"], []);

    expect(sources.value).toContain("commander_pair_support_cards");
    // The FIGURE, not just the table: reading the right table and then shaping the other
    // query's rows would pass a source assertion and ship the wrong ranking.
    expect(out[0].synergyPts).toBe(90);
  });

  it("falls back to the merged singles when no pair list is stored", async () => {
    // An empty pair list is a pair EDHREC has a header for and no cards under. The merged
    // singles are still a better answer than an empty panel.
    pairRows.value = [];
    rows.value = [row({ synergy: 0.1 })];

    const out = await readSynergyCards("u", ["a", "b"], []);

    expect(sources.value).toContain("commander_support_cards");
    expect(out[0].synergyPts).toBe(10);
  });

  it("never reads the pair table for a single commander", async () => {
    pairRows.value = [row({ synergy: 0.9 })];
    rows.value = [row({ synergy: 0.1 })];

    const out = await readSynergyCards("u", ["a"], []);

    expect(sources.value).not.toContain("commander_pair_support_cards");
    expect(out[0].synergyPts).toBe(10);
  });

});
