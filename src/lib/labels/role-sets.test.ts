import { describe, expect, it } from "vitest";
import { jobRowsOf } from "../decks/job-tally";
import { fallbackRole, isDrawJob, isRampJob, LABEL_TARGET_ROLES, labelRoleSet, roleSetFingerprint, type LabelTargetRole } from "./role-sets";
import type { Job } from "./types";

const job = (space: "role" | "theme", kind: string, rest: Record<string, unknown> = {}) =>
  ({ space, kind, restrictedTo: null, affects: "self", rampKind: null, ...rest }) as unknown as Job;
const ramp = (rampKind: string, rest: Record<string, unknown> = {}) => job("role", "ramp", { rampKind, ...rest });

describe("labelRoleSet", () => {
  it("reads the four target roles off a nonland card's role jobs", () => {
    expect(labelRoleSet([job("role", "removal"), job("role", "draw")], "Instant")).toEqual(["draw", "removal"]);
  });

  it("counts a land toward none of them, even one labelled ramp", () => {
    expect(labelRoleSet([job("role", "ramp")], "Land")).toEqual([]);
  });

  it("reads a land-backed MDFC by its front face", () => {
    expect(labelRoleSet([job("role", "removal")], "Instant // Land")).toEqual(["removal"]);
  });

  it("does not count a counterspell as removal", () => {
    expect(labelRoleSet([job("role", "counterspell")], "Instant")).toEqual([]);
  });

  it("ignores a theme of the same name", () => {
    expect(labelRoleSet([job("theme", "ramp")], "Creature — Elf")).toEqual([]);
  });

  it("keeps a counterspell out of removal while a real removal job beside it still counts", () => {
    expect(labelRoleSet([job("role", "counterspell", { affects: "opponents" })], "Instant")).toEqual([]);
    expect(
      labelRoleSet([job("role", "counterspell"), job("role", "removal", { affects: "opponents" })], "Instant"),
    ).toEqual(["removal"]);
  });

  it("names only the four roles, never the strip's protection or finisher rows", () => {
    expect(labelRoleSet([job("role", "ramp"), job("theme", "protection"), job("theme", "finisher")], "Artifact")).toEqual(["ramp"]);
  });

  it("leaves a mana rock labelled land to the relabel (Ebony Fly)", () => {
    expect(labelRoleSet([job("role", "land")], "Artifact Creature — Insect")).toEqual([]);
  });

  // THE ONE ROLE RULE (role-targets follow-up 1 of #2705): every role job of the kind counts, as the
  // deck strip counts it (`jobRowsOf`). Each of these was dropped by the old text refinements.
  describe("counts every role job of the kind, as the strip does", () => {
    it("counts a draw job that points at opponents (Thought-Knot Seer)", () => {
      expect(labelRoleSet([job("role", "draw", { affects: "opponents" })], "Creature — Eldrazi")).toEqual(["draw"]);
    });

    it("counts a card whose draw is the opponent's in every role it names", () => {
      expect(
        labelRoleSet([job("role", "draw", { affects: "opponents" }), job("role", "removal", { affects: "opponents" })], "Instant"),
      ).toEqual(["draw", "removal"]);
    });

    it("counts a land fetched into the hand", () => {
      expect(labelRoleSet([ramp("fetchesLand")], "Sorcery")).toEqual(["ramp"]);
      expect(labelRoleSet([ramp("fetchesLand", { restrictedTo: "land" })], "Artifact")).toEqual(["ramp"]);
    });

    it("counts a discount on one type of spell, on the card itself, or on an ability", () => {
      expect(labelRoleSet([ramp("costReduction", { restrictedTo: "creature" })], "Artifact")).toEqual(["ramp"]);
      expect(labelRoleSet([ramp("costReduction")], "Creature")).toEqual(["ramp"]);
    });

    it("counts every mana maker", () => {
      for (const kind of ["tapsForMana", "makesTreasure", "burstMana", "extraLandDrop", "multiplies"]) {
        expect(labelRoleSet([ramp(kind)], "Artifact")).toEqual(["ramp"]);
      }
    });
  });
});

// The old refinements, kept as the BENCHMARKS' weights (mana velocity, card flow) and no longer the
// role rule. Pinned here so moving the role rule did not move a benchmark.
describe("isDrawJob (card flow's weight)", () => {
  it("does not count a draw job that points at opponents", () => {
    expect(isDrawJob(job("role", "draw", { affects: "opponents" }), null)).toBe(false);
  });

  it("counts a target-player draw the label calls an opponent's", () => {
    expect(isDrawJob(job("role", "draw", { affects: "opponents" }), "Target player draws two cards and loses 2 life.")).toBe(true);
  });

  it("counts a draw for self, for each player, and for no player", () => {
    for (const affects of ["self", "each", null]) expect(isDrawJob(job("role", "draw", { affects }), null)).toBe(true);
  });
});

describe("isRampJob (mana velocity's weight)", () => {
  const SCRYING = "Search your library for a Forest card, reveal it, put it into your hand, then shuffle.";
  const FARSEEK = "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle.";

  it("does not count a land fetched into the hand", () => {
    expect(isRampJob(ramp("fetchesLand"), SCRYING)).toBe(false);
    expect(isRampJob(ramp("fetchesLand", { restrictedTo: "land" }), SCRYING)).toBe(false);
  });

  it("does not take another effect's battlefield for the land's", () => {
    expect(isRampJob(ramp("fetchesLand"), `${SCRYING} Create two 1/1 tokens. Put a creature card from your hand onto the battlefield.`)).toBe(false);
  });

  it("counts a land fetched onto the battlefield", () => {
    expect(isRampJob(ramp("fetchesLand"), FARSEEK)).toBe(true);
  });

  it("trusts the label when the text is not known", () => {
    expect(isRampJob(ramp("fetchesLand"), undefined)).toBe(true);
    expect(isRampJob(ramp("costReduction"), null)).toBe(true);
  });

  it("does not count a discount on one type of the controller's spells", () => {
    expect(isRampJob(ramp("costReduction", { restrictedTo: "creature" }), "Creature spells you cast cost {1} less to cast.")).toBe(false);
  });

  it("does not count a discount on the card itself or on an ability", () => {
    expect(isRampJob(ramp("costReduction"), "This spell costs {X} less to cast, where X is the number of artifacts you control.")).toBe(false);
    expect(isRampJob(ramp("costReduction"), "This spell costs {1} less to cast for each spell you cast this turn.")).toBe(false);
    expect(isRampJob(ramp("costReduction"), "Abilities you activate cost {2} less to activate.")).toBe(false);
  });

  it("counts a discount on the controller's spells in general", () => {
    expect(isRampJob(ramp("costReduction"), "Spells you cast cost {1} less to cast.")).toBe(true);
    expect(isRampJob(ramp("costReduction"), "Noncreature spells you cast cost {1} less to cast.")).toBe(true);
    expect(isRampJob(ramp("costReduction"), "Spells cost {1} less to cast.")).toBe(true);
  });

  it("does not count a discount limited to a type chosen or imprinted at play", () => {
    expect(isRampJob(ramp("costReduction"), "As this enters, choose a card type. Spells of the chosen type you cast cost {1} less to cast.")).toBe(false);
    expect(isRampJob(ramp("costReduction"), "Imprint — When this enters, you may exile a nonland card from your hand. Spells you cast that share a card type with the exiled card cost {2} less to cast.")).toBe(false);
  });

  it("does not count a tax, an opponent's discount or an alternative cost", () => {
    for (const text of [
      "Spells you cast cost {1} more to cast.",
      "Spells your opponents cast cost {1} less to cast.",
      "You may pay {W}{U}{B}{R}{G} rather than pay the mana cost for spells you cast.",
    ]) {
      expect(isRampJob(ramp("costReduction"), text)).toBe(false);
    }
  });

  it("leaves mana makers alone", () => {
    for (const kind of ["tapsForMana", "makesTreasure", "burstMana", "extraLandDrop", "multiplies"]) {
      expect(isRampJob(ramp(kind), "x")).toBe(true);
    }
  });
});

describe("roleSetFingerprint", () => {
  const sets = new Map([["a", ["ramp" as const]], ["b", ["draw" as const, "removal" as const]]]);
  const none = new Map<string, LabelTargetRole | null>();

  it("does not depend on the order the cards or roles were read in", () => {
    const reordered = new Map([["b", ["removal" as const, "draw" as const]], ["a", ["ramp" as const]]]);
    expect(roleSetFingerprint(["b", "a", "a"], reordered, none)).toBe(roleSetFingerprint(["a", "b"], sets, none));
  });

  it("moves when a card's roles move under the same card", () => {
    const relabelled = new Map([["a", ["draw" as const]], ["b", ["draw" as const, "removal" as const]]]);
    expect(roleSetFingerprint(["a", "b"], relabelled, none)).not.toBe(roleSetFingerprint(["a", "b"], sets, none));
  });

  it("does not move on a relabel that changes only protection or finisher (the four roles alone)", () => {
    const before = new Map([["a", labelRoleSet([job("role", "ramp")], "Artifact")]]);
    const after = new Map([["a", labelRoleSet([job("role", "ramp"), job("theme", "protection"), job("theme", "finisher")], "Artifact")]]);
    expect(roleSetFingerprint(["a"], after, none)).toBe(roleSetFingerprint(["a"], before, none));
  });

  it("tells an unlabelled card from a labelled one doing none of the four", () => {
    expect(roleSetFingerprint(["a"], new Map(), none)).not.toBe(roleSetFingerprint(["a"], new Map([["a", []]]), none));
  });

  it("tells an unlabeled card counted as ramp from a labelled ramp card", () => {
    expect(roleSetFingerprint(["a"], new Map(), new Map([["a", "ramp"]]))).not.toBe(roleSetFingerprint(["a"], new Map([["a", ["ramp" as const]]]), none));
  });

  // The label targets count an unlabeled card by its fallback role, so the recorded digest must move
  // when card text moves that role, or a copy would vouch for targets counted from other text.
  it("moves when a text change moves an unlabeled card's fallback role", () => {
    const before = fallbackRole({ typeLine: "Sorcery", oracleText: "Draw two cards.", layout: "normal", keywords: [] });
    const after = fallbackRole({ typeLine: "Sorcery", oracleText: "Destroy target creature.", layout: "normal", keywords: [] });
    expect([before, after]).toEqual(["draw", "removal"]);
    expect(roleSetFingerprint(["a"], new Map(), new Map([["a", after]]))).not.toBe(roleSetFingerprint(["a"], new Map(), new Map([["a", before]])));
  });
});

describe("fallbackRole", () => {
  it("is the classifier's single first role, not every role the text reads", () => {
    expect(fallbackRole({ typeLine: "Instant", oracleText: "Destroy target creature. Draw a card.", layout: "normal", keywords: [] })).toBe("draw");
  });

  it("reads a modal card's front face", () => {
    expect(fallbackRole({ typeLine: "Instant // Land", oracleText: "Destroy target creature.\n//\n{T}: Add {G}.", layout: "modal_dfc", keywords: [] })).toBe("removal");
  });

  it("is null for a land and for a card the classifier gives no role", () => {
    expect(fallbackRole({ typeLine: "Land", oracleText: "{T}: Add {G}.", layout: "normal", keywords: [] })).toBeNull();
    expect(fallbackRole({ typeLine: "Creature — Bear", oracleText: null, layout: "normal", keywords: [] })).toBeNull();
  });
});

// `labelRoleSet` matches the four directly; it must name exactly the role rows the strip's `jobRowsOf` does.
describe("labelRoleSet and the strip's rows", () => {
  it("names the same four roles jobRowsOf does, for every job shape", () => {
    const shapes = [
      [job("role", "ramp")], [job("theme", "ramp")], [job("role", "draw"), job("role", "wipes")],
      [job("role", "removal"), job("theme", "protection")], [job("role", "counterspell")], [job("role", "land")],
      [job("theme", "finisher"), job("role", "draw", { affects: "opponents" })], [],
    ];
    for (const jobs of shapes) {
      expect(labelRoleSet(jobs, "Artifact")).toEqual(jobRowsOf(jobs).filter((r) => (LABEL_TARGET_ROLES as readonly string[]).includes(r)));
    }
  });
});
