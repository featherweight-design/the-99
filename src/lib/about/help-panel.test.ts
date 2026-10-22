import { describe, expect, it } from "vitest";
import { firstSentence, restOfFirstParagraph } from "./caption";
import { elsewhereChips, elsewhereKind, entriesAt, entryHref, helpTitle, placeName, type HelpPlace } from "./help-panel";
import type { EntryPayload } from "./entries-payload";

const e = (id: string, screen: EntryPayload["screen"], view?: EntryPayload["view"]): EntryPayload => ({
  id, title: id, caption: `${id}.`, keys: [], screen, ...(view ? { view } : {}),
});

const ENTRIES = [
  e("a", "deck", "your-deck"), e("b", "deck", "your-deck"), e("s", "deck", "shopping"), e("t", "deck", "stats"),
  e("an", "deck", "analysis"), e("g", "deck", "games"), e("v", "deck", "versions"),
  e("c", "collection"), e("cd", "card-details"), e("se", "sets"), e("up", "upload"), e("h", "home"),
];
const deck = (view: HelpPlace["view"]): HelpPlace => ({ screen: "deck", view });

describe("the ? panel's list", () => {
  it("lists a screen's entries and, on a deck, the view's", () => {
    expect(entriesAt(ENTRIES, deck("your-deck")).map((x) => x.id)).toEqual(["a", "b"]);
    expect(entriesAt(ENTRIES, deck("shopping")).map((x) => x.id)).toEqual(["s"]);
    expect(entriesAt(ENTRIES, { screen: "collection" }).map((x) => x.id)).toEqual(["c"]);
    expect(entriesAt(ENTRIES, { screen: "home" }).map((x) => x.id)).toEqual(["h"]);
  });

  it("titles the screen in view, with a deck's view", () => {
    expect(helpTitle(deck("shopping"))).toBe("A deck · Shopping");
    expect(helpTitle({ screen: "collection" })).toBe("Collection · Cards");
    expect(helpTitle({ screen: "home" })).toBe("Home");
  });

  it("names a place short for the section head and the chips", () => {
    expect(placeName(deck("your-deck"))).toBe("Your deck");
    expect(placeName({ screen: "collection" })).toBe("Cards");
    expect(placeName({ screen: "sets" })).toBe("Sets");
    expect(placeName({ screen: "upload" })).toBe("Upload a file");
    expect(placeName({ screen: "card-details" })).toBe("Card details");
    expect(placeName({ screen: "commanders" })).toBe("Commanders");
  });

  it("links an entry to its place in the Reference", () => {
    expect(entryHref("stand-ins")).toBe("/about?tab=reference#stand-ins");
  });
});

describe("Elsewhere", () => {
  it("is the deck page's and Collection's alone", () => {
    expect(elsewhereKind("deck")).toBe("deck");
    for (const s of ["collection", "card-details", "sets", "proxies", "history", "wishlist", "upload"] as const) expect(elsewhereKind(s)).toBe("collection");
    expect(elsewhereKind("home")).toBeNull();
    expect(elsewhereChips(ENTRIES, { screen: "home" }, { screen: "home" })).toEqual([]);
  });

  it("on Your deck: every other view in order, none with zero entries (Notes has none here)", () => {
    const chips = elsewhereChips(ENTRIES, deck("your-deck"), deck("your-deck"));
    expect(chips.map((c) => c.label)).toEqual(["Shopping", "Stats", "Analysis", "Games", "Versions"]);
    expect(chips.map((c) => c.count)).toEqual([1, 1, 1, 1, 1]);
  });

  it("on Shopping: All first, for Your deck's entries", () => {
    const chips = elsewhereChips(ENTRIES, deck("shopping"), deck("shopping"));
    expect(chips.map((c) => c.label)).toEqual(["All", "Stats", "Analysis", "Games", "Versions"]);
    expect(chips[0]).toMatchObject({ count: 2, place: deck("your-deck") });
  });

  it("a chip chosen leaves the chips and the place it replaced comes back", () => {
    const chips = elsewhereChips(ENTRIES, deck("your-deck"), deck("games"));
    expect(chips.map((c) => c.label)).toEqual(["Your deck", "Shopping", "Stats", "Analysis", "Versions"]);
  });

  it("on Collection · Cards: its other tabs, Card details and Upload a file", () => {
    const chips = elsewhereChips(ENTRIES, { screen: "collection" }, { screen: "collection" });
    expect(chips.map((c) => `${c.label} ${c.count}`)).toEqual(["Card details 1", "Sets 1", "Upload a file 1"]);
  });
});

describe("a caption's lead", () => {
  it("splits the first paragraph at its first sentence", () => {
    const cap = "One thing. Then another! And a third.\n\nA second paragraph.";
    expect(firstSentence(cap)).toBe("One thing.");
    expect(restOfFirstParagraph(cap)).toBe("Then another! And a third.");
  });

  it("is empty past a one-sentence paragraph", () => {
    expect(restOfFirstParagraph("Only this.\n\nMore.")).toBe("");
  });

  it("reads the ? button standing alone as a word, not a sentence's end (launch-end batch, getting-help)", () => {
    const cap = "Every screen has a ? with the About entries. Open one.";
    expect(firstSentence(cap)).toBe("Every screen has a ? with the About entries.");
    expect(firstSentence("Not sure where it lands? Press Analyze.")).toBe("Not sure where it lands?");
    expect(firstSentence("- A ? on every screen. More.")).toBe("A ? on every screen.");
  });

  it("reads a list's later items after its first", () => {
    const cap = "- First item. Still first.\n- Second item.";
    expect(firstSentence(cap)).toBe("First item.");
    expect(restOfFirstParagraph(cap)).toBe("Still first. Second item.");
  });
});
