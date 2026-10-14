import { describe, expect, it } from "vitest";

import { EMPTY_NOTE_COUNTS, cardNoteSentences, type NoteCounts } from "./card-note";
import { cardNote } from "../copy/card-note";
import type { CandidateFacts } from "./delta";

// One card, every fact off. Each case turns on exactly what it is about — a fixture that
// arrives with two facts set cannot tell an order rule from a cap rule.
const bare: CandidateFacts = {
  card: { oracleId: "o-1", name: "Candidate" },
  gameChanger: false,
  massLandDenial: false,
  extraTurn: false,
  tutor: false,
  completesCombos: [],
};

const facts = (over: Partial<CandidateFacts>): CandidateFacts => ({ ...bare, ...over });
const counts = (over: Partial<NoteCounts>): NoteCounts => ({ ...EMPTY_NOTE_COUNTS, ...over });

const draw = (over: Partial<Parameters<typeof cardNoteSentences>[0]>) =>
  cardNoteSentences({
    facts: bare,
    declared: null,
    counts: EMPTY_NOTE_COUNTS,
    density: "row",
    ...over,
  });

describe("cardNoteSentences", () => {
  describe("n9 — nothing renders", () => {
    it("draws nothing for a card carrying no fact", () => {
      expect(draw({})).toEqual([]);
    });

    // The state a FAILED facts read degrades to, which is the same rendering as a card with
    // no facts. Asserted separately from the line above because the two arrive by different
    // routes and a guard covering only one of them would pass that one.
    it("draws nothing when the facts read came back null", () => {
      expect(draw({ facts: null })).toEqual([]);
    });
  });

  describe("n1 / n2 — game changer", () => {
    it("n2: undeclared prints the card fact and the count, and no deck clause", () => {
      expect(draw({ facts: facts({ gameChanger: true }), counts: counts({ gameChanger: 3 }) })).toEqual([
        "A game changer, and your 4th.",
      ]);
    });

    it("n1: a declared bracket 3 quotes its own limit", () => {
      expect(
        draw({
          facts: facts({ gameChanger: true }),
          declared: 3,
          counts: counts({ gameChanger: 3 }),
        }),
      ).toEqual(["A game changer, and your 4th. Upgraded allows 3."]);
    });

    it("a declared bracket 1 says the limit is none rather than printing a zero", () => {
      expect(draw({ facts: facts({ gameChanger: true }), declared: 1 })).toEqual([
        "A game changer, and your 1st. Exhibition allows none.",
      ]);
    });

    // 4 and 5 have no game-changer limit at all — `GAME_CHANGER_LIMIT` is keyed on 1, 2 and 3.
    // Quoting one there would be the right figure for a bracket that does not have it.
    it("a declared bracket 4 quotes no limit, because there is none to quote", () => {
      const at4 = draw({ facts: facts({ gameChanger: true }), declared: 4 });
      expect(at4).toEqual(["A game changer, and your 1st."]);
      expect(at4[0]).not.toContain("allows");
      expect(draw({ facts: facts({ gameChanger: true }), declared: 5 })).toEqual(at4);
    });

    // The ordinal is the position the card WOULD take, so the teens have to be reachable and
    // right. A deck can hold eleven game changers.
    it("the ordinal takes the card itself into account, teens included", () => {
      expect(draw({ facts: facts({ gameChanger: true }), counts: counts({ gameChanger: 10 }) })[0]).toContain(
        "your 11th",
      );
      expect(draw({ facts: facts({ gameChanger: true }), counts: counts({ gameChanger: 21 }) })[0]).toContain(
        "your 22nd",
      );
    });

    it("a card already in the deck is counted where it sits, not one past it", () => {
      expect(
        draw({
          facts: facts({ gameChanger: true }),
          counts: counts({ gameChanger: 4 }),
          inDeck: true,
        })[0],
      ).toContain("your 4th");
    });
  });

  describe("n3 / n4 — mass land denial", () => {
    it("n4: undeclared states the consequence flat, and appends the disclaimer on a row", () => {
      expect(draw({ facts: facts({ massLandDenial: true }) })).toEqual([
        cardNote.massLandDenial.plain,
        cardNote.massLandDenial.disclaimer,
      ]);
    });

    // THE HEDGE IS THE ROW'S. A 173px tile drew six lines here against every other note's
    // three, which is the only note on the surface that did. The row has the width for it.
    it("drops the disclaimer on a tile and keeps it on a row", () => {
      expect(draw({ facts: facts({ massLandDenial: true }), density: "tile" })).toEqual([
        cardNote.massLandDenial.plain,
      ]);
      expect(draw({ facts: facts({ massLandDenial: true }), density: "row" })).toHaveLength(2);
    });

    it("n3: a declared bracket 2 names the declaration as the thing that refuses it", () => {
      const drawn = draw({ facts: facts({ massLandDenial: true }), declared: 2 });
      expect(drawn[0]).toBe(
        "We read this as mass land denial. The Core you declared doesn’t allow it.",
      );
      expect(drawn[1]).toBe(cardNote.massLandDenial.disclaimer);
    });

    // At 4 and 5 their own bracket ALLOWS it, so naming it would read as a refusal that is
    // not happening. The flat clause states where the card sits and stays true up there.
    it("a declared bracket 4 states where the card sits rather than refusing it", () => {
      const [sentence] = draw({ facts: facts({ massLandDenial: true }), declared: 4 });
      expect(sentence).toBe(cardNote.massLandDenial.plain);
      expect(sentence).not.toContain("you declared");
    });

    // The hedge attaches to the DETECTION and nothing else: what follows it is the rules'
    // consequence and is not in doubt, at any bracket and declared or not.
    it("attributes the reading and never the rule", () => {
      for (const declared of [null, 1, 2, 3, 4, 5] as const) {
        const [sentence] = draw({ facts: facts({ massLandDenial: true }), declared });
        expect(sentence).toContain("We read this as");
        expect(sentence).toMatch(/allows? it|allow it/);
      }
    });

    // THE CONSEQUENCE, NOT THE ABSTRACTION. Mass land denial is forbidden outright at 1, 2
    // and 3, so where the card puts you needs no verdict and no count — which is what makes
    // this sentence available at all, and what separates it from the withdrawn push line.
    it("says where the card puts you, at every reading", () => {
      for (const declared of [null, 4, 5] as const) {
        expect(draw({ facts: facts({ massLandDenial: true }), declared })[0]).toContain(
          "Nothing below Optimized",
        );
      }
      for (const declared of [1, 2, 3] as const) {
        expect(draw({ facts: facts({ massLandDenial: true }), declared })[0]).toContain(
          "you declared",
        );
      }
    });
  });

  describe("n5 / n6 — extra turns", () => {
    it("n6: undeclared prints the reading and the count alone", () => {
      expect(draw({ facts: facts({ extraTurn: true }), counts: counts({ extraTurns: 2 }) })).toEqual([
        "We read this as an extra-turn card, your 3rd.",
      ]);
    });

    it("a declared bracket 1 is the one that allows none", () => {
      expect(draw({ facts: facts({ extraTurn: true }), declared: 1 })[0]).toBe(
        "We read this as an extra-turn card, your 1st. Exhibition allows none.",
      );
    });

    it("n5: declared 2 and 3 quote the chaining rule", () => {
      for (const declared of [2, 3] as const) {
        expect(draw({ facts: facts({ extraTurn: true }), declared })[0]).toContain(
          "rule is about chaining them",
        );
      }
    });

    // "Neither Optimized nor cEDH has a rule about extra turns" — so there is no rule to name
    // and the note must not invent one.
    it("declared 4 and 5 take the n6 form, because no such rule exists up there", () => {
      for (const declared of [4, 5] as const) {
        const [sentence] = draw({ facts: facts({ extraTurn: true }), declared });
        expect(sentence).toBe("We read this as an extra-turn card, your 1st.");
        expect(sentence).not.toContain("chaining");
      }
    });
  });

  describe("n7 — tutors", () => {
    // NO TUTOR GATE (§5, locked). The sentence is identical at every declaration, which is
    // the rule rather than a coincidence, so it is asserted across all six.
    it("reads identically declared or not, at every bracket", () => {
      const expected = ["A tutor, and your 6th. No bracket limits how many you play."];
      for (const declared of [null, 1, 2, 3, 4, 5] as const) {
        expect(draw({ facts: facts({ tutor: true }), declared, counts: counts({ tutor: 5 }) })).toEqual(
          expected,
        );
      }
    });
  });

  describe("order and the cap", () => {
    const all = facts({ gameChanger: true, massLandDenial: true, extraTurn: true, tutor: true });

    it("a row draws two facts, in the table’s order", () => {
      const drawn = draw({ facts: all, density: "row" });
      // Game changer, then mass land denial and its disclaimer. Extra turns and the tutor are
      // past the cap.
      expect(drawn).toEqual([
        "A game changer, and your 1st.",
        cardNote.massLandDenial.plain,
        cardNote.massLandDenial.disclaimer,
      ]);
    });

    it("a tile draws one fact", () => {
      expect(draw({ facts: all, density: "tile" })).toEqual(["A game changer, and your 1st."]);
    });

    // The cap counts FACTS. Mass land denial is one fact carrying two sentences on a row, and
    // a cap written over sentences would admit only one more fact beside it there.
    it("mass land denial fills one fact slot, both its sentences included", () => {
      expect(draw({ facts: facts({ massLandDenial: true, tutor: true }), density: "row" })).toEqual([
        cardNote.massLandDenial.plain,
        cardNote.massLandDenial.disclaimer,
        "A tutor, and your 1st. No bracket limits how many you play.",
      ]);
    });

    it("the second fact on a row is whichever comes next in the order, not whichever is set", () => {
      expect(draw({ facts: facts({ extraTurn: true, tutor: true }), density: "row" })).toEqual([
        "We read this as an extra-turn card, your 1st.",
        "A tutor, and your 1st. No bracket limits how many you play.",
      ]);
    });
  });

  // A failed flags read is UNKNOWN, not zero — `NoteCounts` says why. These two kinds are the
  // only ones that come off `card_bracket_flags`, and the CANDIDATE's own facts come from a
  // separate read that can succeed while the deck's fails. Without this, a correctly detected
  // mass land denial is introduced as `your 1st` to a deck already holding three.
  describe("a count nobody has", () => {
    const unknown = { ...EMPTY_NOTE_COUNTS, extraTurns: null };

    it("draws no extra-turn sentence when the deck’s count is unknown", () => {
      expect(draw({ facts: facts({ extraTurn: true }), counts: unknown })).toEqual([]);
    });

    // MASS LAND DENIAL IS NOT SUPPRESSED, and that is the correction: its sentence carries no
    // ordinal, so a failed flags read on the DECK takes nothing away from it. The card fact
    // comes from the candidate's own read and the rules fact is the rules'. Withheld in #854
    // by a guard written for the two kinds that do carry a count.
    it("still draws the mass-land-denial sentence, which needs no count", () => {
      expect(draw({ facts: facts({ massLandDenial: true }), counts: unknown })).toEqual([
        cardNote.massLandDenial.plain,
        cardNote.massLandDenial.disclaimer,
      ]);
    });

    // The other two kinds survive that failure: a game changer is a column on `cards` and a
    // tutor is read off oracle text, so neither count was ever in the flags map.
    it("still draws the two kinds the flags read was never the source of", () => {
      expect(
        draw({ facts: facts({ gameChanger: true, tutor: true }), counts: unknown }),
      ).toEqual([
        "A game changer, and your 1st.",
        "A tutor, and your 1st. No bracket limits how many you play.",
      ]);
    });

    // And an unknown kind does not spend a slot on the way past: the row's two-fact cap is
    // filled by the two it CAN draw rather than by one it cannot.
    it("does not spend the cap on a kind it cannot draw", () => {
      expect(
        draw({
          facts: facts({ gameChanger: true, extraTurn: true, tutor: true }),
          counts: unknown,
          density: "row",
        }),
      ).toEqual([
        "A game changer, and your 1st.",
        "A tutor, and your 1st. No bracket limits how many you play.",
      ]);
    });
  });

  describe("the rule it enforces", () => {
    // Every sentence this function can emit, swept for the vocabulary the 2026-09-21 ruling
    // removed. A note is a claim about a CARD; nothing here may state, imply or predict what
    // the deck permits.
    it("never says anything about what the deck permits", () => {
      const forbidden = [/permit/i, /\bmoves\b/i, /push/i, /your bracket\b/i, /changes your/i];
      for (const declared of [null, 1, 2, 3, 4, 5] as const) {
        for (const density of ["row", "tile"] as const) {
          const drawn = draw({
            facts: facts({ gameChanger: true, massLandDenial: true, extraTurn: true, tutor: true }),
            declared,
            density,
          });
          for (const sentence of drawn) {
            for (const pattern of forbidden) expect(sentence).not.toMatch(pattern);
          }
        }
      }
    });

    // A combo completion is n8, and it is drawn by combo awareness rather than by the note.
    // The string exists in the copy module; nothing here may emit it.
    it("draws no combo sentence, even for a candidate that completes one", () => {
      const withCombo = facts({
        completesCombos: [
          {
            variantId: "v-1",
            cards: [{ oracleId: "o-2", name: "Partner" }],
            produces: ["Infinite mana"],
            bracketTag: "",
            usesCommander: false,
            manaValueNeeded: null,
            manaNeeded: null,
            steps: null,
            notablePrerequisites: null,
          },
        ],
      });
      expect(draw({ facts: withCombo })).toEqual([]);
    });
  });
});
