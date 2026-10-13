import { beforeEach, describe, it, expect, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import { carryCanonicalSlugs, freePool, loadFreePool, rankFree } from "./free-ranking";
import type { CommanderListItem } from "./recommend";
import type { PoolCard } from "./score";

const loadCollectionPool = vi.hoisted(() => vi.fn());
const loadAvailability = vi.hoisted(() => vi.fn());
vi.mock("./recommend", async (orig) => ({
  ...(await orig<typeof import("./recommend")>()),
  loadCollectionPool,
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability }));
// A spy rather than a stub: the free ranking reads NO live EDHREC page, and a test below asserts
// it, because canonical's cache read only feeds `roleCards`, which `toListItem` drops.
const readEdhrecCache = vi.hoisted(() => vi.fn(async () => new Map()));
vi.mock("../edhrec/client", () => ({ readEdhrecCache }));
// Ruling D: the score's synergy comes from the stored index, so the loader is
// mocked, and it is the only EDHREC-derived read the free ranking makes. ARMABLE rather than always empty — every
// case here used to take an empty map, which meant nothing verified that
// `rankFree` passes the support list through at all: dropping the lookup would
// have made every free Fit unmeasured with the whole suite still green.
const supportLists = vi.hoisted(() => ({
  value: new Map<string, { total: number | null; oracleIds: string[] }>(),
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
  loadSupportLists: async () => supportLists.value,
}));

const card = (oracleId: string): PoolCard => ({
  oracleId,
  name: oracleId,
  typeLine: "Instant",
  oracleText: null,
  keywords: [],
  colorIdentity: [],
  imageUri: null,
  artCropUri: null,
  manaCost: null,
});

// The free ranking scores the collection pool, which is read from off every
// decklist, so `free` really is `owned − hard` here. Fixtures for a deck's own
// list must set `free` explicitly instead.
const avail = (owned: number, hard: number) => ({
  owned,
  hard,
  soft: 0,
  free: owned - hard,
  claims: [],
});

describe("freePool", () => {
  it("drops a card with no free copies", () => {
    const pool = freePool([card("a"), card("b")], new Map([["a", avail(1, 1)]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["b"]);
  });

  it("keeps a card that still has a spare copy", () => {
    const pool = freePool([card("a")], new Map([["a", avail(4, 3)]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });

  // Soft claims are brews, and a brew is not sleeved. They must NOT reduce the pool.
  it("keeps a card an unfinished brew wants", () => {
    const pool = freePool([card("a")], new Map([["a", { ...avail(1, 0), soft: 1 }]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });

  it("drops an over-committed card", () => {
    const pool = freePool([card("a")], new Map([["a", avail(1, 3)]]));
    expect(pool).toEqual([]);
  });

  // A card absent from the map has no claim on it at all.
  it("keeps a card with no availability row", () => {
    const pool = freePool([card("a")], new Map());
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });
});

describe("carryCanonicalSlugs", () => {
  // Two commanders whose names produce the same slug base. finalizeRecommendations
  // would hand `kykar` to whichever ranks first and `kykar-2` to the other — so a
  // re-rank swaps their slugs, breaking every detail link and desynchronising the
  // two rank maps in the commanders list. Slugs must follow oracleId, not rank.
  const canonical = [
    { oracleId: "id-1", slug: "kykar" },
    { oracleId: "id-2", slug: "kykar-2" },
  ];

  it("keeps each commander's slug when the free ranking reverses their order", () => {
    const scored = [{ oracleId: "id-2" }, { oracleId: "id-1" }];
    expect(carryCanonicalSlugs(scored, canonical)).toEqual([
      { oracleId: "id-2", slug: "kykar-2" },
      { oracleId: "id-1", slug: "kykar" },
    ]);
  });

  it("drops a commander the canonical list has never seen, rather than inventing a slug", () => {
    const scored = [{ oracleId: "id-1" }, { oracleId: "id-unknown" }];
    expect(carryCanonicalSlugs(scored, canonical)).toEqual([{ oracleId: "id-1", slug: "kykar" }]);
  });
});

beforeEach(() => {
  supportLists.value = new Map();
});

describe("rankFree with preloaded reads", () => {
  const item = (oracleId: string): CommanderListItem => ({
    oracleId,
    slug: oracleId,
    name: oracleId,
    typeLine: "Legendary Creature",
    colorIdentity: [],
    colorPoolSize: 1,
    roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    edhrecOwnedCount: 0,
    edhrecTotal: 0,
    receipts: "",
    fitPool: 0,
    fitRoles: 0,
    fitSynergy: null,
    synergyState: "absent",
    score: 10,
    rankScore: 10,
    measurableTotal: 40,
    imageUri: null,
    artCropUri: null,
  });

  // The art and the printed name are the player's COPY, which is the same copy in either
  // mode — but this function rebuilds its rows out of the collection pool, whose art is
  // oracle-level. Carried from canonical for the same reason the slug and `synergyState`
  // are: without it `toFreeDelta` reports both as changed and the free flip repaints the
  // oracle art under the owned printing's name.
  it("carries canonical's art and printed name onto the free rows", async () => {
    const commander = { ...card("a"), typeLine: "Legendary Creature" };
    const canonical = {
      ...item("a"),
      imageUri: "owned.jpg",
      artCropUri: "owned-crop.jpg",
      printedName: "Freya, Queen of the Valkyries",
    };

    const out = await rankFree("user", [canonical], {
      collection: [commander, card("b")],
      availability: new Map([["b", avail(1, 1)]]),
    }, ENV_VIEW);

    expect(out.ok).toBe(true);
    expect(out.items[0].imageUri).toBe("owned.jpg");
    expect(out.items[0].artCropUri).toBe("owned-crop.jpg");
    expect(out.items[0].printedName).toBe("Freya, Queen of the Valkyries");
  });

  // Each buildable commander's cached EDHREC page is ~94KB, and nothing the free ranking returns
  // carries a figure out of it: `inclusionByName` only feeds `roleCards`, which `toListItem` drops.
  it("reads no live EDHREC page", async () => {
    readEdhrecCache.mockClear();
    const commander = { ...card("a"), typeLine: "Legendary Creature" };
    const out = await rankFree("user", [item("a")], {
      collection: [commander, card("b")],
      availability: new Map([["b", avail(1, 0)]]),
    }, ENV_VIEW);

    expect(out.items.map((i) => i.oracleId)).toEqual(["a"]);
    expect(readEdhrecCache).not.toHaveBeenCalled();
  });

  // The point of the parameter: `/commanders` has already made both reads for
  // the receipt clause, so the free path must not pay for them a second time.
  it("makes no reads of its own", async () => {
    const commander = { ...card("a"), typeLine: "Legendary Creature" };
    const out = await rankFree("user", [item("a")], {
      collection: [commander, card("b")],
      availability: new Map([["b", avail(1, 1)]]),
    }, ENV_VIEW);

    expect(out.ok).toBe(true);
    expect(out.items.map((i) => i.oracleId)).toEqual(["a"]);
    expect(loadCollectionPool).not.toHaveBeenCalled();
    expect(loadAvailability).not.toHaveBeenCalled();
  });
});

describe("loadFreePool", () => {
  it("returns the free slice of the collection", async () => {
    loadCollectionPool.mockResolvedValue({ collection: [card("a"), card("b")] });
    loadAvailability.mockResolvedValue(new Map([["a", avail(1, 1)]]));
    const pool = await loadFreePool("user-free-pool", ENV_VIEW);
    expect(pool!.map((c) => c.oracleId)).toEqual(["b"]);
  });

  // Null, not a throw and not the whole collection: the detail page reads this
  // to decide whether free mode is available at all, and a silent fallback to
  // the canonical pool would pair a canonical score with a free rank.
  it("returns null when the availability rollup will not read", async () => {
    loadCollectionPool.mockResolvedValue({ collection: [card("a")] });
    loadAvailability.mockRejectedValue(new Error("rollup down"));
    expect(await loadFreePool("user-rollup-down", ENV_VIEW)).toBeNull();
  });
  // Admin PR 6f-1: the claim model decides NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from the env it
  // is handed, and both this pool and the free ranking that loads it require that env (admin PR 7c-2).
  // The reader's env and the environment hold opposite values; identity is checked as a boolean.
  it("runs the claim model under the reader's switches, when loaded by the free ranking too", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    const READER = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    try {
      loadCollectionPool.mockResolvedValue({ collection: [card("a")] });
      loadAvailability.mockReset().mockResolvedValue(new Map());
      await loadFreePool("user-free-pool-env", READER);
      await rankFree("user-rank-free-env", [{ oracleId: "a", slug: "a" } as unknown as CommanderListItem], undefined, READER);
      expect(loadAvailability).toHaveBeenCalledTimes(2);
      expect(loadAvailability.mock.calls.every((c) => c[1]?.env === READER)).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

// The membership rule. Free mode ranks the free pool and LISTS FROM IT: a
// commander whose own card is sleeved into a finished deck is not a commander
// you can build today, and the mode that promises "free cards only" was the one
// surface still exempting it. The exemption is what made a commander sitting in
// another deck's 99 read as available here.
// Ruling D's wiring, which nothing verified while every case armed an empty
// support map: dropping the `support:` argument would leave every free Fit
// unmeasured — `fitSynergy` null, a 40-point ceiling — with the whole suite
// still green, because an empty map produces exactly that by design.
describe("rankFree reads the stored support list", () => {
  const item = (oracleId: string): CommanderListItem => ({
    oracleId, slug: oracleId, name: oracleId,
    typeLine: "Legendary Creature", colorIdentity: [],
    colorPoolSize: 1, roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    edhrecOwnedCount: 0, edhrecTotal: 0, receipts: "",
    fitPool: 0, fitRoles: 0, fitSynergy: null, synergyState: "absent",
    score: 10, rankScore: 10, measurableTotal: 40,
    imageUri: null, artCropUri: null,
  });

  it("scores synergy from it, and names the owned support cards", async () => {
    const commander = { ...card("cmd"), typeLine: "Legendary Creature" };
    const owned = card("sup");
    // Four listed, one of them owned and in the pool: 1/4 of a 60-point
    // segment is 15.
    supportLists.value = new Map([["cmd", { total: 4, oracleIds: ["sup", "x", "y", "z"] }]]);

    const out = await rankFree("user", [item("cmd")], {
      collection: [commander, owned],
      availability: new Map(),
    }, ENV_VIEW);

    expect(out.ok).toBe(true);
    const scored = out.items[0];
    expect(scored.edhrecTotal).toBe(4);
    expect(scored.edhrecOwnedCount).toBe(1);
    expect(scored.fitSynergy).toBe(15);
    expect(scored.measurableTotal).toBe(100);
  });

  // The contrast that makes the case above load-bearing: with no list, the
  // same commander and pool score out of 40 with a null synergy. That is what
  // every other case in this file was silently asserting.
  it("leaves synergy unmeasured when the index holds no list", async () => {
    const commander = { ...card("cmd"), typeLine: "Legendary Creature" };
    supportLists.value = new Map();

    const out = await rankFree("user", [item("cmd")], {
      collection: [commander, card("sup")],
      availability: new Map(),
    }, ENV_VIEW);

    const scored = out.items[0];
    expect(scored.fitSynergy).toBeNull();
    expect(scored.measurableTotal).toBe(40);
  });
});

describe("rankFree membership", () => {
  const legend = (oracleId: string): PoolCard => ({
    ...card(oracleId),
    typeLine: "Legendary Creature — Human",
  });
  const item = (oracleId: string) =>
    ({ oracleId, slug: oracleId, name: oracleId }) as unknown as CommanderListItem;

  it("drops a commander whose own card a committed deck has sleeved", async () => {
    const out = await rankFree("user", [item("sleeved"), item("spare")], {
      collection: [legend("sleeved"), legend("spare")],
      availability: new Map([["sleeved", avail(1, 1)]]),
    }, ENV_VIEW);

    expect(out.ok).toBe(true);
    expect(out.items.map((i) => i.oracleId)).toEqual(["spare"]);
  });

  it("keeps a commander that still has a spare copy", async () => {
    const out = await rankFree("user", [item("spare")], {
      collection: [legend("spare")],
      availability: new Map([["spare", avail(2, 1)]]),
    }, ENV_VIEW);
    expect(out.items.map((i) => i.oracleId)).toEqual(["spare"]);
  });

  // The asymmetry the two severities exist for, and the one the control's own
  // gloss promises: a brew is a list, not a stack of sleeves.
  it("keeps a commander only an unfinished brew lists", async () => {
    const out = await rankFree("user", [item("brewed")], {
      collection: [legend("brewed")],
      availability: new Map([["brewed", { ...avail(1, 0), soft: 1 }]]),
    }, ENV_VIEW);
    expect(out.items.map((i) => i.oracleId)).toEqual(["brewed"]);
  });

  it("keeps a commander with no availability row at all", async () => {
    const out = await rankFree("user", [item("unclaimed")], {
      collection: [legend("unclaimed")],
      availability: new Map(),
    }, ENV_VIEW);
    expect(out.items.map((i) => i.oracleId)).toEqual(["unclaimed"]);
  });

  // The guard this rule must not be folded into. "The collection no longer holds
  // this commander" is a divergence between two reads and still disables the
  // toggle; "it is sleeved" is the feature, and returns a shorter list with the
  // toggle live. Collapsing them would disable the control for the exact case it
  // now exists to show.
  it("still fails closed when canonical names a commander the collection lost", async () => {
    const out = await rankFree("user", [item("held"), item("gone")], {
      collection: [legend("held")],
      availability: new Map(),
    }, ENV_VIEW);

    expect(out.ok).toBe(false);
    expect(out.items).toEqual([]);
  });

  it("drops a sleeved commander on the path that loads its own pool", async () => {
    loadCollectionPool.mockResolvedValue({
      collection: [legend("sleeved"), legend("spare")],
    });
    loadAvailability.mockResolvedValue(new Map([["sleeved", avail(1, 1)]]));

    const out = await rankFree("user-own-reads", [item("sleeved"), item("spare")], undefined, ENV_VIEW);

    expect(out.ok).toBe(true);
    expect(out.items.map((i) => i.oracleId)).toEqual(["spare"]);
  });
});
