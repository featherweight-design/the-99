import { describe, expect, it } from "vitest";
import { labelRoleSet, roleSetFingerprint } from "./role-sets";
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

  describe("draw", () => {
    it("does not count a draw job that points at opponents", () => {
      expect(labelRoleSet([job("role", "draw", { affects: "opponents" })], "Creature — Human")).toEqual([]);
    });

    it("counts a target-player draw the label calls an opponent's", () => {
      expect(
        labelRoleSet([job("role", "draw", { affects: "opponents" })], "Sorcery", "Target player draws two cards and loses 2 life."),
      ).toEqual(["draw"]);
    });

    it("counts a draw for self, for each player, and for no player", () => {
      for (const affects of ["self", "each", null]) {
        expect(labelRoleSet([job("role", "draw", { affects })], "Sorcery")).toEqual(["draw"]);
      }
    });

    it("keeps the other jobs of a card whose draw is the opponent's", () => {
      expect(
        labelRoleSet([job("role", "draw", { affects: "opponents" }), job("role", "removal", { affects: "opponents" })], "Instant"),
      ).toEqual(["removal"]);
    });
  });

  describe("ramp", () => {
    const SCRYING = "Search your library for a Forest card, reveal it, put it into your hand, then shuffle.";
    const FARSEEK = "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle.";

    it("does not count a land fetched into the hand", () => {
      expect(labelRoleSet([ramp("fetchesLand")], "Sorcery", SCRYING)).toEqual([]);
      expect(labelRoleSet([ramp("fetchesLand", { restrictedTo: "land" })], "Artifact", SCRYING)).toEqual([]);
    });

    it("counts a land fetched onto the battlefield", () => {
      expect(labelRoleSet([ramp("fetchesLand")], "Sorcery", FARSEEK)).toEqual(["ramp"]);
    });

    it("trusts the label when the text is not known", () => {
      expect(labelRoleSet([ramp("fetchesLand")], "Sorcery")).toEqual(["ramp"]);
      expect(labelRoleSet([ramp("costReduction")], "Artifact", null)).toEqual(["ramp"]);
    });

    it("does not count a discount on one type of the controller's spells", () => {
      expect(
        labelRoleSet([ramp("costReduction", { restrictedTo: "creature" })], "Artifact", "Creature spells you cast cost {1} less to cast."),
      ).toEqual([]);
    });

    it("does not count a discount on the card itself or on an ability", () => {
      expect(labelRoleSet([ramp("costReduction")], "Artifact Creature", "This spell costs {X} less to cast, where X is the number of artifacts you control.")).toEqual([]);
      expect(labelRoleSet([ramp("costReduction")], "Creature", "Abilities you activate cost {2} less to activate.")).toEqual([]);
    });

    it("counts a discount on the controller's spells in general", () => {
      expect(labelRoleSet([ramp("costReduction")], "Artifact", "Spells you cast cost {1} less to cast.")).toEqual(["ramp"]);
      expect(labelRoleSet([ramp("costReduction")], "Creature", "Noncreature spells you cast cost {1} less to cast.")).toEqual(["ramp"]);
    });

    it("keeps a card ramp when another of its ramp jobs qualifies", () => {
      expect(labelRoleSet([ramp("fetchesLand"), ramp("tapsForMana")], "Creature", SCRYING)).toEqual(["ramp"]);
    });

    it("leaves mana makers alone", () => {
      for (const kind of ["tapsForMana", "makesTreasure", "burstMana", "extraLandDrop", "multiplies"]) {
        expect(labelRoleSet([ramp(kind)], "Artifact", "x")).toEqual(["ramp"]);
      }
    });

    it("leaves a mana rock labelled land to the relabel (Ebony Fly)", () => {
      expect(labelRoleSet([job("role", "land")], "Artifact Creature — Insect")).toEqual([]);
    });
  });
});

describe("roleSetFingerprint", () => {
  const sets = new Map([["a", ["ramp" as const]], ["b", ["draw" as const, "removal" as const]]]);

  it("does not depend on the order the cards or roles were read in", () => {
    const reordered = new Map([["b", ["removal" as const, "draw" as const]], ["a", ["ramp" as const]]]);
    expect(roleSetFingerprint(["b", "a", "a"], reordered)).toBe(roleSetFingerprint(["a", "b"], sets));
  });

  it("moves when a card's roles move under the same card", () => {
    const relabelled = new Map([["a", ["draw" as const]], ["b", ["draw" as const, "removal" as const]]]);
    expect(roleSetFingerprint(["a", "b"], relabelled)).not.toBe(roleSetFingerprint(["a", "b"], sets));
  });

  it("tells an unlabelled card from a labelled one doing none of the four", () => {
    expect(roleSetFingerprint(["a"], new Map())).not.toBe(roleSetFingerprint(["a"], new Map([["a", []]])));
  });
});
