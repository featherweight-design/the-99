import { describe, expect, it } from "vitest";
import { noteVariant } from "./note-variant.mjs";
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
