/**
 * Whether a model-written string quotes `source` (the player's own words), whole or a part of
 * them — the prompt tells the model this is allowed for a `note`, `intent` or `notes` citation
 * (`prompt.ts`), and `validate.ts`'s citation check and `presentation.ts`'s quoted-text check
 * both need to agree on what counts, or a model following that instruction can pass one and
 * fail the other. A part is whole words of the source, at word boundaries, and at least one of
 * them a real word: `ate` out of `late` is not a quote.
 */
export function quotesPlayerText(source: string | null, value: string): boolean {
  if (source === null) return false;
  if (value.includes(source)) return true;
  return isPartOf(source, value);
}

/**
 * Whether `value` is whole words OF `source`, and nothing more: the half of `quotesPlayerText` a
 * caller uses when its value is the quote's body alone. There a body that wraps the whole source in
 * words of its own is not a quote of it (Find a deck read, lock 3).
 */
export function isPartOf(source: string | null, value: string): boolean {
  if (source === null) return false;
  const part = value.trim().replace(/^["“]|["”]$/g, "").trim();
  if (!/[A-Za-z]{2,}/.test(part)) return false;
  return new RegExp(`(?<![\\w'])${escapeRegExp(part)}(?![\\w'])`).test(source);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
