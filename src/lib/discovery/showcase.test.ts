import { describe, expect, it } from "vitest";
import { showcaseCopy, writtenForYouCopy } from "../copy/discovery";
import { tuningHubCopy } from "../copy/tuning-hub";
import type { SwitchName } from "../flags/registry";
import { showcaseGroups, toolCopyFor, tryHref, writtenForYou, type ShowcaseInput } from "./showcase";
import { TOOLS } from "./tools";

const deck = (id: string, name: string) => ({ id, name });

function input(over: Partial<ShowcaseInput> = {}): ShowcaseInput {
  return {
    isOn: () => true,
    fits: {},
    deckCount: 3,
    hasSyncBase: true,
    place: false,
    ...over,
  };
}

const card = (groups: ReturnType<typeof showcaseGroups>, id: string) =>
  groups.flatMap((g) => g.cards).find((c) => c.id === id);

// Small items 6, item 3 (About-Errata board, call c): the Try it line follows Suggested changes v2's switch.
describe("toolCopyFor", () => {
  const V2_LINE = "Say what to change. Pick from more cards to add and to cut than you need.";
  it("draws Suggested changes v2's line with v2 on and the shipped line with it off", () => {
    const on = (n: SwitchName) => n === "SUGGESTED_CHANGES_V2_ENABLED";
    expect(toolCopyFor("suggested-changes", on).line).toBe(V2_LINE);
    expect(toolCopyFor("suggested-changes", () => false).line).toBe(showcaseCopy.tools["suggested-changes"].line);
    expect(card(showcaseGroups(input()), "suggested-changes")!.copy.line).toBe(V2_LINE);
    const off = card(showcaseGroups(input({ isOn: (n) => n !== "SUGGESTED_CHANGES_V2_ENABLED" })), "suggested-changes")!;
    expect(off.copy.line).toBe("Up to five swaps, read from your games, your notes and the list.");
  });

  it("leaves a tool with no switched line as it is", () => {
    expect(toolCopyFor("mana-balance", () => true)).toBe(showcaseCopy.tools["mana-balance"]);
  });
});

describe("showcaseGroups", () => {
  it("draws all fourteen tools in C2's five groups, in order, with every switch on", () => {
    const groups = showcaseGroups(input());
    expect(groups.map((g) => g.group)).toEqual(["start", "tune", "buy", "own", "play"]);
    expect(groups.flatMap((g) => g.cards.map((c) => c.id))).toEqual(TOOLS.map((t) => t.id));
  });

  it("has copy for every tool, and a none-line for every tool that opens a deck", () => {
    for (const t of TOOLS) {
      const copy = showcaseCopy.tools[t.id];
      expect(copy.name).toBeTruthy();
      if (t.lands.kind === "deck") expect("none" in copy && copy.none).toBeTruthy();
      else expect("press" in copy && copy.press).toBeTruthy();
    }
  });

  // No tool has a switch left (the Analysis tab's, the last, retired 2026-11-01): every switch off drops no card.
  it("drops no tool with every switch off (STATES: switch off)", () => {
    const groups = showcaseGroups(input({ isOn: () => false }));
    expect(card(groups, "mana-balance")).toBeDefined();
    expect(card(groups, "proposed-cuts")).toBeDefined();
    expect(card(groups, "suggested-changes")).toBeDefined();
    // Top off, the friends tools, the swap tools and Help me choose (their switches retired) have no switch: they always draw.
    expect(card(groups, "help-me-choose")).toBeDefined();
    expect(card(groups, "stand-ins")).toBeDefined();
    expect(card(groups, "find-a-deck")).toBeDefined();
    expect(card(groups, "top-off")).toBeDefined();
    expect(card(groups, "friend-spares")).toBeDefined();
    expect(card(groups, "friends")).toBeDefined();
  });

  it("opens the first fitting deck, counting the rest (one fits, several fit)", () => {
    const groups = showcaseGroups(
      input({
        fits: {
          "top-off": { decks: [deck("d1", "HD - Kratos")] },
          "mana-balance": { decks: [deck("d2", "Gishath"), deck("d3", "Atraxa"), deck("d4", "Yuriko")] },
        },
      }),
    );
    expect(card(groups, "top-off")!.state).toEqual({ kind: "deck", href: "/decks/d1?tool=top-off", deck: "HD - Kratos", more: 0 });
    expect(card(groups, "mana-balance")!.state).toEqual({ kind: "deck", href: "/decks/d2?tool=mana-balance", deck: "Gishath", more: 2 });
  });

  it("says what a tool needs when no deck fits, with a door only where another screen helps", () => {
    const groups = showcaseGroups(input({ fits: { "top-off": { decks: [] }, "friend-spares": { decks: [] } } }));
    expect(card(groups, "top-off")!.state).toEqual({ kind: "none", line: showcaseCopy.tools["top-off"].none, door: null });
    expect(card(groups, "friend-spares")!.state).toEqual({
      kind: "none",
      line: showcaseCopy.tools["friend-spares"].none,
      door: { href: "/friends", label: "Open Friends →" },
    });
    // A deck tool the fits were never asked about reads as none, never as a press with no deck.
    expect(card(groups, "matchups")!.state.kind).toBe("none");
  });

  it("names where a tool with a page of its own goes, with the landing's parameter", () => {
    const groups = showcaseGroups(input());
    expect(card(groups, "help-me-choose")!.state).toEqual({ kind: "page", href: "/decks/new/choose?tool=help-me-choose", label: "Open Help me choose" });
    expect(card(groups, "find-a-deck")!.state).toEqual({ kind: "page", href: "/collection?avail=free&tool=find-a-deck", label: "Try it on a card you own" });
  });

  it("with no decks at all, every tool that reads decks says so, and the rest still open", () => {
    const groups = showcaseGroups(input({ deckCount: 0, fits: { "top-off": { decks: [] } } }));
    for (const id of ["top-off", "stand-ins", "matchups", "find-a-deck", "lineup"]) {
      expect(card(groups, id)!.state).toEqual({ kind: "none", line: showcaseCopy.needsADeck, door: null });
    }
    expect(card(groups, "wishlist")!.state.kind).toBe("page");
  });

  it("notes Collection Sync's missing base and still offers the upload (G14)", () => {
    const sync = card(showcaseGroups(input({ hasSyncBase: false })), "collection-sync")!;
    expect(sync.note).toBe(showcaseCopy.syncNoBase);
    expect(sync.state.kind).toBe("page");
    expect(card(showcaseGroups(input()), "collection-sync")!.note).toBeNull();
  });

  it("carries each tool's cost chip from the registry, verbatim, with Suggested changes v2 off", () => {
    const groups = showcaseGroups(input({ isOn: (name) => name !== "SUGGESTED_CHANGES_V2_ENABLED" }));
    for (const t of TOOLS) expect(card(groups, t.id)!.credit).toBe(t.credit);
    expect(card(groups, "suggested-changes")!.credit).toBe(tuningHubCopy.tools.suggested.cost);
  });

  it("Suggested changes v2 on: its chip says v2's cost (2 credits over 10 changes), every other chip unchanged", () => {
    const groups = showcaseGroups(input());
    expect(card(groups, "suggested-changes")!.credit).toBe(tuningHubCopy.tools.suggested.costV2);
    expect(card(groups, "suggested-changes")!.copy.line).toBe(showcaseCopy.tools["suggested-changes"].lineWhen!.SUGGESTED_CHANGES_V2_ENABLED);
    const off = showcaseGroups(input({ isOn: (name) => name !== "SUGGESTED_CHANGES_V2_ENABLED" }));
    expect(card(off, "suggested-changes")!.copy.line).toBe(showcaseCopy.tools["suggested-changes"].line);
    expect(card(off, "suggested-changes")!.copy.line).not.toMatch(/20/);
    for (const t of TOOLS) if (t.id !== "suggested-changes") expect(card(groups, t.id)!.credit).toBe(t.credit);
  });
});

describe("tryHref", () => {
  it("adds the parameter to a path with or without a query", () => {
    expect(tryHref("/friends", "friends")).toBe("/friends?tool=friends");
    expect(tryHref("/decks?view=stats", "lineup")).toBe("/decks?view=stats&tool=lineup");
  });
});

describe("writtenForYou", () => {
  it("draws all five spenders and the whole free line", () => {
    const w = writtenForYou(false);
    expect(w.rows.map((r) => r.id)).toEqual(["overview", "suggested", "look-deeper", "help-me-choose", "find-a-deck-read"]);
    expect(w.rows).toEqual(writtenForYouCopy.rows);
    expect(w.free).toBe(writtenForYouCopy.free);
  });

  it("Suggested changes v2 on: the suggested row says what v2 does and costs; off, the shipped words", () => {
    const on = writtenForYou(true).rows.find((r) => r.id === "suggested")!;
    expect(on.what).toBe(writtenForYouCopy.suggestedV2.what);
    expect(on.cost).toBe(writtenForYouCopy.suggestedV2.cost);
    expect(on.short).toBe(writtenForYouCopy.suggestedV2.short);
    const off = writtenForYou(false).rows.find((r) => r.id === "suggested")!;
    expect(off).toEqual(writtenForYouCopy.rows[1]);
    expect(`${off.what} ${off.cost} ${off.short}`).not.toMatch(/\b2\b|20/);
    // Every other row is the same either way.
    const others = (v2: boolean) => writtenForYou(v2).rows.filter((r) => r.id !== "suggested");
    expect(others(true)).toEqual(others(false));
  });
});

