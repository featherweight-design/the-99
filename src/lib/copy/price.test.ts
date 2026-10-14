import { describe, expect, it } from "vitest";
import { priceCopy } from "./price";

describe("priceCopy", () => {
  // Silence is a state, and it must stay unnameable. A key here is the first
  // step toward rendering "—" or "$0.00" for a card the feed has never
  // stocked, which is the one thing this pass must not do.
  it("has no string for the absent state", () => {
    expect(priceCopy.tag).not.toHaveProperty("absent");
    expect(priceCopy.tag).not.toHaveProperty("unknown");
    expect(priceCopy.tag).not.toHaveProperty("noPrice");
  });

  it("qualifies the figure without labelling it", () => {
    expect(priceCopy.tag.foil).toBe("foil");
    expect(priceCopy.tag.etched).toBe("etched");
    expect(priceCopy.tag.soldOut).toBe("sold out");
  });

  it("names what is missing in the strip's clause", () => {
    expect(priceCopy.strip.pricedClause(6, 8)).toBe("6 of 8 priced");
  });

  it("keeps the provenance line free of alarm words", () => {
    const line = [
      priceCopy.strip.provenance,
      priceCopy.strip.lastChecked("Monday"),
      priceCopy.strip.behind,
    ].join(" · ");
    expect(line).toBe("prices from Mana Pool · last checked Monday · these are behind");
    expect(line).not.toMatch(/error|failed|warning|stale|out of date|problem/i);
  });

  // One utterance per price. The behind form appends a clause to the same
  // sentence rather than adding a second one, so a screen reader on an old
  // table hears one price, not two statements about it.
  it("speaks a price once, in both provenance forms", () => {
    expect(priceCopy.aria.priced("$45.00", "Monday")).toBe(
      "$45.00 at Mana Pool, last checked Monday",
    );
    expect(priceCopy.aria.pricedBehind("$45.00", "12 August")).toBe(
      "$45.00 at Mana Pool, last checked 12 August, these prices are behind",
    );
    expect(
      priceCopy.aria.pricedBehind("$45.00", "12 August").startsWith(
        priceCopy.aria.priced("$45.00", "12 August"),
      ),
    ).toBe(true);
  });

  it("no longer claims pricing is planned", () => {
    expect(priceCopy.export.pricingNote).not.toMatch(/planned|coming soon/i);
  });

  // A guard for whoever adds the next string: this codebase's shipped copy
  // uses the curly apostrophe. None of these strings has one today.
  it("uses no straight apostrophe", () => {
    const walk = (v: unknown): string[] =>
      typeof v === "string"
        ? [v]
        : typeof v === "function"
          ? [(v as (...a: never[]) => string)("1" as never, "2" as never)]
          : typeof v === "object" && v !== null
            ? Object.values(v).flatMap(walk)
            : [];
    for (const s of walk(priceCopy)) expect(s).not.toContain("'");
  });
});
