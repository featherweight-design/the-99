import { describe, expect, it } from "vitest";
import { CLAIM_BY } from "./accept";
import { buildProsePrompt, buildProseRetryPrompt, proseInputHash, shortName } from "./prompt";

const TAGS = [
  { slug: "spellslinger", label: "Spellslinger", count: 900 },
  { slug: "reanimator", label: "Reanimator", count: 400 },
];

describe("shortName", () => {
  it("drops the epithet after the comma", () => {
    expect(shortName("Kess, Dissident Mage")).toBe("Kess");
  });

  it("takes the front face of a split card", () => {
    expect(shortName("Gwen Stacy // Ghost-Spider")).toBe("Gwen Stacy");
  });

  // Both markers at once, and the one that matters is whichever comes first — this name is
  // 56 characters printed, one more than the entire claim budget.
  it("takes the front face before the epithet", () => {
    expect(shortName("Uvilda, Dean of Perfection // Nassari, Dean of Expression")).toBe("Uvilda");
  });

  it("leaves a name carrying neither marker alone", () => {
    expect(shortName("Urabrask the Hidden")).toBe("Urabrask the Hidden");
  });
});

describe("buildProsePrompt", () => {
  it("names the commander in full and the subject in short", () => {
    const p = buildProsePrompt("Kess, Dissident Mage", TAGS);
    expect(p).toContain("Kess, Dissident Mage decks tend to play");
    expect(p).toContain('"Kess decks"');
  });

  // The version 1 failure. The prompt asked for an opening and a threshold whose arithmetic
  // it never did, so for most commanders it was asking for a sentence the contract rejects.
  // Doing the subtraction here is the fix, so the figure is pinned.
  it("states the characters left for the claim once the subject is spent", () => {
    // "Kess decks " is 11 characters of the 55.
    expect(buildProsePrompt("Kess, Dissident Mage", TAGS)).toContain(
      `leaving about ${CLAIM_BY - 11} characters for the claim`,
    );
  });

  it("leaves a long-named commander a smaller budget, not an impossible one", () => {
    // "Shang-Chi and the Ten Rings" carries no comma, so the subject stays long: 34
    // characters with " decks " and the trailing space. That leaves 21 — tight, but a claim
    // fits in 21 characters, where version 1's mandated "decks tend to" opening left 13.
    expect(buildProsePrompt("Shang-Chi and the Ten Rings", TAGS)).toContain(
      `leaving about ${CLAIM_BY - 34} characters for the claim`,
    );
  });

  it("lists the themes most common first", () => {
    expect(buildProsePrompt("Kess, Dissident Mage", TAGS)).toContain(
      "most common first: Spellslinger, Reanimator.",
    );
  });

  it("says so when there are no themes rather than listing none", () => {
    expect(buildProsePrompt("Kess, Dissident Mage", [])).toContain("No theme data is available");
  });
});

describe("buildProseRetryPrompt", () => {
  const rejected =
    "Urabrask the Hidden decks tend to overwhelm opponents early with haste-enabled aggro, usually backed by burn.";

  // Retrying the identical prompt returned byte-identical sentences three times over, so a
  // retry that does not carry the rejection back is three generations bought for one answer.
  it("differs from the first attempt's prompt", () => {
    expect(buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading")).not.toBe(
      buildProsePrompt("Urabrask the Hidden", TAGS),
    );
  });

  it("quotes the rejected string back", () => {
    expect(buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading")).toContain(
      rejected,
    );
  });

  it("names the rule that was broken, not just that one was", () => {
    const p = buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "front-loading");
    expect(p).toContain(`first comma fell after character ${CLAIM_BY}`);
    expect(p).not.toContain("carried no hedge");
  });

  it("gives different advice for a different rule", () => {
    const p = buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "hedge");
    expect(p).toContain("carried no hedge");
  });

  it("keeps the whole first-attempt prompt, so the retry is still under every rule", () => {
    expect(buildProseRetryPrompt("Urabrask the Hidden", TAGS, rejected, "length")).toContain(
      buildProsePrompt("Urabrask the Hidden", TAGS),
    );
  });
});

describe("proseInputHash", () => {
  it("is stable for the same inputs", () => {
    expect(proseInputHash("oracle-kess", TAGS)).toBe(proseInputHash("oracle-kess", TAGS));
  });

  it("ignores the order the tags arrive in, since it sorts by count", () => {
    expect(proseInputHash("oracle-kess", [...TAGS].reverse())).toBe(
      proseInputHash("oracle-kess", TAGS),
    );
  });

  it("moves when the tags move", () => {
    expect(proseInputHash("oracle-kess", TAGS)).not.toBe(
      proseInputHash("oracle-kess", [{ slug: "aristocrats", label: "Aristocrats", count: 900 }]),
    );
  });
});
