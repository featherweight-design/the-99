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
  const part = value.trim().replace(/^["“]|["”]$/g, "").trim();
  if (value.includes(source)) return true;
  if (!/[A-Za-z]{2,}/.test(part)) return false;
  return new RegExp(`(?<![\\w'])${escapeRegExp(part)}(?![\\w'])`).test(source);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
