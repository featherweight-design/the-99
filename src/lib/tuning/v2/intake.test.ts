import { describe, expect, it } from "vitest";

import { suggestedChangesV2Copy } from "../../copy/suggested-changes-v2";
import { appendSentence, bracketCard, removeSentence, GAME_NOTE_MAX, pickIndex, hasOverviewContent, noticedChips, usualFor, type NoticedFacts, type NoticedRole } from "./intake";

const copy = suggestedChangesV2Copy.intake;

const role = (r: string, have: number, target: number, advisory = false): NoticedRole => ({
  role: r, label: r[0].toUpperCase() + r.slice(1), have, target, advisory,
});
const none: NoticedFacts = { roles: [], focus: null, game: null };

describe("noticedChips", () => {
  it("draws nothing when there is nothing to say", () => {
    expect(noticedChips(none)).toEqual([]);
    // Every role at or over its target, and the land cell short but advisory.
    expect(noticedChips({ ...none, roles: [role("ramp", 10, 10), role("draw", 12, 10), role("land", 30, 36, true)] })).toEqual([]);
  });

  it("orders the four as the handoff does: worst role gap, focus, newest game note, second role gap", () => {
    const chips = noticedChips({
      roles: [role("ramp", 9, 10), role("draw", 7, 10), role("removal", 6, 10), role("wipes", 3, 3), role("land", 30, 36, true)],
      focus: "+1/+1 counters",
      game: { note: "ran out of cards by turn 7", date: "Oct 24" },
    });
    expect(chips.map((c) => c.id)).toEqual(["role:removal", "focus", "game", "role:draw"]);
    expect(chips[0]).toMatchObject({ kind: "role", text: copy.noticed.roleShortChip("removal"), meta: copy.noticed.roleOf(6, 10), sentence: copy.noticed.roleShort("removal", 6, 10) });
    expect(chips[1]).toMatchObject({ kind: "focus", text: copy.noticed.focusChip("+1/+1 counters"), meta: copy.noticed.focusMeta, sentence: copy.noticed.focus("+1/+1 counters") });
    expect(chips[2]).toMatchObject({ kind: "game", text: copy.noticed.gameChip("ran out of cards by turn 7"), meta: "Oct 24" });
    expect(chips[3]).toMatchObject({ kind: "role", text: copy.noticed.roleIsChip("Draw", 7, 10), meta: null, sentence: copy.noticed.roleShort("draw", 7, 10) });
  });

  it("breaks a tie between gaps by the mix's own order", () => {
    const chips = noticedChips({ ...none, roles: [role("ramp", 8, 10), role("draw", 8, 10)] });
    expect(chips.map((c) => c.id)).toEqual(["role:ramp", "role:draw"]);
  });

  it("clips a long game note and skips a blank one", () => {
    const long = "x".repeat(GAME_NOTE_MAX + 40);
    const [chip] = noticedChips({ ...none, game: { note: long, date: "Oct 2" } });
    expect([...chip.text].length).toBeLessThanOrEqual(GAME_NOTE_MAX + 2);
    expect(chip.text.endsWith("…”")).toBe(true);
    expect(noticedChips({ ...none, game: { note: "   ", date: "Oct 2" } })).toEqual([]);
  });
});

describe("removeSentence", () => {
  it("takes the sentence out with the space that joined it, and leaves the rest as written", () => {
    expect(removeSentence("Cut the legends. More removal.", "More removal.")).toEqual({ next: "Cut the legends." });
    expect(removeSentence("More removal. Cut the legends.", "More removal.")).toEqual({ next: "Cut the legends." });
    expect(removeSentence("More removal.", "More removal.")).toEqual({ next: "" });
    expect(removeSentence("A. More removal. B.", "More removal.")).toEqual({ next: "A. B." });
    expect(removeSentence("Cut the legends.", "More removal.")).toBeNull();
  });
});

describe("appendSentence", () => {
  it("appends at the end, after a space, never replacing typed words", () => {
    expect(appendSentence("", "More removal.", 500)).toEqual({ next: "More removal." });
    expect(appendSentence("Cut the legends.", "More removal.", 500)).toEqual({ next: "Cut the legends. More removal." });
    expect(appendSentence("Cut the legends. ", "More removal.", 500)).toEqual({ next: "Cut the legends. More removal." });
  });

  it("does nothing when the sentence is already there or would pass the cap", () => {
    expect(appendSentence("More removal. And more.", "More removal.", 500)).toBeNull();
    expect(appendSentence("abc", "More removal.", 10)).toBeNull();
  });
});

describe("bracketCard", () => {
  const b = copy.bracket;
  const shape = (permits: Parameters<typeof bracketCard>[0]) => bracketCard(permits)!.options.map((o) => `${o.choice}:${o.target}`);

  it("at 1: Keep, then Up to 2, 3 and 4, and no Down", () => {
    expect(shape([1])).toEqual(["keep:1", "up:2", "up:3", "up:4"]);
    expect(bracketCard([1])!.now).toBe(b.now(1, "Exhibition"));
  });

  it("at 2: Keep at 2 · Core first, Down to 1, Up to 3 and 4, each with its note", () => {
    const card = bracketCard([2])!;
    expect(shape([2])).toEqual(["keep:2", "down:1", "up:3", "up:4"]);
    expect(card.options.map((o) => o.label)).toEqual([b.keep(2, "Core"), b.down(1, "Exhibition"), b.up(3, "Upgraded"), b.up(4, "Optimized")]);
    expect(card.options.map((o) => o.note)).toEqual([b.noteKeep(2, "Core"), b.noteDown(1, "Exhibition"), b.noteUp(3, "Upgraded"), b.noteUp(4, "Optimized")]);
  });

  it("at 4: Keep, then Down to 3, 2 and 1, and no Up past Optimized", () => {
    expect(shape([4])).toEqual(["keep:4", "down:3", "down:2", "down:1"]);
  });

  it("over a range: Keep holds the range (aimed at its upper member), Down below it, Up above it", () => {
    const low = bracketCard([1, 2])!;
    expect(shape([1, 2])).toEqual(["keep:2", "up:3", "up:4"]);
    expect(low.now).toBe(b.nowRange(1, 2, "Exhibition or Core"));
    expect(low.options[0].label).toBe(b.keepRange(1, 2, "Exhibition or Core"));
    expect(low.options[0].mark).toBe(1);
    // Keep on a range carries its bottom; a single bracket, and every Down and Up, carry none.
    expect(low.options[0].low).toBe(1);
    expect(bracketCard([4, 5])!.options[0].low).toBe(4);
    expect(bracketCard([2])!.options[0].low).toBeUndefined();
    expect(low.options.slice(1).every((o) => o.low === undefined)).toBe(true);
    expect(shape([4, 5])).toEqual(["keep:5", "down:3", "down:2", "down:1"]);
  });

  it("is null with no reading", () => {
    expect(bracketCard([])).toBeNull();
  });
});

describe("hasOverviewContent", () => {
  it("reads an overview the run would: a strategy or Key cards", () => {
    const primer = (strategy: string[]) => ({ strategy, mulligan: { keep: [], sendBack: [] }, tips: [] });
    expect(hasOverviewContent(null)).toBe(false);
    expect(hasOverviewContent({ primer: null, keyCards: null })).toBe(false);
    expect(hasOverviewContent({ primer: primer([]), keyCards: [] })).toBe(false);
    expect(hasOverviewContent({ primer: primer(["Go wide."]), keyCards: null })).toBe(true);
    expect(hasOverviewContent({ primer: null, keyCards: [{} as never] })).toBe(true);
  });
});

describe("usualFor", () => {
  it("names the nearest measured point: 3 up to 6, 10 up to 15, 20 past that", () => {
    expect([1, 6].map(usualFor)).toEqual([copy.usual[3], copy.usual[3]]);
    expect([7, 15].map(usualFor)).toEqual([copy.usual[10], copy.usual[10]]);
    expect([16, 20].map(usualFor)).toEqual([copy.usual[20], copy.usual[20]]);
  });
});

describe("pickIndex", () => {
  it("holds a choice by identity across readings, and falls back to Keep when it is gone", () => {
    const at2 = bracketCard([2])!;
    const at3 = bracketCard([3])!;
    const down1 = { choice: "down" as const, target: 1 as const };
    expect(at2.options[pickIndex(at2, down1)]).toMatchObject(down1);
    expect(at3.options[pickIndex(at3, down1)]).toMatchObject(down1);
    expect(pickIndex(at3, null)).toBe(0);
    expect(pickIndex(bracketCard([4])!, { choice: "up", target: 3 })).toBe(0);
  });
});
