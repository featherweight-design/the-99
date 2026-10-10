import { describe, expect, it } from "vitest";

import {
  deriveRoleTargets,
  roleTargetsPublishable,
  type RoleDerivationRow,
} from "./role-targets";

const base = { keywords: [] as string[], layout: "normal" };
const ramp = { ...base, typeLine: "Artifact", oracleText: "{T}: Add {C}." };
const draw = { ...base, typeLine: "Sorcery", oracleText: "Draw three cards." };
const land = { ...base, typeLine: "Land", oracleText: "{T}: Add {G}." };

const row = (over: Partial<RoleDerivationRow> & { commanderOracleId: string; oracleId: string }) =>
  ({ inclusion: 100, ...ramp, ...over }) as RoleDerivationRow;

describe("deriveRoleTargets", () => {
  it("sums inclusion as a probability, not a count", () => {
    const out = deriveRoleTargets([
      row({ commanderOracleId: "c", oracleId: "a", inclusion: 50 }),
      row({ commanderOracleId: "c", oracleId: "b", inclusion: 25 }),
    ]);
    // 0.5 + 0.25 — the expected NUMBER of ramp cards, not the number of ramp cards listed.
    expect(out.get("c")!.ramp).toBeCloseTo(0.75);
  });

  // THE HEADLINE CASE. `oracle_text` holds both faces, so without `castFaceText` this card
  // classifies as ramp off its LAND BACK and inflates every ramp target.
  it("does not read a modal land's back face as ramp", () => {
    const out = deriveRoleTargets([
      row({
        commanderOracleId: "c", oracleId: "a",
        typeLine: "Sorcery // Land", layout: "modal_dfc",
        oracleText: "Deal 3 damage to any target.\n//\nEnters tapped. {T}: Add {R}.",
      }),
    ]);
    expect(out.get("c")!.ramp).toBe(0);
  });

  // A transform card is cast as its front face too. Scoping the split to modal_dfc alone would
  // leave 32 of the 82 land-backed cards still inflating the figure.
  it("does not read a transform card's back face as ramp", () => {
    const out = deriveRoleTargets([
      row({
        commanderOracleId: "c", oracleId: "a",
        typeLine: "Legendary Creature — God // Land", layout: "transform",
        oracleText: "Deals damage.\n//\n{T}: Add {R}.",
      }),
    ]);
    expect(out.get("c")!.ramp).toBe(0);
  });

  // A SPLIT card's halves are both castable, so neither may be dropped.
  it("still reads a split card's second half", () => {
    const out = deriveRoleTargets([
      row({
        commanderOracleId: "c", oracleId: "a",
        typeLine: "Instant // Instant", layout: "split",
        oracleText: "Deal 2 damage.\n//\nDraw a card.",
      }),
    ]);
    expect(out.get("c")!.draw).toBeCloseTo(1);
  });

  // Counting the calls, not the sums: a cacheless version returns identical per-commander
  // figures, so asserting those proves nothing about the memoisation this claims.
  it("classifies a card once however many commanders list it", () => {
    const seen: string[] = [];
    const out = deriveRoleTargets(
      [
        row({ commanderOracleId: "c1", oracleId: "a", ...draw, inclusion: 100 }),
        row({ commanderOracleId: "c2", oracleId: "a", ...draw, inclusion: 50 }),
      ],
      { onClassify: (id) => seen.push(id) },
    );
    expect(seen).toEqual(["a"]);
    expect(out.get("c1")!.draw).toBeCloseTo(1);
    expect(out.get("c2")!.draw).toBeCloseTo(0.5);
  });

  it("never counts a land as ramp", () => {
    const out = deriveRoleTargets([row({ commanderOracleId: "c", oracleId: "a", ...land })]);
    expect(out.get("c")!.ramp).toBe(0);
  });

  // A card counts toward EVERY role it satisfies — see the module header on why `planFill`
  // counts the same way while spending one slot.
  it("counts a card toward every role it satisfies", () => {
    const out = deriveRoleTargets([
      row({
        commanderOracleId: "c", oracleId: "a",
        typeLine: "Instant", oracleText: "Destroy target creature. Draw a card.",
      }),
    ]);
    expect(out.get("c")!.removal).toBeCloseTo(1);
    expect(out.get("c")!.draw).toBeCloseTo(1);
  });

  it("returns zero rather than absent for a role no listed card fills", () => {
    const out = deriveRoleTargets([row({ commanderOracleId: "c", oracleId: "a" })]);
    // 390 commanders measure a genuine 0 here. Absent and zero are different claims.
    expect(out.get("c")!.wipes).toBe(0);
  });

  it("ignores a non-finite or non-positive inclusion without dropping the commander", () => {
    const out = deriveRoleTargets([
      row({ commanderOracleId: "c", oracleId: "a", inclusion: Number.NaN }),
      row({ commanderOracleId: "c", oracleId: "b", inclusion: 0 }),
    ]);
    // The commander still has a row, with honest zeroes, rather than vanishing from the map.
    expect(out.get("c")).toEqual({ ramp: 0, draw: 0, removal: 0, wipes: 0 });
  });
});

describe("roleTargetsPublishable", () => {
  it("publishes a complete derivation", () => {
    expect(roleTargetsPublishable(3279, 3279)).toBe(true);
  });

  it("publishes at the floor and refuses just below it", () => {
    // The boundary itself, both sides. A floor asserted only far from its edge is a floor
    // nobody has checked.
    expect(roleTargetsPublishable(900, 1000)).toBe(true);
    expect(roleTargetsPublishable(899, 1000)).toBe(false);
  });

  it("refuses a badly partial run rather than publishing what it has", () => {
    // The state this exists for: a derivation that reached a tenth of the index leaves the
    // other nine tenths on stale figures, and no reader can tell the two apart.
    expect(roleTargetsPublishable(300, 3279)).toBe(false);
  });

  it("publishes against an empty index", () => {
    // An empty database is a first run, not a broken one. Refusing here would fail every
    // build until the index had content, which is the wrong way round.
    expect(roleTargetsPublishable(0, 0)).toBe(true);
  });
});

describe("a commander with no inclusion data anywhere", () => {
  const card = (oracleId: string, inclusion: number | null) => ({
    commanderOracleId: "cmd", oracleId, inclusion,
    typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.",
    keywords: [] as string[], layout: "normal",
  });

  // `toSupportRows` deliberately persists a card with no inclusion, so this is reachable from
  // real data. Coercing it to 0 made the commander indistinguishable from one measuring a
  // genuine zero: it published four zeroes AND counted toward the 90% coverage floor, so a
  // derivation that reached nothing could still claim to have reached everything.
  it("is dropped rather than published as four zeroes", () => {
    expect(deriveRoleTargets([card("a", null), card("b", null)]).has("cmd")).toBe(false);
  });

  // The counterpart, and the reason the entry is created before the inclusion check: 390
  // commanders measure a genuine 0 for wipes, and a figure that cannot tell "none" from "not
  // derived" is one nobody can read.
  it("but one usable row is enough to report a measured zero", () => {
    const t = deriveRoleTargets([
      card("a", null),
      { ...card("b", 50), oracleText: "Draw a card.", typeLine: "Instant" },
    ]);
    expect(t.get("cmd")?.wipes).toBe(0);
    expect(t.get("cmd")?.draw).toBeGreaterThan(0);
  });
});

describe("deriveRoleTargets from a handed-in role lookup (the label pass)", () => {
  it("counts each card by the lookup, not by its text", () => {
    const out = deriveRoleTargets(
      [row({ commanderOracleId: "c", oracleId: "a", ...draw }), row({ commanderOracleId: "c", oracleId: "b" })],
      { rolesOf: new Map([["a", ["ramp"]], ["b", ["draw", "removal"]]]) },
    );
    expect(out.get("c")).toEqual({ ramp: 1, draw: 1, removal: 1, wipes: 0 });
  });

  it("counts a card absent from the lookup toward no role, and still reports the commander", () => {
    const out = deriveRoleTargets([row({ commanderOracleId: "c", oracleId: "a" })], { rolesOf: new Map() });
    expect(out.get("c")).toEqual({ ramp: 0, draw: 0, removal: 0, wipes: 0 });
  });
});
