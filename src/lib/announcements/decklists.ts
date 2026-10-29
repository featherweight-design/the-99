/**
 * The deck lists in an Announcements post body.
 *
 * Two block formats, both measured across the 57 decklist posts in the live sitemap (2026-10-29):
 *
 * - `<deck-list deck-title="…"><main-deck>…</main-deck></deck-list>` (2022 on): one card per line,
 *   an optional count (`1 Sol Ring`, `Sol Ring`), and sometimes a trailing Contentful entry id
 *   (`Terra, Herald of Hope [7lx5sD7iX53db5PBU]`). Lines may be split by `<br>` instead of newlines.
 * - `<deck-list><legacy>…</legacy></deck-list>` (the 2016 and 2021 posts): `Title:`, `Format:` and
 *   `Commander:` header lines, then `N Name` lines.
 *
 * Posts before the component existed (Warhammer 40,000, Adventures in the Forgotten Realms and other
 * 2016–2022 posts) draw lists as plain `span.card-count`/`span.card-name` HTML; this module does not
 * read that format, so such a post parses to no decks.
 *
 * THE COMMANDER RULE (verified on every 100-card `main-deck` block in those posts):
 * a `main-deck` block has no commander marker. Its FIRST line is the commander in every one. The
 * SECOND line is not reliably a commander: it is the alternate face commander in Star Trek
 * (`Captain Janeway, Endgame`), Duskmourn, Lord of the Rings and others, a legal pair in Doctor Who
 * (`The Fourth Doctor` + `Sarah Jane Smith`), and an ordinary card in Foundations
 * (`Always Watching`), Marvel (`Avenge`) and the Odds and Ends Secret Lair (`Void Winnower`). So the
 * first line is reported as the commander and the second only as a candidate, for a caller with the
 * catalog to confirm. A block that does not total 100 cards (Welcome Decks 30/40, Starter Kits 60,
 * the 80-card Dandân deck) reports no commander. A `legacy` block names its commander in its header:
 * a header that is exactly `<line 1> and <line 2>` is a pair (Heads I Win, Tails You Lose); any other
 * header is one card, even one with "and" in its name (`Kynaios and Tiro of Meletis`).
 *
 * THE PROMISED-COUNT RULE: see `promisedDeckCount`.
 */
import { decodeHtmlEntities, htmlToText } from "./html";

export type DeckCard = { name: string; count: number };

export type ParsedDeck = {
  title: string | null;
  format: "main-deck" | "legacy";
  cards: DeckCard[];
  /** Sum of the counts. */
  cardCount: number;
  /** Confirmed commanders: the first line of a 100-card list, or a legacy header. Empty otherwise. */
  commanders: string[];
  /** The second line of a 100-card `main-deck` list: a commander only if the catalog says it pairs. */
  commanderCandidate: string | null;
};

export type DecklistParse = {
  decks: ParsedDeck[];
  /** Section tags inside a `<deck-list>` this parser does not read (`<side-board>`, say): worth an alert. */
  unknownSections: string[];
};

const COMMANDER_DECK_SIZE = 100;

/** `[7lx5sD7iX53db5PBU]` after a name: a Contentful entry id, not part of the card name. */
const ENTRY_ID = /\s*\[[A-Za-z0-9]{10,}\]\s*$/;

function cardLine(line: string): DeckCard | null {
  const m = /^(\d+)\s*x?\s+(.+)$/i.exec(line);
  const count = m ? Number(m[1]) : 1;
  const name = (m ? m[2] : line).replace(ENTRY_ID, "").replace(/\s+/g, " ").trim();
  if (!name || count < 1) return null;
  return { name, count };
}

function lines(inner: string): string[] {
  return inner
    .split(/\r?\n|<br\s*\/?>/i)
    .map((l) => decodeHtmlEntities(l.replace(/<[^>]+>/g, "")).trim())
    .filter(Boolean);
}

const total = (cards: DeckCard[]) => cards.reduce((n, c) => n + c.count, 0);

function mainDeck(title: string | null, inner: string): ParsedDeck {
  const cards = lines(inner).map(cardLine).filter((c): c is DeckCard => c !== null);
  const cardCount = total(cards);
  const isCommanderDeck = cardCount === COMMANDER_DECK_SIZE && cards.length > 0;
  return {
    title,
    format: "main-deck",
    cards,
    cardCount,
    commanders: isCommanderDeck ? [cards[0].name] : [],
    commanderCandidate: isCommanderDeck && cards.length > 1 ? cards[1].name : null,
  };
}

function legacyDeck(attrTitle: string | null, inner: string): ParsedDeck {
  const headers = new Map<string, string>();
  const cards: DeckCard[] = [];
  for (const line of lines(inner)) {
    const header = /^(Title|Format|Commander):\s*(.+)$/i.exec(line);
    if (header) {
      headers.set(header[1].toLowerCase(), header[2].trim());
      continue;
    }
    const card = cardLine(line);
    if (card) cards.push(card);
  }
  const named = headers.get("commander") ?? null;
  let commanders: string[] = [];
  if (named) {
    const [a, b] = cards;
    commanders = a && b && named === `${a.name} and ${b.name}` ? [a.name, b.name] : [named];
    // The 2016 lists name the commander only in the header: the card is still in the deck.
    for (const c of commanders) if (!cards.some((x) => x.name === c)) cards.unshift({ name: c, count: 1 });
  }
  return {
    title: attrTitle ?? headers.get("title") ?? null,
    format: "legacy",
    cards,
    cardCount: total(cards),
    commanders,
    commanderCandidate: null,
  };
}

/** Every deck list in a post's body HTML (or a whole page: the escaped copy in its script never matches). */
export function parseDecklists(html: string): DecklistParse {
  const decks: ParsedDeck[] = [];
  const unknown = new Set<string>();
  for (const [, attrs, body] of html.matchAll(/<deck-list\b([^>]*)>([\s\S]*?)<\/deck-list>/gi)) {
    const titleAttr = /\bdeck-title\s*=\s*"([^"]*)"/i.exec(attrs) ?? /\bdeck-title\s*=\s*'([^']*)'/i.exec(attrs);
    const title = titleAttr ? decodeHtmlEntities(titleAttr[1]).trim() || null : null;
    for (const [, tag, inner] of body.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const t = tag.toLowerCase();
      if (t === "main-deck") decks.push(mainDeck(title, inner));
      else if (t === "legacy") decks.push(legacyDeck(title, inner));
      else unknown.add(t);
    }
  }
  return { decks, unknownSections: [...unknown] };
}

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/**
 * How many decks a post says it has, or null when it does not say.
 *
 * The rule: the first number WORD from two to ten followed, within three words, by "decks" or
 * "decklists" — `four ready-to-play decks`, `Four new Commander decks`, `two brand-new Commander
 * decks`, `all four complete decklists`. Measured on the summaries (excerpt / meta description) of
 * the 57 decklist posts: every match equals the number of lists the post publishes, except Star
 * Trek, which promises four and so far has three — the case this exists for.
 *
 * Deliberately not matched, each a false positive the measurement found: digits (`20 Ways to Win
 * Commander deck`, `Warhammer 40,000 Commander decks`), "one" (`Phyrexia: All Will Be One
 * Commander decks`), and the singular "deck". Most posts state no number at all (Marvel, Tarkir,
 * Strixhaven…), so a null is common and means "unknown", not "complete". Pass the summaries, not
 * the body: bodies mention other products' decks.
 */
export function promisedDeckCount(texts: readonly (string | null | undefined)[]): number | null {
  const pattern = /\b(two|three|four|five|six|seven|eight|nine|ten)\b(?:\s+[^\s]+){0,3}?\s+(?:decks|decklists)\b/i;
  for (const text of texts) {
    if (!text) continue;
    const m = pattern.exec(htmlToText(text));
    if (m) return NUMBER_WORDS[m[1].toLowerCase()];
  }
  return null;
}

/** True when the post has every list it promised, or promised no number. */
export function isComplete(decks: readonly ParsedDeck[], promised: number | null): boolean {
  return promised === null || decks.length >= promised;
}
