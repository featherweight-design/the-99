import { describe, expect, it } from "vitest";
import { commanderSlug } from "./slug";

describe("commanderSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(commanderSlug("Muldrotha, the Gravetide")).toBe("muldrotha-the-gravetide");
  });
  it("strips apostrophes and diacritics", () => {
    expect(commanderSlug("K'rrik, Son of Yawgmoth")).toBe("krrik-son-of-yawgmoth");
    expect(commanderSlug("Dandân")).toBe("dandan");
  });
  // #712: U+A789 is a modifier letter colon, not a colon. EDHREC serves this
  // commander at `ratonhnhaketon` (200); the separating pass used to turn the
  // mark into a hyphen and ask for `ratonhnhake-ton`, which has no page.
  it("drops a modifier mark inside a word rather than separating on it", () => {
    expect(commanderSlug("Ratonhnhak\u00e9\ua789ton")).toBe("ratonhnhaketon");
    expect(commanderSlug("Ka\u02bbiwi, the Mark")).toBe("kaiwi-the-mark");
  });
  it("uses only the front face of a DFC name", () => {
    expect(commanderSlug("Esika, God of the Tree // The Prismatic Bridge")).toBe("esika-god-of-the-tree");
  });

  // #333: every one of these 403'd before, because each period became its own
  // hyphen. The expected slugs were verified against json.edhrec.com.
  it("drops the periods in an initialism rather than separating on them", () => {
    expect(commanderSlug("Scientist Supreme of A.I.M.")).toBe("scientist-supreme-of-aim");
    expect(commanderSlug("Nick Fury, Agent of S.H.I.E.L.D.")).toBe("nick-fury-agent-of-shield");
    expect(commanderSlug("M.O.D.O.K.")).toBe("modok");
    expect(commanderSlug("H.E.R.B.I.E., Lovable Robot")).toBe("herbie-lovable-robot");
    expect(commanderSlug("U.S.S. Enterprise-D, Galaxy-Class")).toBe("uss-enterprise-d-galaxy-class");
    // The shape with no space anywhere near the periods: the initialism runs
    // straight into the next word, so the period is the only thing between them
    // and dropping it joins the two. EDHREC serves `usagent-john-walker` (200).
    expect(commanderSlug("U.S.Agent, John Walker")).toBe("usagent-john-walker");
  });

  // The other half of the rule. Every period is dropped, titles included, but a
  // period followed by a space is output-equivalent either way: the space earns
  // the hyphen the period would have. Without this control the fix could trade
  // ten broken slugs for a different set of them.
  it("leaves a title's slug unchanged, because the following space earns the hyphen", () => {
    expect(commanderSlug("Mr. Orfeo, the Boulder")).toBe("mr-orfeo-the-boulder");
    expect(commanderSlug("Mr. House, President and CEO")).toBe("mr-house-president-and-ceo");
  });
});
