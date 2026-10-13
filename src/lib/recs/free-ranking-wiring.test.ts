// The pure halves of the free ranking are covered in free-ranking.test.ts. This
// file covers the wiring, because every defect this module actually produced
// lived there and not in the arithmetic: a second read of the decks table that
// could shrink the list, and a re-derived synergyState that could strip the
// Retry button during an EDHREC outage. Each test below pins one of those.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";
import type { CommanderListItem } from "./recommend";
import type { Availability } from "../decks/availability";

const collection = [
  { oracleId: "korvold", name: "Korvold, Fae-Cursed King" },
  { oracleId: "atraxa", name: "Atraxa, Praetors' Voice" },
  { oracleId: "sol-ring", name: "Sol Ring" },
].map((c) => ({
  ...c,
  typeLine: "Legendary Creature — Dragon",
  oracleText: null,
  keywords: [],
  colorIdentity: [] as string[],
  commanderLegal: true,
  imageUri: null,
  artCropUri: null,
  manaCost: "{2}",
}));

let availability: Map<string, Availability>;
let availabilityThrows = false;
const loadAvailability = vi.fn(async () => {
  if (availabilityThrows) throw new Error("deck read failed");
  return availability;
});

vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ orderBy: async () => collection }) }),
      }),
    }),
  },
}));
vi.mock("../decks/availability-query", () => ({
  loadAvailability: (...args: unknown[]) =>
    (loadAvailability as unknown as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("../edhrec/client", () => ({
  getEdhrecData: vi.fn(),
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({ data: null, unreachable: false })),
}));
// Ruling D: the stored index is where the score's synergy comes from now.
// The role-target read is its own module and not what these tests are about: every commander
// answers the flat targets, as one with nothing measured does.
// Flat by default. `measured` switches every commander to targets of 0, which meet every role,
// so a case can see the loaded figure reach the score rather than the flat constants.
const roleTargetMock = vi.hoisted(() => ({ measured: false }));
vi.mock("../profile/role-targets", async () => {
  const { ROLE_TARGETS } = await vi.importActual<typeof import("./roles")>("./roles");
  return {
    loadRoleTargetsForCommanders: async (cs: { oracleId: string }[]) =>
      new Map(cs.map((c) => [c.oracleId, roleTargetMock.measured
        ? { of: "commander", targets: { ramp: 0, draw: 0, removal: 0, wipes: 0 } }
        : { of: "flat", targets: { ...ROLE_TARGETS } }])),
  };
});
vi.mock("../edhrec/support-read", () => ({ loadSupportLists: async () => new Map() }));
// The label read, answered here: `fellBack` is the switch ON with the label read down.
const basisMock = vi.hoisted(() => ({ fellBack: false }));
vi.mock("./pool-role-basis", () => ({
  loadPoolRoleBasis: async () => ({ basis: "classifier", roleSets: undefined, fellBack: basisMock.fellBack }),
}));

const { rankFree } = await import("./free-ranking");

const item = (
  oracleId: string,
  over: Partial<CommanderListItem> = {},
): CommanderListItem => ({
  oracleId,
  slug: oracleId,
  name: oracleId,
  typeLine: "Legendary Creature",
  colorIdentity: [],
  colorPoolSize: 0,
  roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
  edhrecOwnedCount: null,
  edhrecTotal: null,
  fitPool: 0,
  fitRoles: 0,
  fitSynergy: null,
  synergyState: "absent",
  score: 0,
  rankScore: 0,
  measurableTotal: 40,
  imageUri: null,
  artCropUri: null,
  receipts: "",
  ...over,
});

describe("rankFree — wiring", () => {
  beforeEach(() => {
    availability = new Map();
    availabilityThrows = false;
    loadAvailability.mockClear();
  });

  it("ranks nothing, and reads nothing, when the canonical list is empty", async () => {
    const result = await rankFree("user-1", [], undefined, ENV_VIEW);
    expect(result).toEqual({ items: [], ok: true });
    // ok: true, not false — nothing failed. An empty list is not an outage, and
    // reporting it as one would disable a toggle that works fine.
    expect(loadAvailability).not.toHaveBeenCalled();
  });

  it("reports ok: false when the availability read fails", async () => {
    availabilityThrows = true;
    const result = await rankFree("user-1", [item("korvold")], undefined, ENV_VIEW);
    // The caller must disable the toggle on this. Serving the canonical scores
    // instead would tell the player nothing they own is committed.
    expect(result).toEqual({ items: [], ok: false });
  });

  // The round-3 defect: a second, later read of the decks table could drop a
  // commander canonical still lists, so flipping a control that promises only to
  // rescore would make a row vanish.
  it("scores free mode against the targets the reader loaded", async () => {
    const flat = await rankFree("user-flat-targets", [item("korvold")], undefined, ENV_VIEW);
    roleTargetMock.measured = true;
    try {
      const measured = await rankFree("user-measured-targets", [item("korvold")], undefined, ENV_VIEW);
      expect(flat.ok && measured.ok).toBe(true);
      expect(measured.items[0].fitRoles).toBeGreaterThan(flat.items[0].fitRoles);
    } finally {
      roleTargetMock.measured = false;
    }
  });

  // The canonical list may have been persisted under the labels basis. With the label read down
  // the free list would count by the classifier, so the toggle would draw two bases as one ranking.
  it("reports ok: false, not a classifier-counted ranking, when the label read fell back", async () => {
    basisMock.fellBack = true;
    try {
      expect(await rankFree("user-1", [item("korvold")], undefined, ENV_VIEW)).toEqual({ items: [], ok: false, labelFallback: true });
    } finally {
      basisMock.fellBack = false;
    }
  });

  it("returns exactly the canonical membership, never more and never less", async () => {
    const result = await rankFree("user-1", [item("korvold"), item("atraxa")], undefined, ENV_VIEW);
    expect(result.ok).toBe(true);
    expect(result.items.map((i) => i.oracleId).sort()).toEqual(["atraxa", "korvold"]);
  });

  it("ignores a collection card the canonical list does not name", async () => {
    const result = await rankFree("user-1", [item("korvold")], undefined, ENV_VIEW);
    // sol-ring is in the collection and canonical does not name it. Membership
    // comes from canonical alone, so it cannot appear however it is classified.
    expect(result.items.map((i) => i.oracleId)).toEqual(["korvold"]);
  });

  // The other half of the same guarantee: canonical cannot lose a row either.
  // Canonical may be served from scores persisted against an earlier collection
  // generation, so it can name a card the fresh pool read no longer holds.
  it("reports ok: false rather than dropping a canonical commander the pool lacks", async () => {
    const result = await rankFree("user-1", [item("korvold"), item("ghost")], undefined, ENV_VIEW);
    expect(result).toEqual({ items: [], ok: false });
    // Two reads that have already returned settle this, so the availability
    // rollup — the expensive one — is never issued.
    expect(loadAvailability).not.toHaveBeenCalled();
  });

  // The round-5 defect: recomputing synergyState from a bare cache read cannot
  // tell an outage apart from a commander EDHREC does not index, so a list built
  // during an outage lost its Retry button on flipping to free.
  it("carries a degraded synergy state rather than relabelling it absent", async () => {
    const result = await rankFree("user-1", [
      item("korvold", { synergyState: "degraded" }),
      item("atraxa", { synergyState: "absent" }),
    ], undefined, ENV_VIEW);
    const byId = new Map(result.items.map((i) => [i.oracleId, i.synergyState]));
    expect(byId.get("korvold")).toBe("degraded");
    expect(byId.get("atraxa")).toBe("absent");
  });

  it("scopes the availability read to the pool it is used against", async () => {
    await rankFree("user-1", [item("korvold")], undefined, ENV_VIEW);
    // Sorted before comparing: the pool's order comes from the collection query's
    // `orderBy(cards.oracleId)` and is not part of this contract. Which ids are
    // passed is the property under test; the sequence is incidental.
    const [userArg, opts] = loadAvailability.mock.calls[0] as unknown as [
      string,
      { oracleIds: string[] },
    ];
    expect(userArg).toBe("user-1");
    expect([...opts.oracleIds].sort()).toEqual(["atraxa", "korvold", "sol-ring"]);
  });
});
