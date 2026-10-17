import { describe, expect, it } from "vitest";
import { hubMoveRule, judgeHubMove, noteVariant } from "./note-variant.mjs";
import { synopsisCopy } from "../../src/lib/copy/synopsis";
import { creditsCopy } from "../../src/lib/copy/credits";
import { deckNoticesCopy } from "../../src/lib/copy/notices";

const next = new Date("2026-10-15T12:15:00Z");

describe("noteVariant reads the shipped copy", () => {
  it("names every note the press can draw", () => {
    expect(noteVariant(synopsisCopy.pressNote.writes(creditsCopy.standing(4, 5, next)))).toBe("credit");
    expect(noteVariant(synopsisCopy.pressNote.free)).toBe("free");
    expect(noteVariant(`${deckNoticesCopy.check.note} See which →`)).toBe("check");
    expect(noteVariant(`${synopsisCopy.pressNote.analyzeUsedUp} ${creditsCopy.spent(5, next)}`)).toBe("usedUp");
    expect(noteVariant(`${synopsisCopy.pressNote.reanalyzeUsedUp} ${creditsCopy.spent(5, next)}`)).toBe("usedUp");
    expect(noteVariant(synopsisCopy.pressNote.ownerShare("October"))).toBe("ownerShare");
    expect(noteVariant("Something the probe has never seen.")).toBe("unknown");
    expect(noteVariant(null)).toBe("none");
  });
});

describe("judgeHubMove", () => {
  const two = { text: synopsisCopy.pressNote.free, lines: 2, lineHeight: 17 };
  const long = { text: `${synopsisCopy.pressNote.analyzeUsedUp} ${creditsCopy.spent(5, next)}`, lines: 4, lineHeight: 17 };
  it("holds a covered note to 1px", () => {
    expect(judgeHubMove([100, 100.5], two).ok).toBe(true);
    expect(judgeHubMove([100, 156], two).ok).toBe(false);
  });
  it("lets a longer note move by its extra lines and no more", () => {
    expect(hubMoveRule(long).allowed).toBe(35);
    expect(judgeHubMove([100, 124], long).ok).toBe(true);
    expect(judgeHubMove([100, 156], long).ok).toBe(false);
  });
  it("never passes an unknown note, and fails with no tops", () => {
    expect(judgeHubMove([100], { text: "Nope.", lines: 1, lineHeight: 17 }).ok).toBe(false);
    expect(judgeHubMove([], two).ok).toBe(false);
  });
});
