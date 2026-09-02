import { describe, expect, it } from "vitest";
import { classifyEngine, type CommanderEngine } from "./engine";

const GISA =
  "{B}, {T}, Sacrifice another creature: Create X 2/2 black Zombie creature tokens, where X is the sacrificed creature's power.";
const YAWGMOTH =
  "Protection from Humans\nPay 1 life, Sacrifice another creature: Put a -1/-1 counter on up to one target creature and draw a card.\n{B}{B}, Discard a card: Proliferate. (Choose any number of permanents and/or players, then give each another counter of each kind already there.)";
const AYARA =
  "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life.\n{T}, Sacrifice another black creature: Draw a card.";
const BRAIDS =
  "At the beginning of your end step, you may sacrifice an artifact, creature, enchantment, land, or planeswalker. If you do, each opponent may sacrifice a permanent of their choice that shares a card type with it. For each opponent who doesn't, that player loses 2 life and you draw a card.";

describe("classifyEngine", () => {
  const cases: [string, string, CommanderEngine][] = [
    // Only route to her value is gated behind {T} — she must survive a turn cycle.
    // This is the classification #215 exists to surface.
    ["Ghoulcaller Gisa", GISA, "tap"],
    // Costs, but no {T}: usable the turn he lands and repeatable within a turn.
    ["Yawgmoth, Thran Physician", YAWGMOTH, "activated"],
    // Both a trigger AND a {T} ability. The trigger is free and works on landing,
    // so least-restrictive-wins must pick it. If this case ever returns "tap",
    // the precedence has been inverted back — see the spec's §6 review note.
    ["Ayara, First of Locthwain", AYARA, "triggered"],
    ["Braids, Arisen Nightmare", BRAIDS, "triggered"],
  ];

  it.each(cases)("classifies %s as %s", (_name, oracleText, expected) => {
    expect(classifyEngine({ oracleText })).toBe(expected);
  });

  it("prefers etb over a tap ability on the same card", () => {
    expect(
      classifyEngine({ oracleText: "When this creature enters, draw a card.\n{T}: Add {B}." }),
    ).toBe("etb");
  });

  it("falls back to static for rules text with no gated ability", () => {
    expect(classifyEngine({ oracleText: "Creatures you control get +1/+1." })).toBe("static");
  });

  it("returns null for a vanilla legendary with no rules text", () => {
    // Genuinely unclassifiable on this axis. Guessing would be worse than absence.
    expect(classifyEngine({ oracleText: null })).toBeNull();
    expect(classifyEngine({ oracleText: "   " })).toBeNull();
  });

  it("ignores the back face of a modal double-faced card", () => {
    // transform.ts joins faces with "\n//\n". Splitting on " // " instead would
    // return the whole string and let the back face's {T} classify the front —
    // the #79 bug class. This test is the guard.
    const joined = "When this creature enters, draw a card.\n//\n{T}: Add {B}.";
    expect(classifyEngine({ oracleText: joined })).toBe("etb");
  });

  it("does not read a reminder-text tap symbol as an activated ability", () => {
    // Overgrown Tomb's entire text is parenthetical reminder text.
    expect(
      classifyEngine({ oracleText: "({T}: Add {B} or {G}.)\nAs this land enters, you may pay 2 life." }),
    ).toBe("static");
  });
});
