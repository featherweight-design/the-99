import { describe, expect, it, vi } from "vitest";

// Mock db before importing read to avoid DATABASE_URL at module init.
vi.mock("../../db", () => ({ db: {} }));
// The flags read, so `readNoteFlags`'s failure branch is reachable without a database.
vi.mock("../bracket/flags-read", () => ({ loadBracketFlags: vi.fn() }));

import {
  cardTypeGroup,
  deckIsFlippable,
  primaryRole,
  colorIdentityMask,
  poolCountFromMaskTally,
  countNoteKinds,
  readNoteFlags,
} from "./read";
import * as realFlagsRead from "../bracket/flags-read";

const flagsRead = realFlagsRead as unknown as { loadBracketFlags: ReturnType<typeof vi.fn> };
import { deckCounts, groupByCardType, groupByRole, unresolvedCardCount } from "./grouping";
import type { DeckDetailCard, DeckUnresolvedRow } from "./grouping";

// ---------------------------------------------------------------------------
// colorIdentityMask
// ---------------------------------------------------------------------------
describe("colorIdentityMask", () => {
  it("colorless (empty) → 0", () => expect(colorIdentityMask([])).toBe(0));
  it("W → 1", () => expect(colorIdentityMask(["W"])).toBe(1));
  it("U → 2", () => expect(colorIdentityMask(["U"])).toBe(2));
  it("B → 4", () => expect(colorIdentityMask(["B"])).toBe(4));
  it("R → 8", () => expect(colorIdentityMask(["R"])).toBe(8));
  it("G → 16", () => expect(colorIdentityMask(["G"])).toBe(16));
  it("WU (Azorius) → 3", () => expect(colorIdentityMask(["W", "U"])).toBe(3));
  it("WUBRG → 31", () => expect(colorIdentityMask(["W", "U", "B", "R", "G"])).toBe(31));
  it("order-independent: GW same as WG", () =>
    expect(colorIdentityMask(["G", "W"])).toBe(colorIdentityMask(["W", "G"])));
});

// ---------------------------------------------------------------------------
// poolCountFromMaskTally
// ---------------------------------------------------------------------------
describe("poolCountFromMaskTally", () => {
  it("empty tally → 0", () =>
    expect(poolCountFromMaskTally(new Map(), colorIdentityMask(["W", "U", "B", "R", "G"]))).toBe(0));

  it("colorless card (mask 0) fits every commander", () => {
    const tally = new Map([[0, 3]]);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W"]))).toBe(3);
  });

  it("W card fits WU commander but not U commander", () => {
    const tally = new Map([[colorIdentityMask(["W"]), 2]]);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "U"]))).toBe(2);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["U"]))).toBe(0);
  });

  it("all submasks of WUBRG are included", () => {
    const tally = new Map<number, number>();
    // 5 single-color cards, one each
    for (const c of ["W", "U", "B", "R", "G"]) tally.set(colorIdentityMask([c]), 1);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "U", "B", "R", "G"]))).toBe(5);
  });

  it("cards outside identity are excluded", () => {
    // R card should not fit a WU commander
    const tally = new Map([[colorIdentityMask(["R"]), 4]]);
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "U"]))).toBe(0);
  });

  it("sums multiple fitting buckets", () => {
    const tally = new Map([
      [colorIdentityMask(["W"]), 5],
      [colorIdentityMask(["B"]), 3],
      [colorIdentityMask(["W", "B"]), 2],
      [colorIdentityMask(["R"]), 7],   // does not fit WB
    ]);
    // WB commander: W(5) + B(3) + WB(2) = 10
    expect(poolCountFromMaskTally(tally, colorIdentityMask(["W", "B"]))).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Minimal card factory
// ---------------------------------------------------------------------------
function makeCard(
  overrides: Partial<DeckDetailCard> & { name: string; typeLine: string },
): DeckDetailCard {
  return {
    oracleId: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    cardTypeGroup: "Other",
    role: "other",
    cmc: 2,
    owned: true,
    quantity: 1,
    auto: false,
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    ...overrides,
  };
}

describe("cardTypeGroup", () => {
  it("puts DFC land // creature under Lands (lands read first)", () =>
    expect(cardTypeGroup("Land — Forest // Creature — Beast")).toBe("Lands"));
  it("Legendary Creature → Creatures", () =>
    expect(cardTypeGroup("Legendary Creature — Dragon")).toBe("Creatures"));
  it("Sorcery → Sorceries", () => expect(cardTypeGroup("Sorcery")).toBe("Sorceries"));
  it("Artifact Creature → Creatures (creature check before artifact)", () =>
    expect(cardTypeGroup("Artifact Creature — Golem")).toBe("Creatures"));
  it("unknown → Other", () => expect(cardTypeGroup("Tribal — Ally")).toBe("Other"));

  // One case per layout, each a real card: the front face decides, never the back.
  it("modal DFC: Shatterskull Smashing (Sorcery // Land) → Sorceries", () =>
    expect(cardTypeGroup("Sorcery // Land")).toBe("Sorceries"));
  it("transform: Tales of Master Seshiro → Enchantments", () =>
    expect(cardTypeGroup("Enchantment — Saga // Enchantment Creature — Snake Warrior")).toBe("Enchantments"));
  it("adventure: The Arkenstone // Seek the Heart → Artifacts", () =>
    expect(cardTypeGroup("Legendary Artifact // Sorcery — Adventure")).toBe("Artifacts"));
  it("omen: a creature front over a Sorcery back → Creatures", () =>
    expect(cardTypeGroup("Creature — Dragon // Sorcery — Omen")).toBe("Creatures"));
  it("split: Discovery // Dispersal files by the first-named half → Sorceries", () =>
    expect(cardTypeGroup("Sorcery // Instant")).toBe("Sorceries"));
  it("flip: Curse of the Fire Penguin → Enchantments", () =>
    expect(cardTypeGroup("Enchantment — Aura // Creature — Penguin")).toBe("Enchantments"));
  it("single face with no separator is unchanged", () =>
    expect(cardTypeGroup("Legendary Creature — Angel Horror")).toBe("Creatures"));
});

describe("primaryRole", () => {
  it("returns first classified role", () =>
    expect(primaryRole({ typeLine: "Sorcery", oracleText: "Destroy all creatures.", keywords: [] })).toBe("wipes"));
  it("returns 'other' when nothing classifies", () =>
    expect(primaryRole({ typeLine: "Creature — Bear", oracleText: "", keywords: [] })).toBe("other"));
});

// ---------------------------------------------------------------------------
// groupByCardType
// ---------------------------------------------------------------------------
describe("groupByCardType", () => {
  it("empty input returns empty array", () => {
    expect(groupByCardType([])).toEqual([]);
  });

  it("empty groups are omitted", () => {
    const cards = [makeCard({ name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands" })];
    const result = groupByCardType(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Lands"]);
    expect(labels).not.toContain("Creatures");
  });

  it("group order is stable regardless of input order", () => {
    const cards = [
      makeCard({ name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands" }),
      makeCard({ name: "Kodama", typeLine: "Sorcery", cardTypeGroup: "Sorceries" }),
      makeCard({ name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts" }),
      makeCard({ name: "Llanowar Elves", typeLine: "Creature — Elf", cardTypeGroup: "Creatures" }),
      makeCard({ name: "Rhystic Study", typeLine: "Enchantment", cardTypeGroup: "Enchantments" }),
      makeCard({ name: "Counterspell", typeLine: "Instant", cardTypeGroup: "Instants" }),
      makeCard({ name: "Weird Tribal", typeLine: "Tribal", cardTypeGroup: "Other" }),
      makeCard({ name: "Jace", typeLine: "Legendary Planeswalker — Jace", cardTypeGroup: "Planeswalkers" }),
    ];
    const result = groupByCardType(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Creatures", "Instants", "Sorceries", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other"]);
  });

  it("creature-artifact classifies as Creatures (cardTypeGroup flows through)", () => {
    // cardTypeGroup("Artifact Creature — Construct") → "Creatures" per existing tests
    const c = makeCard({ name: "Hangarback Walker", typeLine: "Artifact Creature — Construct", cardTypeGroup: "Creatures" });
    const result = groupByCardType([c]);
    expect(result[0][0]).toBe("Creatures");
    expect(result[0][1][0].name).toBe("Hangarback Walker");
  });

  it("within a group cards are sorted by name ASC", () => {
    const cards = [
      makeCard({ name: "Zephyr", typeLine: "Creature — Bird", cardTypeGroup: "Creatures" }),
      makeCard({ name: "Angel", typeLine: "Creature — Angel", cardTypeGroup: "Creatures" }),
      makeCard({ name: "Mentor", typeLine: "Creature — Human", cardTypeGroup: "Creatures" }),
    ];
    const result = groupByCardType(cards);
    const names = result[0][1].map((c) => c.name);
    expect(names).toEqual(["Angel", "Mentor", "Zephyr"]);
  });
});

// ---------------------------------------------------------------------------
// groupByRole
// ---------------------------------------------------------------------------
describe("groupByRole", () => {
  it("empty input returns empty array", () => {
    expect(groupByRole([])).toEqual([]);
  });

  it("empty groups are omitted", () => {
    const cards = [makeCard({ name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands", role: "land" })];
    const result = groupByRole(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Land"]);
    expect(labels).not.toContain("Ramp");
  });

  it("group order is stable regardless of input order", () => {
    const cards = [
      makeCard({ name: "Other Thing", typeLine: "Creature — Beast", cardTypeGroup: "Creatures", role: "other" }),
      makeCard({ name: "Wrath", typeLine: "Sorcery", cardTypeGroup: "Sorceries", role: "wipes" }),
      makeCard({ name: "Forest", typeLine: "Basic Land", cardTypeGroup: "Lands", role: "land" }),
      makeCard({ name: "Swords", typeLine: "Instant", cardTypeGroup: "Instants", role: "removal" }),
      makeCard({ name: "Brainstorm", typeLine: "Instant", cardTypeGroup: "Instants", role: "draw" }),
      makeCard({ name: "Cultivate", typeLine: "Sorcery", cardTypeGroup: "Sorceries", role: "ramp" }),
    ];
    const result = groupByRole(cards);
    const labels = result.map(([label]) => label);
    expect(labels).toEqual(["Ramp", "Draw", "Removal", "Wipes", "Land", "Threats & synergy"]);
  });

  it("card with role='other' lands in the Threats & synergy group", () => {
    const c = makeCard({ name: "Bear", typeLine: "Creature — Bear", cardTypeGroup: "Creatures", role: "other" });
    const result = groupByRole([c]);
    expect(result[0][0]).toBe("Threats & synergy");
    expect(result[0][1][0].name).toBe("Bear");
  });

  it("within a group cards are sorted by name ASC", () => {
    const cards = [
      makeCard({ name: "Zenith", typeLine: "Sorcery", cardTypeGroup: "Sorceries", role: "ramp" }),
      makeCard({ name: "Arcane Signet", typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp" }),
    ];
    const result = groupByRole(cards);
    const names = result[0][1].map((c) => c.name);
    expect(names).toEqual(["Arcane Signet", "Zenith"]);
  });
});

describe("deckCounts", () => {
  const card = (over: Partial<DeckDetailCard>): DeckDetailCard => ({
    oracleId: "o", name: "n", typeLine: "Artifact", cardTypeGroup: "Artifacts",
    role: "other", cmc: 2, owned: true, quantity: 1, auto: false,
    printedName: null, printedSetCode: null, printedCollectorNumber: null, ...over,
  });

  it("counts quantities, not rows", () => {
    expect(deckCounts([card({ quantity: 7 })]).built).toBe(7);
  });

  it("splits owned from to-buy by quantity", () => {
    const counts = deckCounts([
      card({ oracleId: "a", owned: true, quantity: 2 }),
      card({ oracleId: "b", owned: false, quantity: 3 }),
    ]);
    expect(counts).toEqual({
      built: 5, ownedCount: 2, coveredCount: 2, toBuyCount: 3, total: 5,
    });
  });

  it("is zeroed for an empty deck", () => {
    expect(deckCounts([])).toEqual({
      built: 0, ownedCount: 0, coveredCount: 0, toBuyCount: 0, total: 0,
    });
  });

  it("puts unresolved rows in total and in nothing else", () => {
    const cards = [
      card({ oracleId: "a", owned: true, quantity: 2 }),
      card({ oracleId: "b", owned: false, quantity: 3 }),
    ];
    const withRows = deckCounts(cards, 4);
    expect(withRows.total).toBe(9);
    const { built, ownedCount, toBuyCount } = deckCounts(cards);
    expect(withRows).toMatchObject({ built, ownedCount, toBuyCount });
  });

  it("reports a deck of nothing but unresolved rows as built 0 with a non-zero total", () => {
    expect(deckCounts([], 3)).toEqual({
      built: 0, ownedCount: 0, coveredCount: 0, toBuyCount: 0, total: 3,
    });
  });
});

describe("unresolvedCardCount", () => {
  const row = (quantity: number): DeckUnresolvedRow => ({
    id: `r-${quantity}`, rawName: "Lightning Bolt", quantity, sourceLine: 1,
  });

  it("counts copies, not lines", () => {
    expect(unresolvedCardCount([row(4), row(1)])).toBe(5);
  });

  it("is zero with no rows", () => {
    expect(unresolvedCardCount([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deckIsFlippable
// ---------------------------------------------------------------------------
describe("deckIsFlippable", () => {
  it("flips a single-commander deck at 99", () => {
    expect(
      deckIsFlippable({ built: 99, partnerName: null, ownedCount: 99, unresolvedCount: 0 }),
    ).toBe(true);
  });

  it("flips a pair deck at 98, and not at 99", () => {
    expect(
      deckIsFlippable({ built: 98, partnerName: "Kratos", ownedCount: 98, unresolvedCount: 0 }),
    ).toBe(true);
    expect(
      deckIsFlippable({ built: 99, partnerName: "Kratos", ownedCount: 99, unresolvedCount: 0 }),
    ).toBe(false);
  });

  // The two conjuncts the body-size change was not supposed to touch.
  it("still refuses a mature deck holding an unresolved row", () => {
    expect(
      deckIsFlippable({ built: 98, partnerName: "Kratos", ownedCount: 98, unresolvedCount: 1 }),
    ).toBe(false);
  });

  it("still refuses a mature deck the player does not fully own", () => {
    expect(
      deckIsFlippable({ built: 98, partnerName: "Kratos", ownedCount: 90, unresolvedCount: 0 }),
    ).toBe(false);
  });
});

describe("deckIsFlippable reads coverage", () => {
  // The seniority query runs only if some deck could reach `Complete`. A deck
  // whose last gaps are printed now can — and asked on `ownedCount` alone it
  // skipped that query, so its `unfundedCount` stayed 0 and it flipped to
  // `Complete` without the check every other complete deck gets.
  it("is flippable when proxies close the gap", () => {
    expect(deckIsFlippable({
      built: 99, partnerName: null, ownedCount: 92, coveredCount: 99, unresolvedCount: 0,
    })).toBe(true);
  });

  it("is not flippable when the proxies do not close it", () => {
    expect(deckIsFlippable({
      built: 99, partnerName: null, ownedCount: 92, coveredCount: 97, unresolvedCount: 0,
    })).toBe(false);
  });

  it("falls back to ownership for a caller that cannot count proxies", () => {
    expect(deckIsFlippable({
      built: 99, partnerName: null, ownedCount: 99, unresolvedCount: 0,
    })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// countNoteKinds — the card note's ordinal DENOMINATOR
//
// The one piece of this round's read that nothing else asserts. Every renderer test injects
// `NoteCounts`, and `probe:card-note` reads the note's geometry rather than its figures — so a
// regression here returns a perfectly plausible `your 1st` and passes all of it. What it has
// to get right: copies rather than rows, the commanders folded in, the flags map consulted,
// and the tutor read through the SHIPPED classifier rather than a second rule.
// ---------------------------------------------------------------------------
const NONE = { gameChanger: 0, extraTurns: 0, tutor: 0 };
const row = (over: Partial<Parameters<typeof countNoteKinds>[0][number]> = {}) => ({
  oracleId: "o-plain",
  gameChanger: false,
  oracleText: "Draw a card.",
  quantity: 1,
  ...over,
});
// Demonic Tutor's own text, taken from `tutor-targets.test.ts` rather than invented: this
// case is about whether the count runs the classifier at all, and a made-up sentence that
// the classifier happens to reject would pass on a build that never calls it.
const TUTOR_TEXT = "Search your library for a card, put that card into your hand, then shuffle.";

describe("countNoteKinds", () => {
  it("counts nothing for a deck of plain cards", () => {
    expect(countNoteKinds([row(), row()], [], new Map())).toEqual(NONE);
  });

  it("counts COPIES, not rows", () => {
    // No note-bearing kind is a basic today, so rows and copies agree on every real deck —
    // which is exactly why a rule that counts rows would never be caught by looking.
    expect(
      countNoteKinds([row({ gameChanger: true, quantity: 3 })], [], new Map()).gameChanger,
    ).toBe(3);
  });

  it("folds the commanders in, at one copy each", () => {
    // COMMANDERS ARE CARDS: the bracket rules count a Game Changer in the command zone
    // against every limit, and it is the one card on this page that is a column on `decks`
    // rather than a `deck_cards` row.
    const counts = countNoteKinds(
      [row()],
      [
        { oracleId: "c-1", gameChanger: true, oracleText: null },
        { oracleId: "c-2", gameChanger: true, oracleText: null },
      ],
      new Map(),
    );
    expect(counts.gameChanger).toBe(2);
  });

  it("reads extra turns off the flags map", () => {
    const flags = new Map([
      ["o-mld", { massLandDenial: true, extraTurn: false }],
      ["o-turn", { massLandDenial: false, extraTurn: true }],
    ]);
    const counts = countNoteKinds(
      [row({ oracleId: "o-mld" }), row({ oracleId: "o-turn", quantity: 2 })],
      [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flags as any,
    );
    expect(counts.extraTurns).toBe(2);
  });

  it("classifies tutors through the shipped classifier, on the list and in the zone", () => {
    const counts = countNoteKinds(
      [row({ oracleText: TUTOR_TEXT }), row()],
      [{ oracleId: "c-1", gameChanger: false, oracleText: TUTOR_TEXT }],
      new Map(),
    );
    expect(counts.tutor).toBe(2);
  });

  // Ruled 2026-09-22: a search that can find only a land is ramp. Evolving Wilds' own text,
  // read off staging's catalog. A land search in a deck holding one real tutor used to make
  // the note say "your 2nd"; `classifyTutor` returns a target for it, so a count built on
  // that would pass the case above and fail this one.
  it("does not count a land-only search as a tutor", () => {
    const WILDS =
      "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.";
    const counts = countNoteKinds(
      [row({ oracleText: TUTOR_TEXT }), row({ oracleId: "o-wilds", oracleText: WILDS, quantity: 3 })],
      [],
      new Map(),
    );
    expect(counts.tutor).toBe(1);
  });

  it("counts one card under every kind it satisfies", () => {
    // A card wears every fact true of it — the note's order then picks which sentences to
    // draw, and the count behind each of them is its own.
    const counts = countNoteKinds(
      [row({ oracleId: "o-all", gameChanger: true, oracleText: TUTOR_TEXT, quantity: 2 })],
      [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Map([["o-all", { massLandDenial: true, extraTurn: true }]]) as any,
    );
    expect(counts).toEqual({ gameChanger: 2, extraTurns: 2, tutor: 2 });
  });
});

// A FAILED flags read is not an empty one. `getDeckDetail` degrades that read to `null`
// rather than to an empty map, because the marks can afford absence and an ordinal cannot:
// the candidate's own facts come from a separate read that can succeed while this one
// fails, and a flattened failure introduces a real extra-turn card as `your 1st`.
describe("countNoteKinds — a failed flags read", () => {
  it("reports the flag-derived count as unknown, not as zero", () => {
    expect(countNoteKinds([row({ gameChanger: true })], [], null).extraTurns).toBeNull();
  });

  // MASS LAND DENIAL IS NOT COUNTED AT ALL, and its absence from `NoteCounts` is the fix
  // rather than an oversight: its sentence carries no ordinal, so counting it bought nothing
  // and the guard that came with the count withheld a true sentence on every failed read.
  it("does not count mass land denial, which needs no ordinal", () => {
    const counts = countNoteKinds(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [row({ oracleId: "o-mld" })], [], new Map([["o-mld", { massLandDenial: true, extraTurn: false }]]) as any,
    );
    expect(counts).not.toHaveProperty("massLandDenial");
  });

  it("still counts the two kinds that were never in the flags map", () => {
    const counts = countNoteKinds(
      [row({ gameChanger: true, quantity: 2 }), row({ oracleText: TUTOR_TEXT })],
      [],
      null,
    );
    expect(counts.gameChanger).toBe(2);
    expect(counts.tutor).toBe(1);
  });

  // An EMPTY map is a successful read that found nothing, which is a real zero. The two
  // must not be the same value or the distinction the null exists for is unreachable.
  it("an empty map is a real zero, not unknown", () => {
    expect(countNoteKinds([row()], [], new Map()).extraTurns).toBe(0);
  });
});

// The degradation itself, which is the half the counter's own tests cannot see: they are
// handed `null` and assert what it means. This asserts that a failed read produces one.
describe("readNoteFlags", () => {
  it("resolves null when the flags read rejects", async () => {
    flagsRead.loadBracketFlags.mockRejectedValueOnce(new Error("neon down"));
    await expect(readNoteFlags(["o-1"])).resolves.toBeNull();
  });

  // An empty map is a SUCCESSFUL read that found nothing, and it must come back as itself —
  // `null` there would report every deck's counts as unknown.
  it("passes an empty map through as an empty map", async () => {
    flagsRead.loadBracketFlags.mockResolvedValueOnce(new Map());
    await expect(readNoteFlags(["o-1"])).resolves.toEqual(new Map());
  });
});
