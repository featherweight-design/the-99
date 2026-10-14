import { describe, expect, it } from "vitest";
import { resultLineWithAside, resultSentence } from "./result-line";

// The component these cases used to render is gone: the rack is a
// `FilterChassis` mount now, and the chassis draws `ui/result-line.tsx`.
// The live region, the atomic announcement and the 300ms debounce are covered
// there, once, in `src/components/ui/result-line.test.tsx`.
//
// What stayed here is the sentence, which is the half the chassis cannot
// derive: it reads lane copy, and the two lanes word the same count
// differently.
describe("resultSentence", () => {
  it("states the lane at rest rather than printing a ratio", () => {
    expect(resultSentence(148, 148, "owned")).toBe("148 commanders you own and haven’t built");
  });

  it("never prints a denominator equal to its numerator", () => {
    expect(resultSentence(3301, 3301, "discover")).not.toMatch(/3,301 of 3,301/);
  });

  it("prints the ratio once something is filtered", () => {
    expect(resultSentence(4, 148, "owned")).toBe("4 of 148 commanders match");
  });

  it("words the two lanes differently at rest", () => {
    expect(resultSentence(9, 9, "owned")).not.toBe(resultSentence(9, 9, "discover"));
  });

  // The aside is appended to this sentence by the caller rather than opening a
  // second line — a second line would move the list under the reader's eye.
  it("composes with the Exactly aside on one line", () => {
    // Calls the SHARED composer the rack calls. Hand-composing the separator
    // here asserted a second copy of the rule and stayed green when the rack's
    // copy changed, which is how this test survived the em-dash sweep.
    expect(resultLineWithAside(2, 148, "owned", 6)).toBe(
      "2 of 148 commanders match. Exactly excludes 6 that Any would show",
    );
  });

  it("is the sentence alone when nothing is excluded", () => {
    expect(resultLineWithAside(2, 148, "owned", null)).toBe(resultSentence(2, 148, "owned"));
  });
});
