import { describe, expect, it } from "vitest";
import { isComplete, parseDecklists, promisedDeckCount } from "./decklists";
import { parsePost } from "./post";
import { fixture, postUrl } from "./__fixtures__/load";

const body = (slug: string) => {
  const r = parsePost(fixture(`${slug}.html`), postUrl(slug));
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.post;
};

describe("parseDecklists on real posts", () => {
  it("Star Trek: three 100-card lists, the first line the commander, the second a candidate", () => {
    const { decks, unknownSections } = parseDecklists(body("star-trek-commander-decklists").bodyHtml);
    expect(unknownSections).toEqual([]);
    expect(decks.map((d) => [d.title, d.cardCount, d.commanders, d.commanderCandidate])).toEqual([
      ["Federation Fleet", 100, ["Jean-Luc Picard, Luminary"], "Captain Janeway, Endgame"],
      ["Klingon Fury", 100, ["Worf, Defiant Commander"], "Kor, Cause of Vengeance"],
      ["We Are the Borg", 100, ["The Borg Queen"], "Locutus of Borg"],
    ]);
    const fleet = decks[0].cards;
    // counts read, the Contentful id after a basic land stripped
    expect(fleet.slice(-3)).toEqual([
      { name: "Island", count: 5 },
      { name: "Plains", count: 4 },
      { name: "Mountain", count: 4 },
    ]);
    expect(fleet).toContainEqual({ name: "Ambassador K'Ehleyr", count: 1 });
  });

  it("Foundations: the second line is a candidate, never a confirmed commander (it is `Always Watching`)", () => {
    const { decks } = parseDecklists(body("foundations-commander-decklists").bodyHtml);
    expect(decks).toHaveLength(5);
    expect(decks[0].commanders).toEqual(["Giada, Font of Hope"]);
    expect(decks[0].commanderCandidate).toBe("Always Watching");
    expect(decks.every((d) => d.cardCount === 100 && d.commanders.length === 1)).toBe(true);
  });

  it("the whole page yields no decks: the script's escaped copy never matches, only the rendered body does", () => {
    const slug = "star-trek-commander-decklists";
    expect(parseDecklists(fixture(`${slug}.html`)).decks).toHaveLength(0); // trimmed fixture keeps only the script
    expect(parseDecklists(body(slug).bodyHtml).decks).toHaveLength(3);
  });

  it("Welcome Decks are 40 cards: lists, but no commander", () => {
    const { decks } = parseDecklists(body("star-trek-welcome-decks").bodyHtml);
    expect(decks.map((d) => d.cardCount)).toEqual([40, 40, 40, 40, 40]);
    expect(decks.every((d) => d.commanders.length === 0 && d.commanderCandidate === null)).toBe(true);
  });

  it("a legacy block: the header pair `A and B` is two commanders when they are lines one and two", () => {
    const { decks } = parseDecklists(body("heads-i-win-tails-you-lose-commander-decklist-2021-11-18").bodyHtml);
    expect(decks).toHaveLength(1);
    expect(decks[0]).toMatchObject({
      format: "legacy",
      title: "Heads I Win, Tails You Lose",
      commanders: ["Zndrsplt, Eye of Wisdom", "Okaun, Eye of Chaos"],
      commanderCandidate: null,
      cardCount: 100,
    });
    expect(decks[0].cards).toContainEqual({ name: "Island", count: 7 });
  });

  it("a post with no lists parses to none", () => {
    expect(parseDecklists(body("secret-lair-set-phasers-to-superdrop").bodyHtml)).toEqual({ decks: [], unknownSections: [] });
  });
});

describe("parseDecklists line rules", () => {
  const deck = (lines: string, attrs = ' deck-title="T"') => parseDecklists(`<deck-list${attrs}><main-deck>\n${lines}\n</main-deck></deck-list>`).decks[0];
  const hundred = (first: string[]) => [...first, `${100 - first.length} Wastes`].join("\n");

  it("reads counts, bare names, <br> separators, entities and entry ids", () => {
    const d = deck("2 Sol Ring<br>Dand&acirc;n [161JPEeRj7CqLm6578hzHx]<br/>  3x  Island \n\n Find//Finality");
    expect(d.cards).toEqual([
      { name: "Sol Ring", count: 2 },
      { name: "Dandân", count: 1 },
      { name: "Island", count: 3 },
      { name: "Find//Finality", count: 1 },
    ]);
  });

  it("keeps a bracket that is not an entry id", () => {
    expect(deck("1 Ransom Note (Clues)\n1 B.F.M. [Left]").cards.map((c) => c.name)).toEqual(["Ransom Note (Clues)", "B.F.M. [Left]"]);
  });

  it("a commander only at exactly 100 cards", () => {
    expect(deck(hundred(["Kenrith, the Returned King", "Sol Ring"])).commanders).toEqual(["Kenrith, the Returned King"]);
    expect(deck(["Kenrith, the Returned King", "98 Wastes"].join("\n")).commanders).toEqual([]);
    expect(deck(["Kenrith, the Returned King", "100 Wastes"].join("\n")).commanders).toEqual([]);
  });

  it("a single-card 100-count line has no candidate", () => {
    expect(deck("100 Relentless Rats")).toMatchObject({ commanders: ["Relentless Rats"], commanderCandidate: null });
  });

  it("decodes the deck title and tolerates a missing one", () => {
    expect(deck("Sol Ring", ' deck-title="Secret Lair Dand&acirc;n Deck"').title).toBe("Secret Lair Dandân Deck");
    expect(deck("Sol Ring", "").title).toBeNull();
  });

  it("reports a section it does not read", () => {
    const html = `<deck-list deck-title="T"><main-deck>Sol Ring</main-deck><side-board>Negate</side-board></deck-list>`;
    expect(parseDecklists(html)).toMatchObject({ unknownSections: ["side-board"] });
  });

  it("a legacy header naming one card with 'and' in its name stays one commander, and is added to the list", () => {
    const html = `<deck-list><legacy>\nTitle: Stalwart Unity\nFormat: Commander\nCommander: Kynaios and Tiro of Meletis\n1 Veteran Explorer\n98 Plains\n</legacy></deck-list>`;
    const [d] = parseDecklists(html).decks;
    expect(d.commanders).toEqual(["Kynaios and Tiro of Meletis"]);
    expect(d.cards[0]).toEqual({ name: "Kynaios and Tiro of Meletis", count: 1 });
    expect(d.cardCount).toBe(100);
  });
});

describe("promisedDeckCount", () => {
  it("Star Trek promises four and has three: incomplete", () => {
    const post = body("star-trek-commander-decklists");
    const promised = promisedDeckCount([post.excerpt]);
    expect(promised).toBe(4);
    expect(isComplete(parseDecklists(post.bodyHtml).decks, promised)).toBe(false);
  });

  it("Foundations promises five and has five: complete", () => {
    const post = body("foundations-commander-decklists");
    expect(promisedDeckCount([post.excerpt])).toBe(5);
    expect(isComplete(parseDecklists(post.bodyHtml).decks, 5)).toBe(true);
  });

  it("a post that states no number is unknown, and counts as complete", () => {
    const post = body("secret-lair-commander-deck-odds-and-ends-decklist");
    expect(promisedDeckCount([post.excerpt])).toBeNull();
    expect(isComplete([], null)).toBe(true);
  });

  it.each([
    ["Four new Commander decks will haunt store shelves", 4],
    ["two brand-new Commander decks!", 2],
    ["Check out all four complete decklists", 4],
    ["We're releasing Four four all-new Commander decks", 4],
    ["Five decks, five strategies", 5],
    ["four <i>ready-to-play</i> decks", 4],
    // the false positives the live measurement found
    ["Here's a look at Phyrexia: All Will Be One Commander decks", null],
    ["one of 20 different ways with the 20 Ways to Win Commander deck", null],
    ["The upcoming Warhammer 40,000 Commander decks", null],
    ["a ready-to-play Commander deck featuring four colors", null],
    ["four new cards in each of these decks", null],
    // the singular never counts: one deck, however many of something else
    ["Choose between two great Commander deck builds", null],
  ])("%s → %s", (text, n) => expect(promisedDeckCount([text])).toBe(n));

  it("takes the first summary that states a number", () => {
    expect(promisedDeckCount([null, "", "Nothing here", "three new decks", "five decks"])).toBe(3);
  });
});
