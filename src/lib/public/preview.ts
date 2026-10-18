import type { PublicCard } from "./card";

/**
 * The card page's link preview (launch epic F3 PR 2b; handoff C2, README call 8): the words a link unfurls with. Pure: the
 * same card gives the same preview to every visitor, and nothing here reads a request.
 */

/** Where the description is cut: at a word, at or under this many characters (C2's tag table, "near 155"). */
export const DESCRIPTION_MAX = 155;

/** The line the catalog joins two faces' rules text with (`card-page.tsx`'s `FACE_BREAK`). */
const FACE_BREAK = "\n//\n";

/** Both faces' type lines, as the page draws them. */
export function previewTypeLine(card: Pick<PublicCard, "faces" | "typeLine">): string {
  return card.faces.length > 0 ? card.faces.map((f) => f.typeLine).join(" // ") : card.typeLine;
}

/**
 * `text` cut at a word so it is at most `max` characters with its ellipsis, or whole when it already fits. A first word
 * longer than the limit is cut mid-word rather than dropped.
 */
export function cutAtWord(text: string, max: number = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  // The space may sit at `max - 1`: a word ending there still fits, with the ellipsis after it.
  const room = text.slice(0, max);
  const space = room.lastIndexOf(" ");
  const head = (space > 0 ? room.slice(0, space) : room.slice(0, max - 1)).replace(/[\s,.;:—-]+$/u, "");
  return `${head}…`;
}

/**
 * The description: the type line, then the rules text, cut at a word near 155 characters. Both faces' text, the second
 * after a ` // `; line breaks become spaces. Symbols stay as the catalog writes them (`{T}`), which reads as plain text.
 */
export function cardDescription(card: Pick<PublicCard, "faces" | "typeLine" | "oracleText">): string {
  const type = previewTypeLine(card);
  const text = (card.oracleText ?? "").split(FACE_BREAK).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean).join(" // ");
  return cutAtWord(text ? `${type}. ${text}` : type);
}

/** The front face's cost as its symbols (`{2}{U}{R}` to `["2", "U", "R"]`); empty for a card with no cost. */
export function frontCostSymbols(manaCost: string | null): string[] {
  if (!manaCost) return [];
  const front = manaCost.split(" // ")[0];
  return [...front.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}
