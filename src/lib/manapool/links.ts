// Outbound links to Mana Pool. Both call sites are client components, so
// nothing here may reach for `Buffer` — the client bundle has no Node globals.

export const MANAPOOL_ADD_DECK_URL = "https://manapool.com/add-deck";
export const MANAPOOL_CARDS_URL = "https://manapool.com/cards";

/** Keyed by the oracle card name, never the printing on screen: the target is
 *  Mana Pool's all-printings grid, so the user picks the printing there. */
export function manapoolCardUrl(name: string): string {
  return `${MANAPOOL_CARDS_URL}?q=${encodeURIComponent(name)}`;
}

/**
 * One line of a Mana Pool decklist. A CARD line is name and quantity only: the player picks the
 * printing on Mana Pool. A TOKEN line may name its printing, because a token's name is not an
 * identity (`Ninja`, `Spirit`, `Timeless Witness` and `Treasure` are each also a real card's name)
 * and the printing is what says which object is meant. Mana Pool's own format is
 * `4 Plains [M20] 261`; measured 2026-10-11 in a browser, one link may mix name-only lines and
 * `[SET] number` lines, and a line it cannot place is shown as `Card not found`.
 */
export type ManapoolLine = {
  name: string;
  quantity: number;
  printing?: { setCode: string; collectorNumber: string };
};

export function manapoolDeckText(cards: ManapoolLine[]): string {
  return cards
    .map((c) => (c.printing
      ? `${c.quantity} ${c.name} [${c.printing.setCode.toUpperCase()}] ${c.printing.collectorNumber}`
      : `${c.quantity} ${c.name}`))
    .join("\n");
}

function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Null for an empty list — the link is absent, not disabled. */
export function manapoolAddDeckUrl(cards: ManapoolLine[]): string | null {
  if (cards.length === 0) return null;
  return `${MANAPOOL_ADD_DECK_URL}?deck=${encodeURIComponent(base64Utf8(manapoolDeckText(cards)))}`;
}

/**
 * The longest add-deck URL a part may be. Measured 2026-10-11 against Mana Pool by padding a real
 * payload: 32,099 characters answered 200 and 40,115 answered 414 URI Too Long, so the ceiling is
 * somewhere between. 32,000 keeps every part under the largest length proved to work. About 27.7
 * characters per line puts a single part near 1,150 lines; Hugh's staging cart is 291 (8,051).
 */
export const MANAPOOL_URL_MAX = 32_000;

/**
 * One cart as many add-deck URLs as it takes, each at most `max` characters (Hugh, 2026-10-11:
 * a cart over the limit splits into several links, `part 1 of 2`). Lines keep their order and a
 * line is never split across parts, so a card with several copies lands whole in one part.
 *
 * Each part carries the number of lines it sends (`checkout.sends`). Empty for an empty list, as `manapoolAddDeckUrl` is null for one. A single line too long to fit
 * any part on its own (a card name of thousands of characters, which no card has) is a refusal:
 * this throws rather than emitting a URL Mana Pool would answer with a 414.
 */
export function manapoolAddDeckUrls(
  cards: ManapoolLine[],
  max: number = MANAPOOL_URL_MAX,
): { href: string; lineCount: number }[] {
  const parts: { href: string; lineCount: number }[] = [];
  let current: ManapoolLine[] = [];
  let currentUrl: string | null = null;
  for (const card of cards) {
    const trial = manapoolAddDeckUrl([...current, card])!;
    if (trial.length <= max) {
      current.push(card);
      currentUrl = trial;
      continue;
    }
    if (currentUrl === null) {
      throw new Error(`one Mana Pool line is longer than a whole link may be (${trial.length} > ${max})`);
    }
    parts.push({ href: currentUrl, lineCount: current.length });
    current = [card];
    currentUrl = manapoolAddDeckUrl(current)!;
    if (currentUrl.length > max) {
      throw new Error(`one Mana Pool line is longer than a whole link may be (${currentUrl.length} > ${max})`);
    }
  }
  if (currentUrl !== null) parts.push({ href: currentUrl, lineCount: current.length });
  return parts;
}
