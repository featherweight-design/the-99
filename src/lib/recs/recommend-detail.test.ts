import { beforeEach, describe, expect, it, vi } from "vitest";

// Two queries, two shapes. `loadCollectionPool` ends at `.orderBy`,
// `loadPoolCard` at `.limit` — the mock returns a chain that answers both and
// hands back whichever array the test armed.
const pool = vi.hoisted(() => ({ collection: [] as unknown[], card: [] as unknown[] }));

vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ orderBy: () => Promise.resolve(pool.collection) }) }),
      }),
    }),
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(pool.card) }) }),
    }),
  },
}));

// Deck membership is its own query, tested in `decks/committed.test.ts`. What
// matters here is only that whatever it returns reaches the role cards.
const committed = vi.hoisted(() => ({ value: new Map<string, { id: string; name: string }>() }));
vi.mock("../decks/committed", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../decks/committed")>()),
  readCommittedDecks: () => Promise.resolve(committed.value),
}));

// The live read still happens — it supplies `inclusionByName` for the role
// chips and `synergyState` for the degraded note — but it no longer supplies
// the SCORE. Ruling D moved that to the stored index, so `support` is what
// these cases arm.
const edhrec = vi.hoisted(() => ({ reachable: true }));
vi.mock("../edhrec/client", () => ({
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({
    data: edhrec.reachable ? { topCards: [], inclusionByName: new Map<string, number>() } : null,
    unreachable: false,
  })),
}));

// The stored support list, keyed by commander oracle id. Armed per case; an
// empty map means no `commander_support` row, which `scoreCommander` reads as no
// synergy reading at all.
const support = vi.hoisted(() => ({
  lists: new Map<string, { total: number | null; oracleIds: string[] }>(),
}));
// The role-target read is its own module and not what these tests are about: every commander
// answers the flat targets, as one with nothing measured does.
vi.mock("../profile/role-targets", async () => {
  const { ROLE_TARGETS } = await vi.importActual<typeof import("./roles")>("./roles");
  return {
    loadRoleTargetsForCommanders: async (cs: { oracleId: string }[]) =>
      new Map(cs.map((c) => [c.oracleId, { of: "flat", targets: { ...ROLE_TARGETS } }])),
  };
});
vi.mock("../edhrec/support-read", () => ({
  loadSupportLists: vi.fn(async () => support.lists),
}));

import { scoreOneCommander } from "./recommend";
import type { PoolCard } from "./score";

const card = (over: Record<string, unknown>) => ({
  oracleId: "x", name: "X", typeLine: "Legendary Creature — Angel",
  oracleText: null, keywords: [], colorIdentity: ["W"], commanderLegal: true,
  imageUri: null, manaCost: "{3}{W}", ...over,
});

beforeEach(() => {
  pool.collection = [];
  pool.card = [];
  committed.value = new Map();
  edhrec.reachable = true;
  support.lists = new Map();
});

describe("scoreOneCommander", () => {
  it("scores a commander that is not in the collection", async () => {
    pool.collection = [card({ oracleId: "owned-1", name: "Owned" })];
    pool.card = [card({ oracleId: "unowned", name: "Atraxa, Praetors' Voice" })];

    // A distinct userId per case: `loadCollectionPool` is wrapped in `cache`,
    // which memoizes on that argument, so a shared id would let the first case's
    // collection answer the second one.
    const got = await scoreOneCommander("user-unowned", "unowned", "atraxa");
    expect(got).not.toBeNull();
    expect(got!.name).toBe("Atraxa, Praetors' Voice");
    // The one owned card is colour-legal and is not the commander, so the pool
    // is 1: nothing is subtracted for a commander that was never in it.
    expect(got!.colorPoolSize).toBe(1);
  });

  it("returns null for a commander-legal card that cannot be a commander", async () => {
    // Format legality is not commander candidacy: an Instant carries the first
    // and fails the second, and a crafted URL is the only way to ask for one.
    pool.card = [card({ oracleId: "bolt", name: "Lightning Bolt", typeLine: "Instant" })];
    expect(await scoreOneCommander("user-instant", "bolt", "lightning-bolt")).toBeNull();
  });

  // Marked here rather than in `scoreCommander`, so that both readers of this
  // function — the page and the coverage-retry action — get the mark.
  it("stamps each role card with the deck already holding it", async () => {
    pool.collection = [
      card({ oracleId: "sol", name: "Sol Ring", typeLine: "Artifact", oracleText: "Add {C}{C}." }),
      card({ oracleId: "signet", name: "Arcane Signet", typeLine: "Artifact", oracleText: "Add {C}." }),
    ];
    pool.card = [card({ oracleId: "unowned", name: "Atraxa, Praetors' Voice" })];
    committed.value = new Map([["sol", { id: "d1", name: "Krenko" }]]);

    const got = await scoreOneCommander("user-committed", "unowned", "atraxa");
    const byId = new Map(got!.roleCards.ramp.map((c) => [c.oracleId, c.committedTo]));
    expect(byId.get("sol")).toBe("Krenko");
    expect(byId.get("signet")).toBeNull();
  });

  it("still returns null for an oracle id that is in no table", async () => {
    expect(await scoreOneCommander("user-missing", "nonsense", "nonsense")).toBeNull();
  });
});

describe("scoreOneCommander with an explicit pool", () => {
  // The detail page's whole B2 fix: the list ranked this commander against the
  // free pool, so the page has to score it against the same one or the two
  // screens print different fits for the same card.
  it("scores against the pool it is handed, not the whole collection", async () => {
    pool.collection = [
      card({ oracleId: "sol", name: "Sol Ring", typeLine: "Artifact", oracleText: "Add {C}{C}." }),
      card({ oracleId: "signet", name: "Arcane Signet", typeLine: "Artifact", oracleText: "Add {C}." }),
    ];
    pool.card = [card({ oracleId: "unowned", name: "Atraxa, Praetors' Voice" })];

    const free = [pool.collection[0]] as PoolCard[];
    const got = await scoreOneCommander("user-pool", "unowned", "atraxa", free);
    expect(got!.colorPoolSize).toBe(1);
    expect(got!.roleCards.ramp.map((c) => c.oracleId)).toEqual(["sol"]);
  });

  // Candidacy is a fact about the card, not about what the player has sleeved.
  // A commander sitting in a deck is absent from the free pool, and looking it
  // up there would 404 a page the list just linked to.
  it("still finds a commander the pool excludes", async () => {
    pool.collection = [card({ oracleId: "cmd", name: "Atraxa, Praetors' Voice" })];
    const got = await scoreOneCommander("user-pool-excludes", "cmd", "atraxa", []);
    expect(got).not.toBeNull();
    expect(got!.colorPoolSize).toBe(0);
  });
});

describe("scoreOneCommander committed-support attribution", () => {
  // The committed clause is about ownership, not availability. In free mode the
  // scoring pool excludes exactly the cards a finished deck holds, so deriving
  // the clause from that pool would report that no deck holds any support at
  // all — while the synergy panel right below marks those same cards committed.
  it("names the deck even when the scoring pool leaves that deck's cards out", async () => {
    const sol = card({ oracleId: "sol", name: "Sol Ring", typeLine: "Artifact", oracleText: "Add {C}{C}." });
    const signet = card({ oracleId: "signet", name: "Arcane Signet", typeLine: "Artifact", oracleText: "Add {C}." });
    pool.collection = [sol, signet];
    pool.card = [card({ oracleId: "unowned", name: "Atraxa, Praetors' Voice" })];
    // The index resolved both names to ids when it was built, which is why the
    // overlap is an id intersection now rather than a name match.
    support.lists = new Map([
      ["unowned", { total: 2, oracleIds: ["sol", "signet"] }],
    ]);
    committed.value = new Map([
      ["sol", { id: "d1", name: "Krenko" }],
      ["signet", { id: "d1", name: "Krenko" }],
    ]);

    // Both support cards are sleeved, so the free pool holds neither.
    const got = await scoreOneCommander("user-committed-free", "unowned", "atraxa", []);
    expect(got!.committedSupport).toEqual({ count: 2, topDeck: "Krenko" });
    // The score still speaks for the pool it was given.
    expect(got!.edhrecOwnedCount).toBe(0);
  });
});
