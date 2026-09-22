import { describe, expect, it } from "vitest";

import { buildDeckProfile, manaNeeds, type ProfileCardRow, type ProfileInput } from "./build";
import type { ComboRef, CompositionTargets, DetectionCoverage, FlagSource } from "./types";
import { ROLE_TARGETS } from "../recs/roles";

/** Any complete composition — this block is about the ROLE chain, and only needs the type
 *  chain to be resolvable so the two can be shown not to move together. */
const COMPOSITION: CompositionTargets = {
  land: 37, basic: 20, nonbasic: 17, creature: 28, instant: 8,
  sorcery: 7, artifact: 9, enchantment: 6, planeswalker: 1, battle: 0,
};

const DETECTION: DetectionCoverage = {
  massLandDenial: { methods: ["m"], basis: "test" },
  extraTurn: { methods: ["m"], basis: "test" },
  twoCardCombos: { methods: ["m"], basis: "test" },
};

function card(over: Partial<ProfileCardRow> & { oracleId: string }): ProfileCardRow {
  return {
    name: over.oracleId,
    layout: "normal",
    typeLine: "Creature — Human",
    oracleText: null,
    keywords: [],
    cmc: 2,
    colorIdentity: [],
    manaCost: "{1}{G}",
    quantity: 1,
    commanderLegal: true,
    ...over,
  };
}

function input(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    deckId: "deck-1",
    fingerprint: "f",
    cards: [],
    commanderOracleIds: ["cmd"],
    identity: ["G"],
    condition: "G",
    composition: { pair: null, commander: null, identity: null, count: null },
    roles: { pair: null, commander: null, identity: null, count: null },
    thinCondition: false,
    staples: [],
    commanderDeckCount: null,
    population: null,
    mldFlags: new Map<string, FlagSource[]>(),
    extraTurnFlags: new Map<string, FlagSource[]>(),
    gameChangerIds: new Set<string>(),
    twoCardCombos: [],
    tutorIds: new Set<string>(),
    detection: DETECTION,
    ...over,
  };
}

describe("counts", () => {
  it("counts copies, and splits lands out of the nonland figure", () => {
    const p = buildDeckProfile(
      input({
        cards: [
          card({ oracleId: "a", quantity: 3 }),
          card({ oracleId: "forest", typeLine: "Basic Land — Forest", quantity: 10 }),
          card({ oracleId: "wilds", typeLine: "Land", quantity: 2 }),
        ],
      }),
    );
    expect(p.counts).toEqual({ total: 15, nonland: 3, land: 12, basics: 10, landCapable: 12 });
  });

  it("counts a modal land as land-capable without moving counts.land", () => {
    const p = buildDeckProfile(input({ cards: [
      card({ oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest", quantity: 10 }),
      // A modal DFC: you choose the face as you play it, so the land mode is real.
      card({ oracleId: "ss", name: "Shatterskull Smashing // Shatterskull, the Hammer Pass",
        typeLine: "Sorcery // Land", layout: "modal_dfc", quantity: 1 }),
      // A transform card is CAST as its front face and flips later, so it can never be a
      // land drop. Counting it as one is the defect `playableAsLand` exists to prevent.
      card({ oracleId: "ojer", name: "Ojer Axonil, Deepest Might // Temple of Power",
        typeLine: "Legendary Creature — God // Land", layout: "transform", quantity: 1 }),
    ] }));

    // Exclusive, so the ten type axes still sum to the deck.
    expect(p.counts.land).toBe(10);
    // Only the modal one adds a land drop.
    expect(p.counts.landCapable).toBe(11);
    expect(p.landCapableCards.map((c) => c.oracleId)).toEqual(["ss"]);
  });

  // By type line, never by name. `Wastes` is a basic whose name is not a basic type, and
  // `Snow-Covered Swamp` is a basic whose name is not `Swamp`.
  it("reads basics off the type line", () => {
    const p = buildDeckProfile(
      input({
        cards: [
          card({ oracleId: "wastes", name: "Wastes", typeLine: "Basic Land" }),
          card({ oracleId: "snow", name: "Snow-Covered Swamp", typeLine: "Basic Snow Land — Swamp" }),
          card({ oracleId: "bayou", name: "Bayou", typeLine: "Land — Swamp Forest" }),
        ],
      }),
    );
    expect(p.counts.basics).toBe(2);
    expect(p.counts.land).toBe(3);
  });

  it("an empty deck reports zeros and does not crash", () => {
    const p = buildDeckProfile(input());
    expect(p.counts).toEqual({ total: 0, nonland: 0, land: 0, basics: 0, landCapable: 0 });
    expect(p.curve.average).toBeNull();
    expect(p.legality.identityViolations).toEqual([]);
  });

  // An import can overshoot. The profile reports what the deck HOLDS; a rule about 100 is
  // a verdict, and verdicts are pure functions over this, not corrections inside it.
  it("an over-100 import reports its real total", () => {
    const p = buildDeckProfile(input({ cards: [card({ oracleId: "a", quantity: 104 })] }));
    expect(p.counts.total).toBe(104);
  });
});

describe("roles", () => {
  it("counts copies but lists each card once", () => {
    const p = buildDeckProfile(
      input({
        cards: [card({ oracleId: "growth", name: "Rampant Growth", oracleText: "Add {G}.", quantity: 3 })],
      }),
    );
    expect(p.roles.counts.ramp).toBe(3);
    expect(p.roles.cards.ramp).toEqual([{ oracleId: "growth", name: "Rampant Growth" }]);
  });

  it("always carries every role key, at zero", () => {
    const p = buildDeckProfile(input());
    expect(Object.keys(p.roles.counts).sort()).toEqual([
      "draw",
      "land",
      "ramp",
      "removal",
      "wipes",
    ]);
  });
});

// The commanders are cards. They arrive appended to `cards` by the loader, and every list
// here has to see them — under-slotting a deck whose Game Changer IS the commander is the
// exact failure this pins.
describe("the commanders are cards", () => {
  const commanderRow = card({
    oracleId: "cmd",
    name: "Kinnan",
    oracleText: "Add {G}. Whenever you draw a card, take an extra turn.",
    quantity: 1,
  });

  it("folds a commander into counts, roles and the curve", () => {
    const p = buildDeckProfile(input({ cards: [commanderRow] }));
    expect(p.counts.total).toBe(1);
    expect(p.roles.counts.ramp).toBe(1);
    expect(p.curve.copies).toBe(1);
  });

  it("folds a commander into gameChangers", () => {
    const p = buildDeckProfile(
      input({ cards: [commanderRow], gameChangerIds: new Set(["cmd"]) }),
    );
    expect(p.brackets.gameChangers).toEqual([{ oracleId: "cmd", name: "Kinnan" }]);
  });

  it("folds a commander into massLandDenial and extraTurns, with its sources", () => {
    const p = buildDeckProfile(
      input({
        cards: [commanderRow],
        mldFlags: new Map([["cmd", ["oracle_rule"] as FlagSource[]]]),
        extraTurnFlags: new Map([["cmd", ["spellbook_sweep", "oracle_rule"] as FlagSource[]]]),
      }),
    );
    expect(p.brackets.massLandDenial).toEqual([
      { oracleId: "cmd", name: "Kinnan", sources: ["oracle_rule"] },
    ]);
    expect(p.brackets.extraTurns[0].sources).toEqual(["spellbook_sweep", "oracle_rule"]);
  });

  // The loader appends the commander rows to the deck rows, and a malformed import can
  // hold the commander as a `deck_cards` row as well. A receipt naming the same card twice
  // reads as two answers to one question, so every list dedupes on the oracle id.
  it("names a card once even when it arrives twice", () => {
    const rows = [
      card({ oracleId: "cmd", name: "Kinnan", quantity: 1 }),
      card({ oracleId: "cmd", name: "Kinnan", quantity: 1 }),
    ];
    const p = buildDeckProfile(
      input({
        cards: rows,
        gameChangerIds: new Set(["cmd"]),
        tutorIds: new Set(["cmd"]),
        mldFlags: new Map([["cmd", ["oracle_rule"] as FlagSource[]]]),
      }),
    );
    expect(p.brackets.gameChangers).toHaveLength(1);
    expect(p.brackets.comboReach.tutors).toHaveLength(1);
    expect(p.brackets.massLandDenial).toHaveLength(1);
    // The copies are summed rather than dropped — no information is lost — and `cards` is
    // the SAME list every count was computed from, which is what the type promises.
    expect(p.counts.total).toBe(2);
    expect(p.cards).toEqual([
      { oracleId: "cmd", name: "Kinnan", typeLine: "Creature — Human", cmc: 2, quantity: 2,
        layout: "normal" },
    ]);
  });

  it("folds a commander into comboReach.tutors", () => {
    const p = buildDeckProfile(input({ cards: [commanderRow], tutorIds: new Set(["cmd"]) }));
    expect(p.brackets.comboReach.tutors).toEqual([{ oracleId: "cmd", name: "Kinnan" }]);
  });

  // A commander defines the identity, so it can never violate it. Folding it into the rows
  // and then testing every row against the identity would report a violation on the one
  // card that set the boundary.
  it("never reports a commander as an identity violation", () => {
    const p = buildDeckProfile(
      input({
        cards: [card({ oracleId: "cmd", colorIdentity: ["G", "U"] })],
        identity: ["G"],
      }),
    );
    expect(p.legality.identityViolations).toEqual([]);
  });
});

describe("colours", () => {
  // Colour identity counts ACTIVATION costs. A card castable for {2} whose ability reads
  // `{R}: …` has a red identity and asks for no red at cast time.
  it("unproducible reads mana-cost pips, not colour identity", () => {
    const p = buildDeckProfile(
      input({
        identity: ["R"],
        cards: [
          card({ oracleId: "mtn", typeLine: "Basic Land — Mountain", colorIdentity: ["R"], manaCost: null }),
          card({ oracleId: "cave", name: "Cave of Temptation", colorIdentity: ["R"], manaCost: "{2}" }),
        ],
      }),
    );
    expect(p.colours.unproducible).toEqual([]);
  });

  it("reports a colour no land can produce", () => {
    const p = buildDeckProfile(
      input({
        identity: ["G", "U"],
        cards: [
          card({ oracleId: "forest", typeLine: "Basic Land — Forest", colorIdentity: ["G"], manaCost: null }),
          card({ oracleId: "counter", manaCost: "{1}{U}" }),
        ],
      }),
    );
    expect(p.colours.unproducible).toEqual(["U"]);
    expect(p.colours.producibleColors).toEqual(["G"]);
  });

  // One pip that either half pays. Reporting U here would manufacture a disagreement out
  // of a card the deck can cast every time.
  it("a hybrid pip is unproducible only when NO half is producible", () => {
    const withPlains = buildDeckProfile(
      input({
        identity: ["W", "U"],
        cards: [
          card({ oracleId: "plains", typeLine: "Basic Land — Plains", colorIdentity: ["W"], manaCost: null }),
          card({ oracleId: "hybrid", manaCost: "{W/U}" }),
        ],
      }),
    );
    expect(withPlains.colours.unproducible).toEqual([]);

    const withNeither = buildDeckProfile(
      input({
        identity: ["W", "U"],
        cards: [
          card({ oracleId: "waste", typeLine: "Land", colorIdentity: [], manaCost: null }),
          card({ oracleId: "hybrid", manaCost: "{W/U}" }),
        ],
      }),
    );
    expect(withNeither.colours.unproducible).toEqual(["W", "U"]);
  });

  it("orders every colour list WUBRG", () => {
    const p = buildDeckProfile(
      input({
        identity: ["g", "u", "w"],
        cards: [card({ oracleId: "l", typeLine: "Land", colorIdentity: ["R", "B", "W"], manaCost: null })],
      }),
    );
    expect(p.colours.identity).toEqual(["W", "U", "G"]);
    expect(p.colours.producibleColors).toEqual(["W", "B", "R"]);
  });

  it("manaNeeds groups a hybrid and drops generic, X and colourless pips", () => {
    expect(manaNeeds("{3}{W/U}{X}{C}{B}")).toEqual([["W", "U"], ["B"]]);
    expect(manaNeeds(null)).toEqual([]);
  });
});

describe("legality", () => {
  // Under all five brackets, not inside the system: WotC gives B4 and B5 "no restrictions
  // (other than the banned list)", so a banned card makes the deck illegal rather than
  // moving its bracket.
  it("reports banned cards and identity violations as legality, never as bracket facts", () => {
    const p = buildDeckProfile(
      input({
        identity: ["G"],
        cards: [
          card({ oracleId: "banned", name: "Black Lotus", commanderLegal: false }),
          card({ oracleId: "offcolour", colorIdentity: ["U"] }),
        ],
      }),
    );
    expect(p.legality.banned).toEqual([{ oracleId: "banned", name: "Black Lotus" }]);
    expect(p.legality.identityViolations).toEqual([{ oracleId: "offcolour", name: "offcolour" }]);
    expect(p.brackets.gameChangers).toEqual([]);
  });
});

describe("the composition basis chain", () => {
  const targets = {
    land: 37, basic: 17, nonbasic: 20, creature: 26, instant: 11,
    sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 0, battle: 0,
  };
  const value = { targets, averageCurve: null };

  it.each([
    ["pair", { pair: value, commander: value, identity: value, count: value }],
    ["commander", { pair: null, commander: value, identity: value, count: value }],
    ["identity", { pair: null, commander: null, identity: value, count: value }],
    ["count", { pair: null, commander: null, identity: null, count: value }],
  ])("takes the %s row when it is the first present", (of, composition) => {
    const p = buildDeckProfile(input({ composition }));
    expect(p.skeleton.composition?.of).toBe(of);
    expect(p.skeleton.composition?.targets).toEqual(targets);
  });

  // The discriminant travels WITH the data, so there is no state in which a target exists
  // with no provenance. Null means no target was derivable, and the surface says so rather
  // than drawing a zero.
  it("is null with no candidate, and the condition is still present", () => {
    const p = buildDeckProfile(input({ condition: "BG" }));
    expect(p.skeleton.composition).toBeNull();
    expect(p.skeleton.condition).toBe("BG");
  });
});

describe("population", () => {
  // Absent, not zero. EDHREC has no counts for 27 commanders, and a zeroed histogram reads
  // as "nobody declared" rather than "we do not know".
  it("is null when the commander has no counts", () => {
    expect(buildDeckProfile(input()).brackets.population).toBeNull();
  });

  it("carries its own denominator and basis when present", () => {
    const population = {
      counts: { "1": 10, "2": 20, "3": 30, "4": 5, "5": 1 },
      declaredTotal: 66,
      deckCount: 300,
      of: "pair" as const,
    };
    expect(buildDeckProfile(input({ population })).brackets.population).toEqual(population);
  });
});

describe("combo reach", () => {
  const combo: ComboRef = {
    variantId: "v1",
    cards: [
      { oracleId: "piece-a", name: "Piece A" },
      { oracleId: "piece-b", name: "Piece B" },
    ],
    produces: ["Infinite mana"],
    bracketTag: "casual",
    usesCommander: false,
  };

  it("pairs each tutor with each combo piece the deck holds", () => {
    const p = buildDeckProfile(
      input({
        cards: [
          card({ oracleId: "tutor", name: "Demonic Tutor" }),
          card({ oracleId: "piece-a", name: "Piece A" }),
          card({ oracleId: "piece-b", name: "Piece B" }),
        ],
        tutorIds: new Set(["tutor"]),
        twoCardCombos: [combo],
      }),
    );
    expect(p.brackets.comboReach.reaches.map((r) => r.piece.oracleId)).toEqual([
      "piece-a",
      "piece-b",
    ]);
  });

  // A tutor that is itself a combo piece does not reach ITSELF — it is already in play.
  it("never reaches the tutor's own card", () => {
    const p = buildDeckProfile(
      input({
        cards: [card({ oracleId: "piece-a", name: "Piece A" }), card({ oracleId: "piece-b", name: "Piece B" })],
        tutorIds: new Set(["piece-a"]),
        twoCardCombos: [combo],
      }),
    );
    expect(p.brackets.comboReach.reaches.map((r) => r.piece.oracleId)).toEqual(["piece-b"]);
  });

  it("reports the tutors even when the deck assembles no combo", () => {
    const p = buildDeckProfile(
      input({ cards: [card({ oracleId: "tutor" })], tutorIds: new Set(["tutor"]) }),
    );
    expect(p.brackets.comboReach.tutors).toHaveLength(1);
    expect(p.brackets.comboReach.reaches).toEqual([]);
  });
});

describe("themes", () => {
  // The #724 gate. `loadPlayedTags` answers "what does this player play" from each deck's
  // COMMANDER's tag list, so 76.3% of rows on the reference account carry themes no card in
  // the deck supports. A null reads as absent; a wrong theme list does not.
  it("is null, always", () => {
    const p = buildDeckProfile(input({ cards: [card({ oracleId: "a" })] }));
    expect(p.themes).toBeNull();
  });
});

describe("the cached form survives a JSON round trip", () => {
  // §5.4: the profile is cached as JSON, so a `Map` comes back as `{}` and a `Date` as a
  // string. Asserting the round trip is what keeps a later field from quietly breaking it.
  it("is structurally identical after JSON.parse(JSON.stringify(…))", () => {
    const p = buildDeckProfile(
      input({
        cards: [card({ oracleId: "a" }), card({ oracleId: "l", typeLine: "Land", manaCost: null })],
        gameChangerIds: new Set(["a"]),
        mldFlags: new Map([["a", ["oracle_rule"] as FlagSource[]]]),
      }),
    );
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });
});

describe("the commanders are named on the object", () => {
  // The converse of the commanders-are-cards rule: they are cards you cannot REMOVE, and
  // `upgradePath` must never offer one as a card to cut. Once the loader has unioned the
  // commander rows into `cards`, nothing else here can tell one from a `deck_cards` row.
  it("carries both commander oracle ids", () => {
    const p = buildDeckProfile(input({ commanderOracleIds: ["cmd", "partner"] }));
    expect(p.commanderOracleIds).toEqual(["cmd", "partner"]);
  });
});

// A pip with a NON-COLOUR alternative needs nothing. An earlier version kept the colour
// half of `{2/W}` and `{W/P}` and a comment calling them "the same shape" as `{W/U}`; they
// are the opposite shape, and the result was the exact false positive the hybrid rule
// exists to prevent.
describe("a pip that can be paid another way", () => {
  it("demands no colour for a generic hybrid", () => {
    expect(manaNeeds("{2/W}{2/W}")).toEqual([]);
  });

  it("demands no colour for a Phyrexian pip", () => {
    expect(manaNeeds("{W/P}")).toEqual([]);
  });

  it("still demands one of the two halves of a colour hybrid", () => {
    expect(manaNeeds("{W/U}")).toEqual([["W", "U"]]);
  });

  it("reports nothing unproducible for a deck running only generic hybrids", () => {
    const p = buildDeckProfile(
      input({
        identity: ["W"],
        cards: [
          card({ oracleId: "waste", typeLine: "Land", colorIdentity: [], manaCost: null }),
          card({ oracleId: "procession", manaCost: "{2/W}{2/W}{2/W}" }),
        ],
      }),
    );
    expect(p.colours.unproducible).toEqual([]);
  });
});

describe("what a tutor cannot reach", () => {
  // A tutor searches a LIBRARY. A combo piece in the command zone is already available, so
  // it cannot be reached — and counting it pushes the [3,4] lean to `reachable` on every
  // commander-based combo, the one case where the tutor contributes nothing.
  it("never reaches a piece that is a commander", () => {
    const combo: ComboRef = {
      variantId: "v1",
      cards: [
        { oracleId: "cmd", name: "Commander Piece" },
        { oracleId: "p2", name: "Other Piece" },
      ],
      produces: ["Infinite mana"],
      bracketTag: "casual",
      usesCommander: true,
    };
    const p = buildDeckProfile(
      input({
        cards: [card({ oracleId: "cmd" }), card({ oracleId: "p2" }), card({ oracleId: "tutor" })],
        commanderOracleIds: ["cmd"],
        tutorIds: new Set(["tutor"]),
        twoCardCombos: [combo],
      }),
    );
    expect(p.brackets.comboReach.reaches.map((r) => r.piece.oracleId)).toEqual(["p2"]);
  });
});

describe("the role receipt lists distinct cards", () => {
  // The comment has always promised this; the list pushed one ref per input ROW.
  it("names a repeated row once while counting both copies", () => {
    const growth = card({
      oracleId: "growth", name: "Rampant Growth", oracleText: "Add {G}.", quantity: 2,
    });
    const p = buildDeckProfile(input({ cards: [growth, { ...growth }] }));
    expect(p.roles.cards.ramp).toEqual([{ oracleId: "growth", name: "Rampant Growth" }]);
    expect(p.roles.counts.ramp).toBe(4);
  });
});

// `profile.cards` is the list every figure was computed from, not a differently-shaped
// neighbour. An earlier version deduped only the exposed list while counting over the raw
// input, so a duplicated row reported one card and two copies at once.
describe("every figure comes from one normalised list", () => {
  it("agrees between cards, counts and the curve", () => {
    const land = card({ oracleId: "forest", typeLine: "Basic Land — Forest", quantity: 3 });
    const spell = card({ oracleId: "bolt", typeLine: "Instant", cmc: 1, quantity: 2 });
    const p = buildDeckProfile(
      input({ cards: [land, { ...land }, spell] }),
    );
    expect(p.cards.map((c) => [c.oracleId, c.quantity])).toEqual([
      ["forest", 6],
      ["bolt", 2],
    ]);
    expect(p.counts.total).toBe(p.cards.reduce((n, c) => n + c.quantity, 0));
    expect(p.counts.land).toBe(6);
    expect(p.curve.lands).toBe(6);
    expect(p.curve.copies).toBe(2);
  });
});

// The reach predicate. Without it every tutor "reaches" every piece, which is a receipt
// nobody can check and an overstatement on every deck that holds a tutor.
describe("a tutor reaches only what it can find", () => {
  const combo: ComboRef = {
    variantId: "v1",
    cards: [
      { oracleId: "artifact-piece", name: "Artifact Piece" },
      { oracleId: "land-piece", name: "Land Piece" },
    ],
    produces: ["Infinite mana"],
    bracketTag: "casual",
    usesCommander: false,
  };

  const cards = [
    card({ oracleId: "tutor", name: "Sylvan Scrying" }),
    card({ oracleId: "artifact-piece", typeLine: "Artifact" }),
    card({ oracleId: "land-piece", typeLine: "Land" }),
  ];

  it("pairs only the pieces the predicate admits", () => {
    const p = buildDeckProfile(
      input({
        cards,
        tutorIds: new Set(["tutor"]),
        twoCardCombos: [combo],
        tutorReaches: (_id, piece) => piece.typeLine.toLowerCase().includes("land"),
      }),
    );
    expect(p.brackets.comboReach.reaches.map((r) => r.piece.oracleId)).toEqual(["land-piece"]);
  });

  // A tutor that reaches nothing is still a tutor — the profile reports it as a fact, and
  // `bracketDelta` calls that `ruleless` rather than hiding it.
  it("still lists a tutor that reaches nothing", () => {
    const p = buildDeckProfile(
      input({
        cards,
        tutorIds: new Set(["tutor"]),
        twoCardCombos: [combo],
        tutorReaches: () => false,
      }),
    );
    expect(p.brackets.comboReach.tutors).toHaveLength(1);
    expect(p.brackets.comboReach.reaches).toEqual([]);
  });
});

// THE ROLE CHAIN. Read down the same order as the composition and resolved SEPARATELY — the
// two populations differ until one index run has covered both, so a commander indexed before
// the role pass carries a composition and four nulls.
describe("roleTargets", () => {
  const FOUR = { ramp: 9, draw: 11, removal: 7, wipes: 2 };
  const OTHER = { ramp: 1, draw: 2, removal: 3, wipes: 4 };
  const withRoles = (roles: Partial<ProfileInput["roles"]>, thinCondition = false) =>
    buildDeckProfile(input({
      roles: { pair: null, commander: null, identity: null, count: null, ...roles },
      thinCondition,
    })).skeleton;

  it("prefers the commander's own figures over a bucket's", () => {
    const s = withRoles({ commander: FOUR, identity: OTHER, count: OTHER });
    expect(s.roleTargets).toEqual({ of: "commander", targets: FOUR });
  });

  it("prefers a pair's over the commander's", () => {
    expect(withRoles({ pair: FOUR, commander: OTHER }).roleTargets.of).toBe("pair");
  });

  it("falls to the identity bucket, then the count bucket", () => {
    expect(withRoles({ identity: FOUR, count: OTHER }).roleTargets.of).toBe("identity");
    expect(withRoles({ count: FOUR }).roleTargets.of).toBe("count");
  });

  // `flat` is a real answer rather than an absence: it is the asserted baseline this whole
  // sub-project replaces, and a deck falling back to it is being told something true.
  it("ends at the flat asserted targets rather than null", () => {
    const s = withRoles({});
    expect(s.roleTargets.of).toBe("flat");
    expect(s.roleTargets.targets).toEqual({ ...ROLE_TARGETS });
  });

  // THE INDEPENDENCE, which is the whole reason there are two chains rather than one. Folding
  // them would drag a perfectly good composition to flat over role figures nobody measured.
  it("resolves independently of the composition", () => {
    const s = buildDeckProfile(input({
      composition: {
        pair: null,
        commander: { targets: COMPOSITION, averageCurve: null },
        identity: null,
        count: null,
      },
    })).skeleton;
    expect(s.composition?.of).toBe("commander");
    expect(s.roleTargets.of).toBe("flat");
  });

  // Surfaced WITHOUT inventing a basis value: a below-bar bucket is still an `identity` or
  // `count` basis, and the caveat travels beside it rather than replacing it.
  it("carries thinCondition without changing the basis", () => {
    const s = withRoles({ identity: FOUR }, true);
    expect(s.thinCondition).toBe(true);
    expect(s.roleTargets.of).toBe("identity");
  });
});
