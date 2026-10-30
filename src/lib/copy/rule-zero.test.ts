import { describe, expect, it } from "vitest";

import { named } from "../person-name/mint";
import { plain } from "../person-name/testing";
import { ruleZeroCopy as copy, whose } from "./rule-zero";

/** Every string the module holds, functions called with sample arguments, so a sweep can read them all. */
function allStrings(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (typeof node === "function") {
    const args = Array.from({ length: node.length }, (_, i) => (i % 2 === 0 ? "Name" : 3));
    return allStrings((node as (...a: unknown[]) => unknown)(...args));
  }
  if (node && typeof node === "object") return Object.values(node).flatMap(allStrings);
  return [];
}

describe("ruleZeroCopy", () => {
  // Pinned literally: each was edited by the 2026-10-17 copy review (readiness gap 14 and its other findings),
  // and a regression to the handoff's draft would keep any substring test green.
  it("keeps the copy review's edits", () => {
    expect(copy.swap.sub("Upgraded")).toBe("Your decks that read nearer Upgraded. A swap changes it for everyone at the table.");
    expect(copy.setup.leaveItSub).toBe("their seat waits until they pick");
    expect(plain(copy.setup.notFriendRow(named("Max")))).toBe("Max picks their own");
    expect(copy.setup.notFriendSub).toBe("not your friend, so their decks aren’t listed");
    expect(copy.setup.tooFew).toBe("Seat one more player.");
    expect(copy.setup.friendDecksFoot).toBe("Name and commander only. Brackets appear once the table is set.");
    expect(copy.read.nothingBody).toBe("A read needs two seats with decks we’ve read.");
    expect(plain(copy.expired.body(named("Thursday night"), named("Colin")))).toBe(
      "Thursday night’s table closed 24 hours after Colin set it. Games logged from it stay on each deck’s Games tab.",
    );
  });

  // Brief lock 3: the read says what it cannot see, on every read and on every low seat.
  it("says counts can miss cards on the honesty line and on a low seat", () => {
    expect(copy.read.honest).toBe(
      "Each bracket is read from the list. Game Changers are exact; combos, tutors, extra turns and land denial can be "
        + "missed. A flag is a reason to talk, not a ruling.",
    );
    expect(copy.seat.whyLow("Core")).toContain("Counts can miss cards");
  });

  // Never color alone: each flag's words are the tag.
  it("names each flag in words", () => {
    expect(copy.seat.above).toBe("Above the table");
    expect(copy.seat.below).toBe("Below the table");
    expect(copy.seat.split).toBe("Split");
  });

  it("speaks the seat states as the boards draw them", () => {
    expect(copy.seat.short(87)).toBe("87 of 100 cards.");
    expect(copy.seat.over(101)).toBe("101 cards, over 100.");
    expect(copy.seat.readingNow).toBe("Reading this deck.");
    expect(copy.seat.stale).toBe("from before its last change");
    expect(copy.seat.undeclared("Core")).toBe("not declared · measured from Core");
    expect(copy.seat.drifted("Exhibition", "Optimized")).toBe("declared Exhibition, outside this reading · measured from Optimized");
    expect(copy.read.leftOut(1)).toBe("One seat isn’t in the read yet.");
    expect(copy.read.leftOut(2)).toBe("2 seats aren’t in the read yet.");
  });

  it("opens a headline on the seat's owner, capitalized for the viewer", () => {
    expect(plain(copy.read.high(whose(named("Colin")), named("Zimone Combo")))).toBe("Colin’s Zimone Combo reads above the table.");
    expect(plain(copy.read.low(whose(null), "Giada Angels"))).toBe("Your Giada Angels reads below the table.");
  });

  // US English, no em dash, and no "tick" (readiness gap 14).
  it("holds no em dash, no British spelling and no tick", () => {
    const strings = allStrings(copy);
    expect(strings.length).toBeGreaterThan(80);
    for (const s of strings) {
      expect(s).not.toContain("—");
      expect(s).not.toMatch(/\b(grey|colour|analyse|favourite|tick)\b/i);
      expect(s).not.toMatch(/\bhis\b/i);
    }
  });
});
