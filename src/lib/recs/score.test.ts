import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_THRESHOLDS,
  completeness,
  isCommanderCandidate,
  scoreCommander,
  type PoolCard,
} from "./score";

const card = (over: Partial<PoolCard>): PoolCard => ({
  oracleId: over.oracleId ?? randomUUID(),
  name: "X", typeLine: "Creature", oracleText: "", keywords: [], colorIdentity: [],
  imageUri: null, manaCost: null,
  ...over,
});

describe("isCommanderCandidate", () => {
  it("accepts legendary creatures", () => {
    expect(isCommanderCandidate({ typeLine: "Legendary Creature — Elf", oracleText: "" })).toBe(true);
  });
  it("accepts 'can be your commander' cards", () => {
    expect(isCommanderCandidate({
      typeLine: "Legendary Planeswalker — Teferi",
      oracleText: "Teferi, Temporal Archmage can be your commander.",
    })).toBe(true);
  });
  it("rejects ordinary cards", () => {
    expect(isCommanderCandidate({ typeLine: "Instant", oracleText: "Draw a card." })).toBe(false);
  });
  it("rejects a card whose back face is the legendary creature", () => {
    expect(isCommanderCandidate({
      typeLine: "Land // Legendary Creature — Demon",
      oracleText: "{T}: Add {C}.\n//\nFlying, haste",
    })).toBe(false);
  });
  it("accepts a double-faced card whose front face is the legendary creature", () => {
    expect(isCommanderCandidate({
      typeLine: "Legendary Creature — God // Legendary Creature — Bird",
      oracleText: "Alrund gets +1/+1.\n//\nFlying",
    })).toBe(true);
  });
  it("rejects a non-legendary werewolf transform card", () => {
    expect(isCommanderCandidate({
      typeLine: "Creature — Human Soldier Werewolf // Creature — Werewolf",
      oracleText: "When this enters, exile target creature.\n//\nTrample",
    })).toBe(false);
  });
  it("ignores 'can be your commander' printed on a back face", () => {
    expect(isCommanderCandidate({
      typeLine: "Land // Legendary Planeswalker — Nissa",
      oracleText: "{T}: Add {G}.\n//\nNissa can be your commander.",
    })).toBe(false);
  });
});

describe("scoreCommander", () => {
  const commander = card({
    name: "Golgari Guy",
    typeLine: "Legendary Creature",
    colorIdentity: ["B", "G"],
    imageUri: "https://cards.example/golgari.jpg",
  });
  const collection = [
    card({ name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}.", colorIdentity: [] }),
    card({ name: "Cultivate", typeLine: "Sorcery", oracleText: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.", colorIdentity: ["G"] }),
    card({ name: "Read the Bones", typeLine: "Sorcery", oracleText: "Draw two cards.", colorIdentity: ["B"] }),
    card({ name: "Lightning Bolt", typeLine: "Instant", oracleText: "Deals 3 damage to any target", colorIdentity: ["R"] }),
  ];

  it("counts only color-legal cards in the pool", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Cultivate"] });
    expect(s.colorPoolSize).toBe(3); // Bolt excluded
  });

  it("counts owned EDHREC top cards (color-legal only)", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Lightning Bolt", "Craterhoof Behemoth"] });
    expect(s.edhrecOwnedCount).toBe(1);
    expect(s.edhrecTotal).toBe(3);
  });

  it("reports role counts and gaps against targets", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.roleCounts).toEqual({ ramp: 2, draw: 1, removal: 0, wipes: 0 });
    expect(s.roleGaps).toEqual(["ramp", "draw", "removal", "wipes"]);
  });

  it("degrades: null edhrec fields but still scores by pool+roles", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.edhrecOwnedCount).toBeNull();
    expect(s.score).toBeGreaterThan(0);
  });

  it("treats an empty EDHREC top-cards list as no synergy data", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: [] });
    expect(s.edhrecTotal).toBeNull();
    expect(s.edhrecOwnedCount).toBeNull();
    expect(s.fitSynergy).toBeNull();
    expect(s.score).toBeGreaterThan(0);
  });

  it("ranks a commander with more EDHREC overlap higher, all else equal", () => {
    const low = scoreCommander({ commander, collection, edhrecTopCards: ["Craterhoof Behemoth"] });
    const high = scoreCommander({ commander, collection, edhrecTopCards: ["Sol Ring", "Cultivate", "Read the Bones"] });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("passes commander colorIdentity and imageUri through onto the score", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.colorIdentity).toEqual(["B", "G"]);
    expect(s.imageUri).toBe("https://cards.example/golgari.jpg");
  });

  // Task 2: roleCards
  it("roleCards.ramp contains a ramp card name", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    // Sol Ring and Cultivate are both ramp
    expect(s.roleCards.ramp).toContain("Sol Ring");
    expect(s.roleCards.ramp).toContain("Cultivate");
  });

  it("a wrath lands in roleCards.wipes not roleCards.removal", () => {
    const wrath = card({
      name: "Wrath of God",
      typeLine: "Sorcery",
      oracleText: "Destroy all creatures.",
      colorIdentity: ["W"],
    });
    const colWithWrath = [...collection, wrath];
    const commanderW = card({
      name: "Atraxa",
      typeLine: "Legendary Creature",
      colorIdentity: ["W", "U", "B", "G"],
    });
    const s = scoreCommander({ commander: commanderW, collection: colWithWrath, edhrecTopCards: null });
    expect(s.roleCards.wipes).toContain("Wrath of God");
    expect(s.roleCards.removal).not.toContain("Wrath of God");
  });

  // Task 2: overlapOwned / overlapMissing
  it("overlapOwned and overlapMissing preserve EDHREC casing and order", () => {
    // Sol Ring is in pool (colorIdentity []); Rhystic Study is not in collection
    const s = scoreCommander({
      commander,
      collection,
      edhrecTopCards: ["Sol Ring", "Rhystic Study"],
    });
    expect(s.overlapOwned).toEqual(["Sol Ring"]);
    expect(s.overlapMissing).toEqual(["Rhystic Study"]);
  });

  it("overlapOwned and overlapMissing are [] when edhrecTopCards is null", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.overlapOwned).toEqual([]);
    expect(s.overlapMissing).toEqual([]);
  });

  // Task 2: fitNS renormalization — no synergy
  it("fitSynergy is null when edhrecTopCards is null, score is renormalized", () => {
    const s = scoreCommander({ commander, collection, edhrecTopCards: null });
    expect(s.fitSynergy).toBeNull();
    expect(s.fitPool).toBeLessThanOrEqual(15);
    expect(s.fitRoles).toBeLessThanOrEqual(25);
    const expected = Math.round(((s.fitPool + s.fitRoles) / 40) * 100 * 10) / 10;
    expect(s.score).toBe(expected);
  });

  // Task 2: with synergy present
  it("score is sum of fit components when synergy is present", () => {
    const s = scoreCommander({
      commander,
      collection,
      edhrecTopCards: ["Sol Ring", "Cultivate", "Read the Bones"],
    });
    expect(s.fitSynergy).not.toBeNull();
    expect(s.fitPool).toBeLessThanOrEqual(15);
    expect(s.fitRoles).toBeLessThanOrEqual(25);
    expect(s.fitSynergy!).toBeLessThanOrEqual(60);
    const expected = Math.round((s.fitPool + s.fitRoles + s.fitSynergy!) * 10) / 10;
    expect(s.score).toBe(expected);
  });
});

describe("completeness", () => {
  it("rounds owned/total to a percentage", () => {
    expect(completeness({ edhrecOwnedCount: 96, edhrecTotal: 99 })).toBe(97);
    expect(completeness({ edhrecOwnedCount: 3, edhrecTotal: 4 })).toBe(75);
  });

  it("returns null when EDHREC data is missing", () => {
    expect(completeness({ edhrecOwnedCount: null, edhrecTotal: null })).toBeNull();
    expect(completeness({ edhrecOwnedCount: 5, edhrecTotal: null })).toBeNull();
    expect(completeness({ edhrecOwnedCount: null, edhrecTotal: 10 })).toBeNull();
  });

  it("returns null when total is zero", () => {
    expect(completeness({ edhrecOwnedCount: 0, edhrecTotal: 0 })).toBeNull();
  });

  it("exposes threshold constants matching the property-table progress-bar spec", () => {
    expect(COMPLETENESS_THRESHOLDS.high).toBe(90);
    expect(COMPLETENESS_THRESHOLDS.mid).toBe(75);
  });
});
