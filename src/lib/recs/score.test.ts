import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_THRESHOLDS,
  POOL_WEIGHT,
  ROLES_WEIGHT,
  SYNERGY_WEIGHT,
  completeness,
  isCommanderCandidate,
  isMeldResult,
  scoreCommander,
  type PoolCard,
} from "./score";
import type { SupportList } from "../edhrec/support-overlap";
import { ROLE_TARGETS } from "./roles";

/** Every card any fixture has made, so `support` can resolve a name to the id
    the index would have resolved it to. */
const madeCards: PoolCard[] = [];

const card = (over: Partial<PoolCard> & { oracleId?: string; name?: string }): PoolCard => {
  const made: PoolCard = {
    oracleId: over.oracleId ?? randomUUID(),
    name: "X", typeLine: "Creature", oracleText: "", keywords: [], colorIdentity: [],
    imageUri: null, artCropUri: null, manaCost: null,
    ...over,
  };
  madeCards.push(made);
  return made;
};

/**
 * The stored support list a set of EDHREC card names would produce.
 *
 * Mirrors `index-build.ts` exactly, which is the point: `total` counts the NAMES
 * upstream listed, while `oracleIds` holds only the ones the catalog could
 * resolve. A name no fixture card carries is therefore counted in the
 * denominator and absent from the overlap — the same deliberate under-count the
 * index ships, and the reason these cases still read the way they did when this
 * suite passed live `topCards`.
 */
const support = (names: string[] | null): SupportList | null =>
  names === null
    ? null
    : {
        total: names.length,
        oracleIds: names.flatMap((n) => {
          const hit = madeCards.find((c) => c.name === n);
          return hit ? [hit.oracleId] : [];
        }),
      };

// #712. Every card here is a real meld card, read off the catalog on 2026-09-24 with its
// layout, mana cost and type line as Scryfall gives them.
const meld = (name: string, manaCost: string | null, typeLine: string, oracleText = "") =>
  ({ name, layout: "meld", manaCost, typeLine, oracleText });
const MELD_RESULTS = [
  meld("Brisela, Voice of Nightmares", null, "Legendary Creature — Eldrazi Angel"),
  meld("Hanweir, the Writhing Township", null, "Legendary Creature — Eldrazi Ooze"),
  meld("Mishra, Lost to Phyrexia", null, "Legendary Artifact Creature — Phyrexian Artificer"),
  meld("Titania, Gaea Incarnate", null, "Legendary Creature — Elemental Avatar"),
  meld("Ragnarok, Divine Deliverance", null, "Legendary Creature — Beast Avatar"),
];
// A melded planeswalker. The front-face rule already refuses it — a planeswalker leads
// only by saying so, and this one does not — so it pins isMeldResult and nothing more.
const MELDED_PLANESWALKER = meld("Urza, Planeswalker", null, "Legendary Planeswalker — Urza");
const MELD_HALVES_THAT_LEAD = [
  meld("Bruna, the Fading Light", "{5}{W}{W}", "Legendary Creature — Angel Horror"),
  meld("Gisela, the Broken Blade", "{2}{W}{W}", "Legendary Creature — Angel Horror"),
  meld("Mishra, Claimed by Gix", "{2}{B}{R}", "Legendary Creature — Phyrexian Human Artificer"),
  meld("Urza, Lord Protector", "{1}{W}{U}", "Legendary Creature — Human Artificer"),
  meld("Titania, Voice of Gaea", "{1}{G}{G}", "Legendary Creature — Elemental"),
];

describe("meld results", () => {
  it.each(MELD_RESULTS)("never offers $name, a melded card, as a commander", (card) => {
    expect(isMeldResult(card)).toBe(true);
    expect(isCommanderCandidate(card)).toBe(false);
  });

  it("recognises a melded planeswalker as a meld result", () => {
    expect(isMeldResult(MELDED_PLANESWALKER)).toBe(true);
  });

  // The other half of the rule, and the reason it is not `layout === "meld"`: these are
  // meld cards too, and each one leads decks.
  it.each(MELD_HALVES_THAT_LEAD)("still offers $name, a meld half", (card) => {
    expect(isMeldResult(card)).toBe(false);
    expect(isCommanderCandidate(card)).toBe(true);
  });

  // A land half has no mana cost either. It is not a candidate on any rule, so this is
  // asserted on isMeldResult directly: through isCommanderCandidate the land clause
  // could be deleted and nothing would notice.
  it("does not call a land half a melded card", () => {
    expect(isMeldResult(meld("Hanweir Battlements", null, "Land"))).toBe(false);
    expect(isMeldResult(meld("Argoth, Sanctum of Nature", null, "Land"))).toBe(false);
  });

  it("treats an empty cost like a missing one", () => {
    expect(isMeldResult(meld("Brisela, Voice of Nightmares", "", "Legendary Creature — Eldrazi Angel"))).toBe(true);
  });
});

describe("isCommanderCandidate", () => {
  it("accepts legendary creatures", () => {
    expect(isCommanderCandidate({ layout: "normal", manaCost: "{1}", typeLine: "Legendary Creature — Elf", oracleText: "" })).toBe(true);
  });
  it("accepts 'can be your commander' cards", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Legendary Planeswalker — Teferi",
      oracleText: "Teferi, Temporal Archmage can be your commander.",
    })).toBe(true);
  });
  it("accepts a legendary Spacecraft", () => {
    // Hearthhull, the Worldseed. Its eligibility is printed nowhere in the text:
    // Station's reminder only says it becomes a creature at 8+.
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Legendary Artifact — Spacecraft",
      oracleText: "Station (Tap another creature you control: Put charge counters equal to its power on this Spacecraft.)",
    })).toBe(true);
  });
  it("accepts a legendary Vehicle that never becomes a creature on its own", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Legendary Artifact — Vehicle",
      oracleText: "Flying, vigilance\nCrew 3",
    })).toBe(true);
  });
  it("rejects a Vehicle that is not legendary", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Artifact — Vehicle",
      oracleText: "Crew 1",
    })).toBe(false);
  });
  it("rejects a card whose back face is the legendary Vehicle", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Artifact — Equipment // Legendary Artifact — Vehicle",
      oracleText: "Equipped creature gets +1/+0.\n//\nCrew 2",
    })).toBe(false);
  });
  it("rejects ordinary cards", () => {
    expect(isCommanderCandidate({ layout: "normal", manaCost: "{1}", typeLine: "Instant", oracleText: "Draw a card." })).toBe(false);
  });
  it("rejects a card whose back face is the legendary creature", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Land // Legendary Creature — Demon",
      oracleText: "{T}: Add {C}.\n//\nFlying, haste",
    })).toBe(false);
  });
  it("accepts a double-faced card whose front face is the legendary creature", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Legendary Creature — God // Legendary Creature — Bird",
      oracleText: "Alrund gets +1/+1.\n//\nFlying",
    })).toBe(true);
  });
  it("rejects a non-legendary werewolf transform card", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
      typeLine: "Creature — Human Soldier Werewolf // Creature — Werewolf",
      oracleText: "When this enters, exile target creature.\n//\nTrample",
    })).toBe(false);
  });
  it("ignores 'can be your commander' printed on a back face", () => {
    expect(isCommanderCandidate({
      layout: "normal",
      manaCost: "{1}",
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
    const s = scoreCommander({ commander, collection, support: support(["Sol Ring", "Cultivate"]), inclusionByName: null });
    expect(s.colorPoolSize).toBe(3); // Bolt excluded
  });

  it("counts owned stored support cards (color-legal only)", () => {
    const s = scoreCommander({ commander, collection, support: support(["Sol Ring", "Lightning Bolt", "Craterhoof Behemoth"]), inclusionByName: null });
    expect(s.edhrecOwnedCount).toBe(1);
    expect(s.edhrecTotal).toBe(3);
  });

  it("reports role counts and gaps against targets", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(s.roleCounts).toEqual({ ramp: 2, draw: 1, removal: 0, wipes: 0 });
    expect(s.roleGaps).toEqual(["ramp", "draw", "removal", "wipes"]);
  });

  it("degrades: null edhrec fields but still scores by pool+roles", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(s.edhrecOwnedCount).toBeNull();
    expect(s.score).toBeGreaterThan(0);
  });

  it("treats an empty stored support list as no synergy data", () => {
    const s = scoreCommander({ commander, collection, support: support([]), inclusionByName: null });
    expect(s.edhrecTotal).toBeNull();
    expect(s.edhrecOwnedCount).toBeNull();
    expect(s.fitSynergy).toBeNull();
    expect(s.score).toBeGreaterThan(0);
  });

  it("ranks a commander with more EDHREC overlap higher, all else equal", () => {
    const low = scoreCommander({ commander, collection, support: support(["Craterhoof Behemoth"]), inclusionByName: null });
    const high = scoreCommander({ commander, collection, support: support(["Sol Ring", "Cultivate", "Read the Bones"]), inclusionByName: null });
    expect(high.score).toBeGreaterThan(low.score);
  });

  // The hero's legend prints each segment over its own weight and the headline
  // has to be reachable by adding them. Tenths were invisible in the legend and
  // visible in the sum, so the segments are integers and the total is their sum
  // rather than its own rounding.
  it("segments are integers and add up to the printed score", () => {
    for (const topCards of [null, [], ["Sol Ring"], ["Sol Ring", "Cultivate", "Craterhoof Behemoth"]]) {
      const s = scoreCommander({ commander, collection, support: support(topCards), inclusionByName: null });
      expect(Number.isInteger(s.fitPool)).toBe(true);
      expect(Number.isInteger(s.fitRoles)).toBe(true);
      if (s.fitSynergy !== null) expect(Number.isInteger(s.fitSynergy)).toBe(true);
      expect(s.score).toBe(s.fitPool + s.fitRoles + (s.fitSynergy ?? 0));
    }
  });

  it("scores a commander EDHREC does not index out of pool and roles alone", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(s.fitSynergy).toBeNull();
    expect(s.measurableTotal).toBe(POOL_WEIGHT + ROLES_WEIGHT);
    expect(s.score).toBeLessThanOrEqual(s.measurableTotal);
  });

  it("scores a commander with a synergy read out of the full scale", () => {
    const s = scoreCommander({ commander, collection, support: support(["Sol Ring"]), inclusionByName: null });
    expect(s.measurableTotal).toBe(POOL_WEIGHT + ROLES_WEIGHT + SYNERGY_WEIGHT);
  });

  // THE LIST IS ORDERED BY THE FIGURE IT PRINTS. #385 took the rescale off the printed
  // score and left it on the rank, so that a commander would not be demoted for a gap in
  // OUR data. Because the weights are 15 + 25 + 60, that rescale reaches untracked
  // commanders and nobody else, multiplying them by 2.5 — so one took rank 1 with a
  // perfect 40/40 beside a note saying fit came from pool and roles alone. Ruled
  // 2026-09-16.
  it("ranks an unindexed commander by the score it prints", () => {
    const unindexed = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(unindexed.rankScore).toBe(unindexed.score);
    expect(unindexed.rankScore).toBeLessThanOrEqual(POOL_WEIGHT + ROLES_WEIGHT);
  });

  // An INVARIANCE, and it earns nothing on its own: for an indexed commander the two
  // figures were always equal, because the retired rescale divided by 100 there. It is
  // here to state that the field now has no formula of its own, so a future change that
  // gives it one has to break this as well as the case above.
  it("leaves an indexed commander's rank where its score is", () => {
    const indexed = scoreCommander({ commander, collection, support: support(["Sol Ring"]), inclusionByName: null });
    expect(indexed.rankScore).toBe(indexed.score);
  });

  // The defect as reported, and it needs the MAXED pool: on an ordinary fixture the rescale
  // lifts a small score to another small score, and the ceiling below passes over the broken
  // build. A commander that measures perfectly is the one the rescale sent to rank 1, which
  // is where it was found — 40/40, top of the list, under a note reading "EDHREC doesn't
  // track this commander".
  //
  // The ORDERING that follows from this ceiling is asserted in `recommend.test.ts`, beside
  // the comparator: importing it here would pull `recommend.ts` and the database client it
  // reaches at module load into a test file that otherwise touches neither.
  it("ranks no higher than pool and roles when it measured perfectly", () => {
    const role = (text: string, n: number) =>
      Array.from({ length: n }, () => card({ oracleText: text }));
    const maxed: PoolCard[] = [
      ...role("{t}: add {g}.", ROLE_TARGETS.ramp),
      ...role("Draw a card.", ROLE_TARGETS.draw),
      ...role("Destroy target creature.", ROLE_TARGETS.removal),
      ...role("Destroy all creatures.", ROLE_TARGETS.wipes),
    ];
    while (maxed.length < 200) maxed.push(card({}));

    const untracked = scoreCommander({ commander, collection: maxed, support: support(null), inclusionByName: null });
    expect(untracked.score).toBe(POOL_WEIGHT + ROLES_WEIGHT);
    // Under the rescale this read 100 — the highest rank the list can award, given to the
    // commander it knows least about.
    expect(untracked.rankScore).toBe(POOL_WEIGHT + ROLES_WEIGHT);
  });

  it("passes commander colorIdentity and imageUri through onto the score", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(s.colorIdentity).toEqual(["B", "G"]);
    expect(s.imageUri).toBe("https://cards.example/golgari.jpg");
  });

  // Task 2: roleCards
  it("roleCards.ramp contains a ramp card name", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    // Sol Ring and Cultivate are both ramp
    expect(s.roleCards.ramp.map((c) => c.name)).toContain("Sol Ring");
    expect(s.roleCards.ramp.map((c) => c.name)).toContain("Cultivate");
  });

  // The chips on the commander detail page open card detail, which takes an
  // oracle id and nothing else — a name-only role list cannot be clicked.
  it("carries each role card's oracle id alongside its name", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    const solRing = s.roleCards.ramp.find((c) => c.name === "Sol Ring");
    expect(solRing?.oracleId).toBe(
      collection.find((c) => c.name === "Sol Ring")!.oracleId,
    );
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
    const s = scoreCommander({ commander: commanderW, collection: colWithWrath, support: support(null), inclusionByName: null });
    expect(s.roleCards.wipes.map((c) => c.name)).toContain("Wrath of God");
    expect(s.roleCards.removal.map((c) => c.name)).not.toContain("Wrath of God");
  });

  // Task 2: overlapOwned.
  //
  // Retitled and rebuilt. It used to claim EDHREC casing, order and exclusion,
  // and after the source moved it measured none of the three: the `support`
  // helper drops a name no fixture card carries, so the exclusion happened in
  // the fixture rather than in the function; casing now comes from the pool
  // card; and one surviving element holds under any ordering.
  //
  // What it asserts instead is what the function now decides — which pool cards
  // a stored list names, IN THE LIST'S ORDER, since `overlapOwned` feeds
  // `receiptsPreview` and that prints the first three.
  it("overlapOwned holds the pool's support cards in the support list's order", () => {
    const s = scoreCommander({
      commander,
      collection,
      // Read the Bones and Cultivate are both in the pool, listed in that order;
      // Lightning Bolt is in the collection but outside the commander's
      // identity, so the pool excludes it and the overlap must too.
      support: support(["Read the Bones", "Cultivate", "Lightning Bolt"]),
      inclusionByName: null,
    });
    expect(s.overlapOwned).toEqual(["Read the Bones", "Cultivate"]);
    expect(s.edhrecOwnedCount).toBe(2);
    // The denominator still counts the name the pool excluded.
    expect(s.edhrecTotal).toBe(3);
    expect(s).not.toHaveProperty("overlapMissing");
  });

  it("overlapOwned is [] when there is no stored support list", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(s.overlapOwned).toEqual([]);
    expect(s).not.toHaveProperty("overlapMissing");
  });

  // #333: no synergy data is NOT rescaled back up to a 100-point denominator.
  it("fitSynergy is null with no stored support list, and the score is not rescaled", () => {
    const s = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    expect(s.fitSynergy).toBeNull();
    expect(s.fitPool).toBeLessThanOrEqual(15);
    expect(s.fitRoles).toBeLessThanOrEqual(25);
    const expected = Math.round((s.fitPool + s.fitRoles) * 10) / 10;
    expect(s.score).toBe(expected);
    expect(s.score).toBeLessThanOrEqual(40);
  });

  // The bug this fix exists for: a commander EDHREC does not track could print the
  // highest figure the UI can show. The pool below is built to hit every
  // ROLE_TARGETS figure exactly and to reach the 200 cards poolFactor saturates
  // at, so the pre-fix formula produced 100/100 and the post-fix one produces 40.
  it("caps a commander with no synergy data at 40 on a pool that maxes both components", () => {
    const role = (text: string, n: number) =>
      Array.from({ length: n }, () => card({ oracleText: text }));
    const maxed: PoolCard[] = [
      ...role("{t}: add {g}.", ROLE_TARGETS.ramp),
      ...role("Draw a card.", ROLE_TARGETS.draw),
      ...role("Destroy target creature.", ROLE_TARGETS.removal),
      ...role("Destroy all creatures.", ROLE_TARGETS.wipes),
    ];
    while (maxed.length < 200) maxed.push(card({}));

    const s = scoreCommander({ commander, collection: maxed, support: support(null), inclusionByName: null });
    expect(s.fitSynergy).toBeNull();
    expect(s.fitPool).toBe(15);
    expect(s.fitRoles).toBe(25);
    expect(s.score).toBe(40);
  });

  // The ranking consequence the issue's acceptance criteria asks for.
  it("ranks a measured commander above an unmeasured one with the same pool and roles", () => {
    const unmeasured = scoreCommander({ commander, collection, support: support(null), inclusionByName: null });
    const measured = scoreCommander({
      commander,
      collection,
      support: support(["Sol Ring", "Cultivate", "Read the Bones"]),
      inclusionByName: null,
    });
    expect(measured.score).toBeGreaterThan(unmeasured.score);
  });

  // Task 2: with synergy present
  it("score is sum of fit components when synergy is present", () => {
    const s = scoreCommander({
      commander,
      collection,
      support: support(["Sol Ring", "Cultivate", "Read the Bones"]),
      inclusionByName: null,
    });
    expect(s.fitSynergy).not.toBeNull();
    expect(s.fitPool).toBeLessThanOrEqual(15);
    expect(s.fitRoles).toBeLessThanOrEqual(25);
    expect(s.fitSynergy!).toBeLessThanOrEqual(60);
    const expected = Math.round((s.fitPool + s.fitRoles + s.fitSynergy!) * 10) / 10;
    expect(s.score).toBe(expected);
  });
});

describe("roleCards", () => {
  const rampA = card({ oracleId: "a", name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." });
  const rampB = card({ oracleId: "b", name: "Arcane Signet", typeLine: "Artifact", oracleText: "{T}: Add one mana of any color." });
  const rampC = card({ oracleId: "c", name: "Fellwar Stone", typeLine: "Artifact", oracleText: "{T}: Add one mana of any color." });

  const commander = card({
    oracleId: "00000000-0000-0000-0000-0000000000c0",
    name: "Commander", typeLine: "Legendary Creature — Human",
  });

  it("carries oracle id, name, and the EDHREC figure", () => {
    const s = scoreCommander({
      commander, collection: [rampA],
      support: support(null), inclusionByName: { "sol ring": 82 },
    });
    // `committedTo` is null out of scoring by design: the ranked list draws no
    // card rows, so it does not pay for the deck-membership query.
    expect(s.roleCards.ramp).toEqual([
      { oracleId: "a", name: "Sol Ring", inclusionPct: 82, committedTo: null, availability: null },
    ]);
  });

  it("orders by inclusion descending with absent figures last", () => {
    const s = scoreCommander({
      commander, collection: [rampB, rampA, rampC],
      support: support(null), inclusionByName: { "sol ring": 82, "arcane signet": 61 },
    });
    expect(s.roleCards.ramp.map((c) => c.name)).toEqual(["Sol Ring", "Arcane Signet", "Fellwar Stone"]);
  });

  it("reads a double-faced card's figure from its front face", () => {
    // Deliberately NOT a land back face: `classifyRoles` pushes `land` for any
    // type line containing "land" and gates `ramp` on the card not being a land,
    // so an "Instant // Land" DFC lands in no non-land role at all and this
    // assertion could never run.
    const dfc = card({
      oracleId: "d", name: "Jace, Vryn's Prodigy // Jace, Telepath Unbound",
      typeLine: "Legendary Creature — Human Wizard // Legendary Planeswalker — Jace",
      oracleText: "Draw a card, then discard a card.",
    });
    const s = scoreCommander({
      commander, collection: [dfc],
      support: support(null), inclusionByName: { "jace, vryn's prodigy": 44 },
    });
    expect(s.roleCards.draw[0]?.inclusionPct).toBe(44);
  });

  it("leaves every figure null when there is no inclusion map", () => {
    const s = scoreCommander({
      commander, collection: [rampA], support: support(null), inclusionByName: null,
    });
    expect(s.roleCards.ramp[0]?.inclusionPct).toBeNull();
  });

  it("keeps pool order when there is no inclusion map at all", () => {
    const s = scoreCommander({
      commander, collection: [rampC, rampA, rampB], support: support(null), inclusionByName: null,
    });
    expect(s.roleCards.ramp.map((c) => c.name))
      .toEqual(["Fellwar Stone", "Sol Ring", "Arcane Signet"]);
  });

  it("keeps pool order when the map is present but empty", () => {
    // parseEdhrecPayload always hands back an object, so an EDHREC response
    // carrying topCards and no inclusion numbers arrives as {}. Every figure is
    // null, and sorting would present the panel alphabetically as though the
    // order meant something.
    const s = scoreCommander({
      commander, collection: [rampC, rampA, rampB], support: support(null), inclusionByName: {},
    });
    expect(s.roleCards.ramp.map((c) => c.name))
      .toEqual(["Fellwar Stone", "Sol Ring", "Arcane Signet"]);
  });

  it("keeps pool order when the map holds no figure for any card in the pool", () => {
    const s = scoreCommander({
      commander, collection: [rampC, rampA, rampB],
      support: support(null), inclusionByName: { "some other card": 70 },
    });
    expect(s.roleCards.ramp.map((c) => c.name))
      .toEqual(["Fellwar Stone", "Sol Ring", "Arcane Signet"]);
  });

  // EDHREC's coverage is uneven, so one commander can have figures for its ramp
  // and none for its draw. Asking the question once across all panels would hand
  // the draw panel an alphabetical order it did not earn.
  it("keeps pool order in a panel with no figures even when another panel has them", () => {
    const drawA = card({
      oracleId: "z", name: "Zealous Persecution", typeLine: "Instant",
      oracleText: "Draw a card.",
    });
    const drawB = card({
      oracleId: "y", name: "Ancient Craving", typeLine: "Sorcery",
      oracleText: "Draw three cards.",
    });
    const s = scoreCommander({
      commander, collection: [rampC, rampA, drawA, drawB],
      support: support(null), inclusionByName: { "sol ring": 82 },
    });
    expect(s.roleCards.ramp.map((c) => c.name)).toEqual(["Sol Ring", "Fellwar Stone"]);
    expect(s.roleCards.draw.map((c) => c.name))
      .toEqual(["Zealous Persecution", "Ancient Craving"]);
  });

  it("breaks an inclusion tie on name so the order is stable", () => {
    const s = scoreCommander({
      commander, collection: [rampC, rampB],
      support: support(null), inclusionByName: { "arcane signet": 50, "fellwar stone": 50 },
    });
    expect(s.roleCards.ramp.map((c) => c.name)).toEqual(["Arcane Signet", "Fellwar Stone"]);
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
