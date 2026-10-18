/**
 * The public address of a card or a commander (launch epic F3 groundwork, `2026-10-18-public-surface-groundwork.md`).
 * Pure and client-safe.
 *
 * `<kebab-name>-<first 12 hex of the oracle id>`, the same for both. The id suffix is what RESOLVES; the name part is
 * cosmetic, so a rename or a typo in it never breaks a link, and the loader answers a request whose name part is not the
 * canonical one with `canonicalSlug` for the route to redirect to. 12 hex because 8 would give two of ~30,000 cards the
 * same prefix about one time in ten.
 *
 * NOT `commanderSlug` (`src/lib/edhrec/slug.ts`): that is EDHREC's own address and keeps only the first half of a split
 * card, so `Fire // Ice` becomes `fire`.
 */
export const SLUG_HEX = 12;

/** Letters NFD does not decompose, folded to the Latin they are read as. */
const FOLD: Readonly<Record<string, string>> = {
  "æ": "ae", "œ": "oe", "ß": "ss", "ø": "o", "đ": "d", "ð": "d", "þ": "th", "ł": "l", "ı": "i",
};

/** A name as a lowercase hyphenated ASCII word run, or "" when nothing survives. */
export function nameSlug(name: string): string {
  const folded = name.toLowerCase().replace(/[æœßøđðþłı]/g, (c) => FOLD[c]);
  return folded
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The prefix of an oracle id (a uuid) that the address carries. */
export function idPrefix(oracleId: string): string {
  return oracleId.replace(/-/g, "").slice(0, SLUG_HEX).toLowerCase();
}

/** The address for a card or commander: the name, then the id prefix; the prefix alone when the name leaves nothing. */
export function publicSlug(name: string, oracleId: string): string {
  const word = nameSlug(name);
  const hex = idPrefix(oracleId);
  return word === "" ? hex : `${word}-${hex}`;
}

/** What a requested address says, or null when it cannot be an address at all. */
export function parsePublicSlug(slug: string): { namePart: string; hex: string } | null {
  const m = /^(?:(.*)-)?([0-9a-f]{12})$/.exec(slug);
  return m ? { namePart: m[1] ?? "", hex: m[2] } : null;
}

/**
 * The uuid range an id prefix covers, for `oracle_id >= lo and oracle_id <= hi`. A range rather than
 * `oracle_id::text like 'hex%'`, so the primary key serves it: a cast on the column would scan the table.
 */
export function uuidRange(hex: string): { lo: string; hi: string } {
  const head = `${hex.slice(0, 8)}-${hex.slice(8, 12)}`;
  return { lo: `${head}-0000-0000-000000000000`, hi: `${head}-ffff-ffff-ffffffffffff` };
}
