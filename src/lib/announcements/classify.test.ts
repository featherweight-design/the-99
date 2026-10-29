import { describe, expect, it } from "vitest";
import { classifyAnnouncement, isCommanderDecklistTitle, isSecretLair, type AnnouncementKind } from "./classify";
import { parseDecklists, type ParsedDeck } from "./decklists";
import { parsePost } from "./post";
import { fixture, postUrl } from "./__fixtures__/load";

const classifyFixture = (slug: string): AnnouncementKind => {
  const r = parsePost(fixture(`${slug}.html`), postUrl(slug));
  if (!r.ok) throw new Error(JSON.stringify(r));
  return classifyAnnouncement({ title: r.post.title, url: r.post.url, decks: parseDecklists(r.post.bodyHtml).decks });
};

describe("classifyAnnouncement on real posts", () => {
  it.each<[string, AnnouncementKind]>([
    ["star-trek-commander-decklists", "commander-decklists"],
    ["foundations-commander-decklists", "commander-decklists"],
    ["heads-i-win-tails-you-lose-commander-decklist-2021-11-18", "commander-decklists"],
    ["secret-lair-set-phasers-to-superdrop", "secret-lair"],
    // a Secret Lair Commander Deck post with its full list: decklists win (see classify.ts)
    ["secret-lair-commander-deck-odds-and-ends-decklist", "commander-decklists"],
    ["star-trek-product-delays-in-select-regions", "other"],
    // lists, but 40-card ones with no commander
    ["star-trek-welcome-decks", "other"],
  ])("%s → %s", (slug, kind) => expect(classifyFixture(slug)).toBe(kind));
});

const commanderDeck: ParsedDeck = {
  title: "T", format: "main-deck", cards: [{ name: "Kenrith", count: 1 }, { name: "Wastes", count: 99 }],
  cardCount: 100, commanders: ["Kenrith"], commanderCandidate: "Wastes",
};
const welcomeDeck: ParsedDeck = { ...commanderDeck, cardCount: 40, commanders: [], commanderCandidate: null };

describe("classifyAnnouncement rules", () => {
  it("a decklist title with no lists yet is still Commander decklists, so its empty parse can alert", () => {
    expect(classifyAnnouncement({ title: "Star Trek Commander Decklists", url: "x", decks: [] })).toBe("commander-decklists");
  });

  it("a commander deck in the body is enough, whatever the title (`Mons Johnson's Pashalik Mons Commander Deck`)", () => {
    expect(classifyAnnouncement({ title: "Mons Johnson's Pashalik Mons Commander Deck", url: "x", decks: [commanderDeck] })).toBe("commander-decklists");
  });

  it("'Commander Decks' with no decklist and no lists is not decklists (`Updated Release Timing…`)", () => {
    expect(classifyAnnouncement({ title: "Updated Release Timing for Warhammer 40,000 Commander Decks", url: "x", decks: [] })).toBe("other");
  });

  it("lists with no commander do not make a post Commander decklists", () => {
    expect(classifyAnnouncement({ title: "Bloomburrow Starter Kit Decklists", url: "x", decks: [welcomeDeck] })).toBe("other");
  });

  it("Secret Lair by title or by slug alone", () => {
    expect(classifyAnnouncement({ title: "Secret Lair: Corn Maze Superdrop", url: "x", decks: [] })).toBe("secret-lair");
    expect(classifyAnnouncement({ title: "The Corn Maze Superdrop", url: postUrl("secret-lair-corn-maze-superdrop"), decks: [] })).toBe("secret-lair");
    expect(classifyAnnouncement({ title: "Reality Fracture Secret Lair Bundle Delayed", url: "x", decks: [] })).toBe("secret-lair");
  });
});

describe("the title and slug tests", () => {
  it.each([
    ["Foundations Commander Decklists", true],
    ["Heads I Win, Tails You Lose Commander Decklist", true],
    ["Secret Lair Commander Deck: Odds and Ends Decklist", true],
    ["Commander Deck List", true],
    ["Bloomburrow Starter Kit Decklists", false],
    ["Commander Decks Delayed", false],
    ["Commanders of the Decklistless", false],
  ])("isCommanderDecklistTitle(%s) → %s", (t, v) => expect(isCommanderDecklistTitle(t)).toBe(v));

  it.each([
    ["Secret Lair x Global Fund for Women", "x", true],
    ["Whatever", postUrl("secret-lair-a-perfectly-normal-superdrop"), true],
    ["Whatever", postUrl("bring-two-new-secret-lair-drops-to-your-multiverse"), true],
    ["Secretly Lairing", postUrl("secretlair-emailcapture"), false],
    ["The Lair of Secrets", postUrl("lair-of-secrets"), false],
  ])("isSecretLair(%s, %s) → %s", (t, u, v) => expect(isSecretLair(t, u)).toBe(v));
});
