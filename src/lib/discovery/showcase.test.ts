import { describe, expect, it } from "vitest";
import { aboutEntries } from "../copy/about-entries";
import { showcaseCopy, writtenForYouCopy } from "../copy/discovery";
import { creditsEntryOf, resolveEntry, visibleEntries } from "../about/visible";
import type { SwitchName } from "../switches/registry";
import { showcaseGroups, tryHref, writtenForYou, type ShowcaseInput } from "./showcase";
import { TOOLS } from "./tools";

const ALL_ENTRIES = new Set(TOOLS.map((t) => t.entry));
const deck = (id: string, name: string) => ({ id, name });

function input(over: Partial<ShowcaseInput> = {}): ShowcaseInput {
  return {
    isOn: () => true,
    visibleEntryIds: ALL_ENTRIES,
    fits: {},
    deckCount: 3,
    hasSyncBase: true,
    place: false,
    ...over,
  };
}

const card = (groups: ReturnType<typeof showcaseGroups>, id: string) =>
  groups.flatMap((g) => g.cards).find((c) => c.id === id);

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

  it("drops a tool whose switch is off, and a group left empty (STATES: switch off)", () => {
    const off = (...names: SwitchName[]) => (n: SwitchName) => !names.includes(n);
    const groups = showcaseGroups(input({ isOn: off("SWAP_TOOLS_ENABLED", "SOCIAL_FRIENDS_ENABLED") }));
    expect(card(groups, "stand-ins")).toBeUndefined();
    expect(card(groups, "friend-spares")).toBeUndefined();
    expect(groups.map((g) => g.group)).not.toContain("buy");
    expect(card(groups, "find-a-deck")).toBeUndefined();
    expect(card(groups, "friends")).toBeUndefined();
    // Top off has no switch: it always draws.
    expect(card(groups, "top-off")).toBeDefined();
  });

  it("drops a tool whose About entry the reader cannot see (R2 gap 8)", () => {
    const visible = new Set([...ALL_ENTRIES].filter((e) => e !== "upload-choice"));
    expect(card(showcaseGroups(input({ visibleEntryIds: visible })), "collection-sync")).toBeUndefined();
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
    expect(showcaseCopy.opens("Gishath", 2)).toBe("Opens Gishath · +2");
    expect(showcaseCopy.opens("HD - Kratos", 0)).toBe("Opens HD - Kratos");
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

  it("carries each tool's cost chip from the registry, verbatim", () => {
    const groups = showcaseGroups(input());
    for (const t of TOOLS) expect(card(groups, t.id)!.credit).toBe(t.credit);
  });
});

describe("tryHref", () => {
  it("adds the parameter to a path with or without a query", () => {
    expect(tryHref("/friends", "friends")).toBe("/friends?tool=friends");
    expect(tryHref("/decks?view=stats", "lineup")).toBe("/decks?view=stats&tool=lineup");
  });
});

describe("writtenForYou", () => {
  const credits = aboutEntries.find((e) => e.id === "credits")!;
  const env = (off: string[] = []): NodeJS.ProcessEnv => {
    const on = {} as NodeJS.ProcessEnv;
    for (const name of [
      "ANALYSIS_TAB_ENABLED", "TUNING_ENABLED", "HELP_ME_CHOOSE_ENABLED", "PROPOSED_CUTS_ENABLED",
      "FIND_A_DECK_READ_ENABLED", "SWAP_TOOLS_ENABLED",
    ]) on[name] = off.includes(name) ? "off" : "true";
    return on;
  };

  it("holds a row for every spender line in the credits entry", () => {
    for (const r of writtenForYouCopy.rows) expect(credits.caption).toContain(r.line);
    expect(credits.caption).toContain(writtenForYouCopy.historyLine);
  });

  it("draws all five with every switch on, and the whole free line", () => {
    const w = writtenForYou(resolveEntry(credits, env()).caption)!;
    expect(w.rows.map((r) => r.id)).toEqual(["overview", "suggested", "look-deeper", "help-me-choose", "find-a-deck-read"]);
    expect(w.free).toBe(writtenForYouCopy.free);
  });

  it("follows each line's switch: the Overview with the Analysis tab, Help me choose and its History half", () => {
    const w = writtenForYou(resolveEntry(credits, env(["ANALYSIS_TAB_ENABLED", "HELP_ME_CHOOSE_ENABLED"])).caption)!;
    expect(w.rows.map((r) => r.id)).not.toContain("overview");
    expect(w.rows.map((r) => r.id)).not.toContain("help-me-choose");
    expect(w.free).toBe(writtenForYouCopy.freeBracket);
  });

  it("reads the same rows from buying-credits, the form a reader with payments is drawn (launch-end batch)", () => {
    const buying = aboutEntries.find((e) => e.id === "buying-credits")!;
    for (const r of writtenForYouCopy.rows) expect(buying.caption).toContain(r.line);
    const paid = { ...env(), PAYMENTS_ENABLED: "true" } as NodeJS.ProcessEnv;
    const drawn = creditsEntryOf(visibleEntries(paid))!;
    expect(drawn.id).toBe("buying-credits");
    const w = writtenForYou(drawn.caption)!;
    expect(w.rows.map((r) => r.id)).toEqual(["overview", "suggested", "look-deeper", "help-me-choose", "find-a-deck-read"]);
    expect(w.free).toBe(writtenForYouCopy.free);
  });

  it("is absent when the credits entry is not visible or no spender survives", () => {
    expect(writtenForYou(null)).toBeNull();
    expect(writtenForYou("Some features write something just for you.")).toBeNull();
  });
});
