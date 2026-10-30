import { describe, expect, it } from "vitest";

import { isDegenerateShortReason, SHORT_REASON_MAX, shortReasonFrom, withShortReason } from "./short-reason";

describe("isDegenerateShortReason", () => {
  it("calls empty, blank, one-letter and non-string values degenerate, and a real summary not", () => {
    for (const v of ["", "   ", "x", "-", "?", "ok", undefined, null, 3]) expect(isDegenerateShortReason(v)).toBe(true);
    for (const v of ["Ramp", "Cheap draw", "Non-Elf body misses elf payoffs."]) expect(isDegenerateShortReason(v)).toBe(false);
  });
});

describe("shortReasonFrom", () => {
  it("takes the first sentence when it fits", () => {
    expect(shortReasonFrom("The overview names Fog for when the deck is racing. It stops a combat."))
      .toBe("The overview names Fog for when the deck is racing.");
  });

  it("takes the first clause when the sentence is too long and the clause stands alone", () => {
    expect(shortReasonFrom("Double strike on one creature is slow and fragile, since removal on the carrier wastes the equip cost."))
      .toBe("Double strike on one creature is slow and fragile");
  });

  it("cuts the sentence at a word, within the cap, when no clause fits", () => {
    const long = "A situational pump that adds mana-value-based power but does not build mana or the elf count, and it can leave the deck exposed.";
    const got = shortReasonFrom(long);
    expect(got.length).toBeLessThanOrEqual(SHORT_REASON_MAX);
    expect(got.endsWith("…")).toBe(true);
    expect(long.startsWith(got.slice(0, -1))).toBe(true);
  });

  it("skips a clause too short to stand alone", () => {
    const got = shortReasonFrom("This is a Human, so it adds nothing to the elf count that drives mana and Marwyn counters here.");
    expect(got).not.toBe("This is a Human");
    expect(got.length).toBeLessThanOrEqual(SHORT_REASON_MAX);
  });

  it("reads past a card name's abbreviation to the sentence's end", () => {
    expect(shortReasonFrom("Dr. Julius Jumblemorph draws a card each turn. It also ramps.")).toBe("Dr. Julius Jumblemorph draws a card each turn.");
    expect(shortReasonFrom("Mr. Orfeo, the Boulder hits hard. Keep him.")).toBe("Mr. Orfeo, the Boulder hits hard.");
  });

  it("reads whitespace runs as one space", () => {
    expect(shortReasonFrom("  Cheap   ramp\nfor the plan.  ")).toBe("Cheap ramp for the plan.");
  });
});

describe("withShortReason", () => {
  const line = { card: "Fog", rationale: "Stops a combat. It buys a turn.", rationaleShort: "", evidence: [] };

  it("rebuilds an empty or degenerate short reason from the rationale", () => {
    expect(withShortReason(line)).toEqual({ ...line, rationaleShort: "Stops a combat." });
    expect(withShortReason({ ...line, rationaleShort: "x" })).toEqual({ ...line, rationaleShort: "Stops a combat." });
    const { rationaleShort: _s, ...missing } = line;
    expect(withShortReason(missing)).toEqual({ ...line, rationaleShort: "Stops a combat." });
  });

  it("leaves a good short reason, a line with no usable rationale, and a non-object as they came", () => {
    const good = { ...line, rationaleShort: "Buys a turn" };
    expect(withShortReason(good)).toBe(good);
    const noRationale = { ...line, rationale: " " };
    expect(withShortReason(noRationale)).toBe(noRationale);
    expect(withShortReason(null)).toBeNull();
    expect(withShortReason("x")).toBe("x");
  });
});
