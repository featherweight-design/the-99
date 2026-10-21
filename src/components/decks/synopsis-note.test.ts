// The credit note's one rule: the server says whether a press writes (the live list has no
// overview); the allowance picks the form; anything not yet read for the list on screen is silent.

import { describe, expect, it } from "vitest";

import { synopsisState } from "./__fixtures__/synopsis";
import { pressNote } from "./synopsis-note";
import { deckNoticesCopy } from "../../lib/copy/notices";
import { synopsisCopy } from "../../lib/copy/synopsis";
import type { SynopsisView } from "./synopsis-state";
import type { SynopsisState } from "../../lib/synopsis/read";

const ready = (over: Partial<SynopsisState> = {}, current = true): SynopsisView =>
  ({ kind: "ready", state: synopsisState(over), busy: false, current });
const out = { used: 3, limit: 3, reopensAt: new Date(), nextAt: new Date() };

describe("pressNote", () => {
  // Deck notices HANDOFF §6: while a legality entry stands the slot reads the check, first and
  // whatever the list or the credits would say, and the press writes nothing.
  it("reads the overview check on a deck holding a card that is not legal", () => {
    for (const over of [{ pressWrites: true }, { pressWrites: false }, { pressWrites: true, allowance: out }]) {
      const n = pressNote(ready({ ...over, illegal: true }), "analyze")!;
      expect(n).toEqual({ text: deckNoticesCopy.check.note, writes: false, see: true });
    }
  });

  it("names the credit a writing press spends, and says it writes", () => {
    const n = pressNote(ready({ pressWrites: true }), "analyze")!;
    expect(n.writes).toBe(true);
    expect(n.text).toMatch(/^Also writes the overview, using a credit\. 2 of 3 left/);
  });

  it("says a paid credit when the free allowance is spent and the press takes one (L3)", () => {
    const n = pressNote(ready({ pressWrites: true, allowance: { ...out, pack: 2, paidUsedToday: 0, paidLimit: 20 } }), "analyze")!;
    expect(n.writes).toBe(true);
    expect(n.text).toMatch(/^Also writes the overview, using a paid credit\. 0 of \d+ free/);
  });

  // 7d: the list already has its overview, so the press returns it and spends nothing.
  // Welcome credits D2: the welcome lot is spent before plan and packs, so a run it funds says so.
  it("says a welcome credit when the welcome lot funds the run", () => {
    const n = pressNote(ready({ pressWrites: true, allowance: { ...out, welcome: 15, pack: 2, paidUsedToday: 0, paidLimit: 20 } }), "analyze")!;
    expect(n.text).toMatch(/^Also writes the overview, using a welcome credit\./);
    expect(n.writes).toBe(true);
  });

  it("draws nothing over a list that already has its overview", () => {
    expect(pressNote(ready({ pressWrites: false }), "reanalyze")).toBeNull();
  });

  it("reads the bracket only with every credit out, in each press's own words", () => {
    const a = pressNote(ready({ pressWrites: true, allowance: out }), "analyze")!;
    const r = pressNote(ready({ pressWrites: true, allowance: out }), "reanalyze")!;
    expect([a.writes, r.writes]).toEqual([false, false]);
    expect(a.text).toMatch(/^Reads the bracket only; the overview waits for a credit\. 0 of 3 left/);
    expect(r.text).toMatch(/^Reads the bracket only; the overview stays as it was\. 0 of 3 left/);
  });

  it("writes over a spent allowance while a paid lot holds a credit (payments L2)", () => {
    expect(pressNote(ready({ pressWrites: true, allowance: { ...out, pack: 2 } }), "analyze")!.writes).toBe(true);
  });

  it("is silent until the state has been read for the list on screen", () => {
    expect(pressNote({ kind: "idle" }, "analyze")).toBeNull();
    expect(pressNote(ready({ pressWrites: true }, false), "analyze")).toBeNull();
  });

  it("says the owner's share is used, and writes nothing", () => {
    const n = pressNote(ready({ pressWrites: true, allowance: { used: 0, limit: 3, reopensAt: null, nextAt: null, ownerShare: true } }), "reanalyze")!;
    expect(n.writes).toBe(false);
    expect(n.text).toMatch(/^Reads the bracket only; you’ve used your testing share for \w+\.$/);
  });

  // Build rule 2: the method-change rewrite spends no credit, so Re-analyze writes it whatever the
  // allowance says, and the note says so in place of every credit form.
  it("says the rewrite is free, and writes, while a free try is left", () => {
    for (const allowance of [undefined, out, { ...out, used: 0, ownerShare: true as const }]) {
      for (const attemptsLeft of [2, 1]) {
        const n = pressNote(ready({ pressWrites: true, methodNotice: { attemptsLeft }, ...(allowance ? { allowance } : {}) } as never), "reanalyze")!;
        expect(n).toEqual({ text: synopsisCopy.pressNote.free, writes: true });
      }
    }
  });

  it("goes back to the credit rules once both free tries are used", () => {
    const n = pressNote(ready({ pressWrites: true, methodNotice: { attemptsLeft: 0 }, allowance: out }), "reanalyze")!;
    expect(n.writes).toBe(false);
    expect(n.text).toMatch(/^Reads the bracket only/);
  });

  // Build rule 6: where Re-analyze would write nothing, "writes it the new way" would be false.
  it("draws nothing over a list that already has its overview, free try or not", () => {
    expect(pressNote(ready({ pressWrites: false, methodNotice: { attemptsLeft: 2 } }), "reanalyze")).toBeNull();
  });

  // Rule 8 + the check's own precedence: a legality entry still wins.
  it("lets the legality check win over the free note", () => {
    expect(pressNote(ready({ pressWrites: true, illegal: true, methodNotice: { attemptsLeft: 2 } }), "reanalyze")!.see).toBe(true);
  });
});
