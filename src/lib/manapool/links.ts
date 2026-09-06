// Outbound links to Mana Pool. Both call sites are client components, so
// nothing here may reach for `Buffer` — the client bundle has no Node globals.

export const MANAPOOL_ADD_DECK_URL = "https://manapool.com/add-deck";
export const MANAPOOL_CARDS_URL = "https://manapool.com/cards";

/** Keyed by the oracle card name, never the printing on screen: the target is
 *  Mana Pool's all-printings grid, so the user picks the printing there. */
export function manapoolCardUrl(name: string): string {
  return `${MANAPOOL_CARDS_URL}?q=${encodeURIComponent(name)}`;
}

export function manapoolDeckText(cards: { name: string; quantity: number }[]): string {
  return cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
}

function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Null for an empty list — the link is absent, not disabled. */
export function manapoolAddDeckUrl(cards: { name: string; quantity: number }[]): string | null {
  if (cards.length === 0) return null;
  return `${MANAPOOL_ADD_DECK_URL}?deck=${encodeURIComponent(base64Utf8(manapoolDeckText(cards)))}`;
}
