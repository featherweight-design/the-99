import { describe, expect, it } from "vitest";
import { showcaseCopy, writtenForYouCopy } from "../copy/discovery";
import { refreshCopy } from "../copy/refresh";
import type { ShowcaseGroup } from "../discovery/showcase";
import { daysUntil, expiringAt, lotFacts, stripFacts, welcomeSheet } from "./welcome-sheet";
import { welcomeSheetFor } from "./welcome-read";
import type { WelcomeState } from "./welcome-state";

const rows = writtenForYouCopy.rows;
const NOW = new Date("2026-10-21T12:00:00Z");
const AT = new Date("2026-11-20T12:00:00Z");

/** A showcase with Help me choose's page and the two deck tools on the decks given (null: nothing fits). */
function groups(deck: string | null): ShowcaseGroup[] {
  const card = (id: string, state: ShowcaseGroup["cards"][number]["state"]) =>
    ({ id, copy: {}, credit: null, entry: id, state, note: null }) as unknown as ShowcaseGroup["cards"][number];
  const deckState = deck ? { kind: "deck" as const, href: `/decks/${deck}?tool=x`, deck: "D", more: 0 } : { kind: "none" as const, line: "x", door: null };
  return [
    { group: "start", cards: [card("help-me-choose", { kind: "page", href: "/decks/new/choose?tool=help-me-choose", label: "Help me choose" })] },
    { group: "tune", cards: [card("proposed-cuts", deckState), card("suggested-changes", deckState)] },
  ];
}

describe("welcomeSheet", () => {
  it("before a collection: no Try it, the shipped lock line once over all five", () => {
    const s = welcomeSheet({ written: rows, cards: 0, decks: 0, groups: groups("d1") })!;
    expect(s.shape).toBe("locked");
    expect(s.line).toEqual({ kind: "lock", text: refreshCopy.firstRun.step2Locked });
    expect(s.lead).toEqual([]);
    expect(s.rows.map((r) => r.id)).toEqual(rows.map((r) => r.id));
    expect(s.rows.every((r) => r.tryHref === null)).toBe(true);
  });

  it("cards and no deck: Help me choose leads with its Try it, the reason line once over the other four", () => {
    const s = welcomeSheet({ written: rows, cards: 12, decks: 0, groups: groups(null) })!;
    expect(s.shape).toBe("noDeck");
    expect(s.lead.map((r) => [r.id, r.tryHref])).toEqual([["help-me-choose", "/decks/new/choose?tool=help-me-choose"]]);
    expect(s.line).toEqual({ kind: "reason", text: showcaseCopy.needsADeck });
    expect(s.rows.map((r) => r.id)).toEqual(["overview", "suggested", "look-deeper", "find-a-deck-read"]);
    expect(s.rows.every((r) => r.tryHref === null)).toBe(true);
  });

  it("with a deck: About's order, Try it on the tools with a landing the resolver gives", () => {
    const s = welcomeSheet({ written: rows, cards: 12, decks: 2, groups: groups("d1") })!;
    expect(s.shape).toBe("decks");
    expect(s.line).toBeNull();
    expect(s.rows.map((r) => [r.id, r.tryHref])).toEqual([
      ["overview", null],
      ["suggested", "/decks/d1?tool=x"],
      ["look-deeper", "/decks/d1?tool=x"],
      ["help-me-choose", "/decks/new/choose?tool=help-me-choose"],
      ["find-a-deck-read", null],
    ]);
  });

  it("with a deck nothing fits, a deck tool's row has no Try it", () => {
    const s = welcomeSheet({ written: rows, cards: 12, decks: 1, groups: groups(null) })!;
    expect(s.rows.find((r) => r.id === "suggested")!.tryHref).toBeNull();
  });

  it("is absent with every row off", () => {
    expect(welcomeSheet({ written: null, cards: 12, decks: 1, groups: groups("d1") })).toBeNull();
    expect(welcomeSheet({ written: [], cards: 12, decks: 1, groups: groups("d1") })).toBeNull();
  });
});

describe("welcomeSheetFor", () => {
  const ON = {
    ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true",
    PROPOSED_CUTS_ENABLED: "true", SWAP_TOOLS_ENABLED: "true",
  } as unknown as NodeJS.ProcessEnv;

  it("draws the rows whose caption lines survive the reader's switches", () => {
    const s = welcomeSheetFor({ ...ON, TUNING_ENABLED: "off" }, { cards: 0, decks: [] })!;
    expect(s.rows.map((r) => r.id)).toEqual(["overview", "look-deeper", "help-me-choose", "find-a-deck-read"]);
  });

  it("follows SUGGESTED_CHANGES_V2_ENABLED: on, the Suggested changes row says v2's cost; off, the shipped one", () => {
    const row = (env: NodeJS.ProcessEnv) => welcomeSheetFor(env, { cards: 0, decks: [] })!.rows.find((r) => r.id === "suggested")!;
    const on = row({ ...ON, SUGGESTED_CHANGES_V2_ENABLED: "true" });
    expect(on.short).toBe(writtenForYouCopy.suggestedV2.short);
    expect(on.cost).toBe(writtenForYouCopy.suggestedV2.cost);
    const off = row(ON);
    expect(off.short).toBe(writtenForYouCopy.rows[1].short);
    expect(off.cost).toBe(writtenForYouCopy.rows[1].cost);
    expect(`${off.short} ${off.cost}`).not.toMatch(/\b2\b/);
    // The kill switch beats it: TUNING off takes v2 with it (the row itself goes).
    expect(welcomeSheetFor({ ...ON, TUNING_ENABLED: "off", SUGGESTED_CHANGES_V2_ENABLED: "true" }, { cards: 0, decks: [] })!.rows.map((r) => r.id))
      .not.toContain("suggested");
  });

  it("is null with every row's switch off, so no Where they work is drawn", () => {
    expect(welcomeSheetFor({} as unknown as NodeJS.ProcessEnv, { cards: 0, decks: [] })).toBeNull();
  });
});

describe("the lot's facts", () => {
  const lot: WelcomeState = { kind: "partly", lot: "partly", units: 15, left: 9, expiresAt: AT, teaser: true };

  it("draws the strip for a live lot, never for none or dismissed", () => {
    expect(stripFacts(lot, NOW, 1)).toEqual({ lot: "partly", units: 15, left: 9, expiresAtMs: AT.getTime(), days: 30, teaser: true, free: 1 });
    expect(stripFacts({ kind: "none" }, NOW, 1)).toBeNull();
    expect(stripFacts({ ...lot, kind: "dismissed" }, NOW, 1)).toBeNull();
  });

  it("keeps a dismissed lot for the /credits cell's sheet", () => {
    expect(lotFacts({ ...lot, kind: "dismissed" }, NOW, 1)?.left).toBe(9);
    expect(lotFacts({ kind: "none" }, NOW, 1)).toBeNull();
  });

  it("counts whole days up, never under one, and warns inside three", () => {
    expect(daysUntil(new Date(NOW.getTime() + 2.5 * 86_400_000), NOW)).toBe(3);
    expect(daysUntil(new Date(NOW.getTime() + 60_000), NOW)).toBe(1);
    expect(expiringAt(new Date(NOW.getTime() + 3 * 86_400_000), NOW)).toBe(true);
    expect(expiringAt(new Date(NOW.getTime() + 3 * 86_400_000 + 1), NOW)).toBe(false);
    expect(expiringAt(NOW, NOW)).toBe(false);
  });
});
