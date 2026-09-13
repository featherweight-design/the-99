import { describe, expect, it } from "vitest";
import { countCharacters, deckTuningCopy } from "./deck-tuning";
import { gameLogCopy } from "./game-log";

/**
 * The presentation rules #10 inherits from #9, checked across the whole module
 * at once — the point being that a string added by hand later cannot quietly
 * break one.
 */
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [];
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

const strings = allStrings(deckTuningCopy);

describe("deckTuningCopy", () => {
  it("has strings to check", () => {
    expect(strings.length).toBeGreaterThan(5);
  });

  // #9's rules, and the game note is drawn on #9's form.
  it("shows no percentages", () => {
    for (const s of strings) expect(s).not.toMatch(/%/);
  });

  it("never says net", () => {
    for (const s of strings) expect(s).not.toMatch(/\bnet\b/i);
  });

  // The readBack line ends on its separator because an emphasised clause follows it
  // in the markup. That is the only string here allowed to end unfinished, and
  // naming it is what stops a second one being added by habit.
  it("ends every line but the read-back one on a finished clause", () => {
    for (const s of strings) {
      if (s === deckTuningCopy.note.readBack) continue;
      expect(s.trimEnd()).not.toMatch(/[—,]$/);
    }
  });

  it("counts up to the cap with its denominator", () => {
    expect(deckTuningCopy.note.counter("0", "140")).toBe("0 / 140");
    expect(deckTuningCopy.note.counter("140", "140")).toBe("140 / 140");
  });

  // The warning has to land before the cap, or it never lands at all.
  it("warns before it stops", () => {
    expect(deckTuningCopy.note.warnAt).toBeLessThan(deckTuningCopy.note.maxLength);
  });

  // The column's check is the other half of this number, and the two disagreeing
  // would mean a field that accepts what the database refuses.
  it("caps at the 140 the column enforces", () => {
    expect(deckTuningCopy.note.maxLength).toBe(140);
  });

  // The optional line is an amendment, not a second string: #9's says marks are
  // optional, and this one has to still be about both.
  it("amends #9's optional line rather than repeating it", () => {
    expect(deckTuningCopy.note.optionalNote).not.toBe(gameLogCopy.form.optionalNote);
    expect(deckTuningCopy.note.optionalNote).toContain("note");
    expect(gameLogCopy.form.optionalNote).not.toContain("note");
  });

  // The column counts code points and JavaScript counts UTF-16 code units, so
  // the two disagree the moment anybody types an emoji. Three layers read this
  // function — the counter, the action, and by implication the column — and a
  // second definition creeping into any of them is the bug it exists to stop.
  describe("countCharacters", () => {
    it("counts plain text the obvious way", () => {
      expect(countCharacters("Flooded out.")).toBe(12);
      expect(countCharacters("")).toBe(0);
    });

    it("counts an astral character once, as the column does", () => {
      expect("😀".length).toBe(2);
      expect(countCharacters("😀")).toBe(1);
    });

    // The case that would have been refused: 71 emoji is 142 code units and 71
    // characters, and only one of those numbers is over the cap.
    it("lets a note the column would accept through the cap", () => {
      const note = "😀".repeat(71);
      expect(note.length).toBeGreaterThan(deckTuningCopy.note.maxLength);
      expect(countCharacters(note)).toBeLessThanOrEqual(deckTuningCopy.note.maxLength);
    });
  });
});
