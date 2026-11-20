import { describe, expect, it } from "vitest";
import { collectingMatchesSet, collectingPosts, parseCommanderDeckNames } from "./collecting";
import { deckNamesBySet } from "./collecting-read";
import { fixture } from "./__fixtures__/load";
import { parsePost } from "./post";

const NAUCTIS = "https://magic.wizards.com/en/news/feature/collecting-nauctis-the-sunken-realm";

function nauctisBody() {
  const r = parsePost(fixture("collecting-nauctis-the-sunken-realm.html"), NAUCTIS);
  if (!r.ok) throw new Error("fixture");
  return r.post.bodyHtml;
}

describe("parseCommanderDeckNames", () => {
  it("reads the four Nauctis decks from the real page, in order, and never the Premium Edition repeats", () => {
    expect(parseCommanderDeckNames(nauctisBody())).toEqual(["Merfolk Regiment", "Terrors of the Abyss", "Blood in the Water", "Seal the Deal"]);
  });

  it("reads a figcaption caption as well as a div one", () => {
    const html = `<h3>Commander Decks</h3><responsive-grid><grid-item><img alt=""><figcaption>Blight Curse<br>Commander Deck</figcaption></grid-item></responsive-grid>`;
    expect(parseCommanderDeckNames(html)).toEqual(["Blight Curse"]);
  });

  it("reads nothing without the exact heading, or from a caption that is not a Commander Deck", () => {
    const grid = `<responsive-grid><grid-item><div>Merfolk Regiment<br>Premium Edition</div></grid-item></responsive-grid>`;
    expect(parseCommanderDeckNames(`<h3>Premium Edition Commander Decks</h3>${grid}`)).toEqual([]);
    expect(parseCommanderDeckNames(`<h3>Commander Decks</h3>${grid}`)).toEqual([]);
    expect(parseCommanderDeckNames("<p>no decks</p>")).toEqual([]);
  });

  it("stops at the next heading", () => {
    const html = `<h3>Commander Decks</h3><p>soon</p><h3>Bundle</h3><responsive-grid><grid-item><div>Not A Deck<br>Commander Deck</div></grid-item></responsive-grid>`;
    expect(parseCommanderDeckNames(html)).toEqual([]);
  });
});

describe("collectingPosts", () => {
  it("keeps only collecting feature posts, each once, with the trailing slash dropped", () => {
    const out = collectingPosts([
      { url: `${NAUCTIS}/`, lastmod: "a" },
      { url: NAUCTIS, lastmod: "b" },
      { url: "https://magic.wizards.com/en/news/feature/something-else", lastmod: null },
      { url: "https://magic.wizards.com/en/news/announcements/collecting-x-y", lastmod: null },
      { url: "https://wpn.wizards.com/en/news/feature/collecting-x-y", lastmod: null },
    ]);
    expect(out).toEqual([{ url: NAUCTIS, lastmod: "a", slug: "collecting-nauctis-the-sunken-realm" }]);
  });
});

describe("collectingMatchesSet", () => {
  it("matches a post to its set by whole words, the trailing Commander left off", () => {
    expect(collectingMatchesSet("collecting-nauctis-the-sunken-realm", "Nauctis: The Sunken Realm Commander")).toBe(true);
    expect(collectingMatchesSet("collecting-darkhold-destiny", "Darkhold Destiny Commander")).toBe(true);
    expect(collectingMatchesSet("collecting-marvel-darkhold-destiny", "Darkhold Destiny Commander")).toBe(true);
    expect(collectingMatchesSet("collecting-darkhold-destiny", "Marvel: Darkhold Destiny Commander")).toBe(true);
  });

  it("does not match another set, a partial word, or a one-word slug", () => {
    expect(collectingMatchesSet("collecting-nauctis-the-sunken-realm", "Darkhold Destiny Commander")).toBe(false);
    expect(collectingMatchesSet("collecting-star-trek", "Star Trekking Commander")).toBe(false);
    expect(collectingMatchesSet("collecting-aetherdrift", "Aetherdrift Commander")).toBe(false);
  });
});

describe("deckNamesBySet", () => {
  const sets = [{ code: "NAC", name: "Nauctis: The Sunken Realm Commander" }, { code: "mdc", name: "Darkhold Destiny Commander" }];
  const at = (s: string) => new Date(s);

  it("gives a set the names of its matching post, and no key to a set whose post names none or is missing", () => {
    const posts = [
      { slug: "collecting-nauctis-the-sunken-realm", deckNames: ["A", "B", "C", "D"], lastFetchedAt: at("2026-11-20") },
      { slug: "collecting-darkhold-destiny", deckNames: [], lastFetchedAt: at("2026-11-20") },
    ];
    expect(deckNamesBySet(posts, sets)).toEqual({ nac: ["A", "B", "C", "D"] });
    expect(deckNamesBySet([], sets)).toEqual({});
  });

  it("takes the latest read when two posts match", () => {
    const posts = [
      { slug: "collecting-nauctis-the-sunken-realm", deckNames: ["old"], lastFetchedAt: at("2026-11-01") },
      { slug: "collecting-nauctis-the-sunken-realm", deckNames: ["new"], lastFetchedAt: at("2026-11-20") },
    ];
    expect(deckNamesBySet(posts, sets)).toEqual({ nac: ["new"] });
  });
});
