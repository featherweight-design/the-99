import { describe, expect, it } from "vitest";

import { classifyTutor, tutorReaches, type TutorTarget } from "./tutor-targets";

// Oracle text as the catalog stores it. Every string here was read off the live catalog by
// `measure-tutor-targets.mts` rather than written from memory — a fixture the author made up
// is a fixture the parser was tuned against.
const TEXT = {
  demonic: "Search your library for a card, put that card into your hand, then shuffle.",
  vampiric: "Search your library for a card, then shuffle and put that card on top. You lose 2 life.",
  worldly: "Search your library for a creature card, reveal it, then shuffle and put the card on top.",
  enlightened:
    "Search your library for an artifact or enchantment card, reveal it, then shuffle and put that card on top.",
  gsz: "Search your library for a green creature card with mana value X or less, put it onto the battlefield, then shuffle.",
  trinket:
    "When this creature enters, you may search your library for an artifact card with mana value 1 or less, reveal that card, put it into your hand, then shuffle.",
  tribute:
    "When this creature enters, you may search your library for an artifact card with mana value 2, reveal that card, put it into your hand, then shuffle.",
  wilds:
    "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
  cropRotation:
    "As an additional cost to cast this spell, sacrifice a land. Search your library for a land card, put that card onto the battlefield, then shuffle.",
  entomb: "Search your library for a card, put that card into your graveyard, then shuffle.",
  harbinger:
    "Flying\nWhen this creature enters, you may search your library for a Goblin card, then shuffle and put that card on top.",
  sisay:
    "{T}: Search your library for a legendary card, put that card into your hand, then shuffle.",
  // The word `opponent` is in a DIFFERENT sentence. 65 of the 79 cards mentioning an
  // opponent are this shape, and a card-scoped check would drop every one of them.
  rangerCaptain:
    "When this creature enters, you may search your library for a creature card with mana value 1, reveal it, put it into your hand, then shuffle.\nSacrifice this creature: Your opponents can't cast noncreature spells this turn.",
  // The 14 that genuinely hand the search to someone else.
  giftOfEstates:
    "Target opponent may search their library for a Plains card, put it onto the battlefield, then shuffle.",
  // Hate. None of these matches the clause at all — see the classifier's header.
  stranglehold:
    "Your opponents can't search libraries. If an opponent would begin an extra turn, that player skips that turn instead.",
  arbiter:
    "Players can't search libraries. Any player may pay {2} for that player to ignore this effect until end of turn.",
  oppositionAgent:
    "Flash\nYou control your opponents while they're searching their libraries. While an opponent is searching their library, they exile each card they find. You may play those cards for as long as they remain exiled, and you may spend mana as though it were mana of any type to cast those spells.",
  mindcensor:
    "Flash\nFlying\nIf an opponent would search a library, that player searches the top four cards of that library instead.",
};

const piece = (typeLine: string, cmc = 2, colorIdentity: string[] = []) => ({
  typeLine,
  colorIdentity,
  cmc,
});

describe("classifyTutor", () => {
  it("reads an untargeted search as any", () => {
    expect(classifyTutor(TEXT.demonic)?.kinds).toBe("any");
    expect(classifyTutor(TEXT.vampiric)?.kinds).toBe("any");
  });

  it("reads one type, and two", () => {
    expect(classifyTutor(TEXT.worldly)?.kinds).toEqual([[["creature"]]]);
    expect(classifyTutor(TEXT.enlightened)?.kinds).toEqual([[["artifact"]], [["enchantment"]]]);
  });

  it("reads a colour beside the type", () => {
    expect(classifyTutor(TEXT.gsz)).toMatchObject({ kinds: [[["creature"]]], colors: ["G"] });
  });

  // "X or less" is not a number, so it constrains nothing — Green Sun's Zenith really can
  // find any green creature for enough mana.
  it("leaves an X ceiling unconstrained", () => {
    expect(classifyTutor(TEXT.gsz)?.maxManaValue).toBeNull();
  });

  it("reads 'N or less' as a ceiling", () => {
    expect(classifyTutor(TEXT.trinket)?.maxManaValue).toBe(1);
  });

  // The documented over-claim. Tribute Mage finds a two-drop only, and is credited with
  // reaching a one-drop it cannot find.
  it("reads an EXACT mana value as a ceiling — the one over-claim", () => {
    expect(classifyTutor(TEXT.tribute)?.maxManaValue).toBe(2);
  });

  it("flags a basic-land search and does not flag a land search", () => {
    expect(classifyTutor(TEXT.wilds)?.basicOnly).toBe(true);
    expect(classifyTutor(TEXT.cropRotation)).toMatchObject({
      kinds: [[["land"]]],
      basicOnly: false,
    });
  });

  // A subtype is kept AS ITSELF and tested against the type line, which is why no subtype
  // table is needed. The first version resolved against a fixed type list and wrote off 253
  // of the corpus's 960 as reaching nothing.
  it("keeps a subtype as itself", () => {
    expect(classifyTutor(TEXT.harbinger)?.kinds).toEqual([[["goblin"]]]);
    expect(classifyTutor(TEXT.sisay)?.kinds).toEqual([[["legendary"]]]);
  });

  it("refuses a graveyard destination — it assembles nothing on its own", () => {
    expect(classifyTutor(TEXT.entomb)).toBeNull();
  });

  it("refuses a search the opponent makes", () => {
    expect(classifyTutor(TEXT.giftOfEstates)).toBeNull();
  });

  // The scope is the SENTENCE. A card-scoped opponent check drops 65 real tutors.
  it("keeps a tutor whose card mentions an opponent in another sentence", () => {
    expect(classifyTutor(TEXT.rangerCaptain)?.kinds).toEqual([[["creature"]]]);
  });

  // Regression anchors, and NOT evidence of a negation rule: none of these contains
  // "search your library for", so they are refused before any negation could fire. The
  // plan asked for a `can't search` check; the measurement found zero of the 960 matching
  // cards contain that phrase, so the rule would have been dead code.
  it.each([
    ["Stranglehold", TEXT.stranglehold],
    ["Leonin Arbiter", TEXT.arbiter],
    ["Aven Mindcensor", TEXT.mindcensor],
    // Named in the classifier's header as a regression anchor and pinned by nothing until
    // now — its text says "searching their libraries", never "search your library for".
    ["Opposition Agent", TEXT.oppositionAgent],
  ])("refuses %s — it never matches the clause", (_name, text) => {
    expect(classifyTutor(text)).toBeNull();
  });

  it("refuses a card with no text at all", () => {
    expect(classifyTutor(null)).toBeNull();
    expect(classifyTutor("Flying")).toBeNull();
  });
});

describe("tutorReaches", () => {
  const t = (text: string) => classifyTutor(text) as TutorTarget;

  it("an untargeted tutor reaches anything", () => {
    expect(tutorReaches(t(TEXT.demonic), piece("Creature — Merfolk Wizard"))).toBe(true);
  });

  it("a typed tutor refuses another type", () => {
    expect(tutorReaches(t(TEXT.worldly), piece("Instant"))).toBe(false);
    expect(tutorReaches(t(TEXT.worldly), piece("Creature — Merfolk Wizard"))).toBe(true);
  });

  it("a coloured tutor refuses a piece outside that colour", () => {
    expect(tutorReaches(t(TEXT.gsz), piece("Creature — Merfolk", 2, ["U"]))).toBe(false);
    expect(tutorReaches(t(TEXT.gsz), piece("Creature — Elf", 2, ["G"]))).toBe(true);
  });

  it("a ceiling refuses a piece above it", () => {
    expect(tutorReaches(t(TEXT.trinket), piece("Artifact", 2))).toBe(false);
    expect(tutorReaches(t(TEXT.trinket), piece("Artifact", 1))).toBe(true);
  });

  // No basic land is a two-card combo piece, and the nonbasic ones a land tutor can find
  // stay reachable through the land tutors that are not basic-only.
  it("a basic-land tutor reaches nothing, and a land tutor reaches a nonbasic land", () => {
    expect(tutorReaches(t(TEXT.wilds), piece("Legendary Snow Land", 0))).toBe(false);
    expect(tutorReaches(t(TEXT.cropRotation), piece("Legendary Snow Land", 0))).toBe(true);
  });

  it("a subtype tutor reaches by type line", () => {
    expect(tutorReaches(t(TEXT.harbinger), piece("Creature — Goblin"))).toBe(true);
    expect(tutorReaches(t(TEXT.harbinger), piece("Creature — Merfolk Wizard"))).toBe(false);
    // `legendary` is a supertype on the type line, so Captain Sisay reaches a legendary land.
    expect(tutorReaches(t(TEXT.sisay), piece("Legendary Snow Land", 0))).toBe(true);
  });

  // A LAND-SUBTYPE tutor reaches no combo piece, and now for the right reason: the type-line
  // test refuses `Dark Depths` because it carries no Forest type, where the retired
  // fixed-kind-list version refused everything. The classifier's header records this case and
  // nothing asserted it.
  it("a land-subtype tutor refuses a nonbasic land without that type", () => {
    const balamb = classifyTutor(
      "When this creature enters, search your library for a Forest card, reveal it, put it into your hand, then shuffle.",
    ) as TutorTarget;
    expect(balamb.kinds).toEqual([[["forest"]]]);
    expect(tutorReaches(balamb, piece("Legendary Snow Land", 0))).toBe(false);
    expect(tutorReaches(balamb, piece("Basic Land — Forest", 0))).toBe(true);
  });
});

// The mana-value phrasings, counted on the live catalog. Two of these three were invisible
// until they were counted: a bare `mana value (\d+)` read both of them as a ceiling.
describe("the mana-value ceiling", () => {
  const cap = (t: string) => classifyTutor(t)?.maxManaValue;

  it("reads 'N or greater' as NO ceiling, never as one", () => {
    // Fierce Empath. Read as a ceiling of 6 this is inverted twice over: it would refuse the
    // six-drop the card finds and offer the two-drop it cannot.
    expect(
      cap(
        "When this creature enters, you may search your library for a creature card with mana value 6 or greater, reveal it, put it into your hand, then shuffle.",
      ),
    ).toBeNull();
  });

  it("reads 'equal to N plus …' as no ceiling — the digit is an offset", () => {
    // Birthing Pod. A ceiling of 1 refuses everything this card actually finds.
    expect(
      cap(
        "{1}{G}, {T}, Sacrifice a creature: Search your library for a creature card with mana value equal to 1 plus the sacrificed creature's mana value, put it onto the battlefield, then shuffle.",
      ),
    ).toBeNull();
  });

  it("still reads 'N or less' and a bare exact N as ceilings", () => {
    expect(cap("Search your library for a creature card with mana value 3 or less, reveal it, put it into your hand, then shuffle.")).toBe(3);
    expect(cap("Search your library for an artifact card with mana value 3, reveal that card, put it into your hand, then shuffle.")).toBe(3);
  });
});


// ALTERNATIVES versus CONSTRAINTS — the two quantifiers are the whole rule, and collapsing
// them made a conjunction behave like a disjunction. 146 of the 960 tutors carry more than
// one word and the corpus holds both shapes side by side, so neither reading can be assumed.
describe("and is not or", () => {
  const t = (text: string) => classifyTutor(text) as TutorTarget;
  const legendaryCreature = t(
    "Search your library for a legendary creature card, reveal it, put it into your hand, then shuffle.",
  );

  it("reads a conjunction as one alternative of two constraints", () => {
    expect(legendaryCreature.kinds).toEqual([[["legendary"], ["creature"]]]);
  });

  // The false positive this closes: a legendary-creature tutor reaching a legendary LAND,
  // which then reports `reachable` on a combo it cannot find.
  it("requires every constraint in the alternative", () => {
    expect(tutorReaches(legendaryCreature, piece("Legendary Creature — Elf"))).toBe(true);
    expect(tutorReaches(legendaryCreature, piece("Legendary Snow Land", 0))).toBe(false);
    expect(tutorReaches(legendaryCreature, piece("Creature — Elf"))).toBe(false);
  });

  it("still reads a genuine or as two alternatives", () => {
    const enlightened = t(TEXT.enlightened);
    expect(tutorReaches(enlightened, piece("Artifact"))).toBe(true);
    expect(tutorReaches(enlightened, piece("Enchantment"))).toBe(true);
    expect(tutorReaches(enlightened, piece("Creature — Elf"))).toBe(false);
  });

  // `a Forest, Island, or Mountain card` — commas separate alternatives too.
  it("splits alternatives on commas as well as on or", () => {
    const monument = t(
      "Search your library for a Forest, Island, or Mountain card, put it onto the battlefield tapped, then shuffle.",
    );
    expect(tutorReaches(monument, piece("Basic Land — Island", 0))).toBe(true);
    expect(tutorReaches(monument, piece("Basic Land — Swamp", 0))).toBe(false);
  });

  // `a Rebel permanent card` — a conjunction whose second constraint is itself a set,
  // because `permanent` expands to the six permanent types.
  it("expands permanent inside a conjunction", () => {
    const rebel = t(
      "Search your library for a Rebel permanent card with mana value 3 or less, put it onto the battlefield, then shuffle.",
    );
    expect(tutorReaches(rebel, piece("Creature — Human Rebel", 2))).toBe(true);
    expect(tutorReaches(rebel, piece("Creature — Human Soldier", 2))).toBe(false);
    expect(tutorReaches(rebel, piece("Instant", 2))).toBe(false);
  });
});

// `snow` is a real supertype and `nonbasic` is a negation no type line spells. Dropping both
// as noise turned each into an unrestricted `land` target.
describe("land qualifiers", () => {
  const t = (text: string) => classifyTutor(text) as TutorTarget;

  it("keeps snow as a constraint", () => {
    const north = t(
      "Search your library for a snow land card, put it onto the battlefield tapped, then shuffle.",
    );
    expect(tutorReaches(north, piece("Basic Snow Land — Forest", 0))).toBe(true);
    expect(tutorReaches(north, piece("Legendary Land", 0))).toBe(false);
  });

  // An under-claim, and the safe direction: the model cannot express "not basic", so such a
  // tutor reaches nothing rather than reaching a basic it cannot find. Zero of the 960
  // targets use the word, so it costs nothing today.
  it("makes a nonbasic target reach nothing rather than reaching a basic", () => {
    const hypothetical = t(
      "Search your library for a nonbasic land card, put it onto the battlefield, then shuffle.",
    );
    expect(tutorReaches(hypothetical, piece("Basic Land — Forest", 0))).toBe(false);
    expect(tutorReaches(hypothetical, piece("Legendary Land", 0))).toBe(false);
  });
});
