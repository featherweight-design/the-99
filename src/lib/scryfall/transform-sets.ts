// Explicit shape (kept in sync with the sets table) rather than a schema import:
// pure lib code stays free of DB imports, which is also what keeps this unit-testable.
export type SetRow = {
  code: string;
  name: string;
  setType: string;
  /** ISO date string — drizzle's `date()` column maps to a string, not a Date. */
  releasedAt: string | null;
  cardCount: number;
  digital: boolean;
  iconSvgUri: string | null;
  /** Scryfall's own field, lowercase to match `code`. Null for a standalone product. */
  parentSetCode: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall JSON is untyped by design; toSetRows narrows it.
type Raw = Record<string, any>;

function required(raw: Raw, field: string): string {
  const value = raw[field];
  if (typeof value !== "string" || value === "") {
    throw new Error(`set ${raw.code ?? "<unknown>"}: missing required field ${field}`);
  }
  return value;
}

/**
 * Maps one `https://api.scryfall.com/sets` response to `sets` rows.
 *
 * `/sets` is NOT paginated — verified live 2026-07-27: 1,047 sets in a single response with
 * `has_more: false`. Rather than write pagination handling for behavior that never occurs,
 * we assert the invariant and fail loudly if Scryfall ever changes it.
 */
export function toSetRows(payload: Raw): SetRow[] {
  if (payload?.has_more) {
    throw new Error("scryfall /sets is now paginated (has_more=true); ingest needs updating");
  }
  if (!Array.isArray(payload?.data)) {
    throw new Error("unexpected /sets shape: data is not an array");
  }
  return (payload.data as Raw[]).map((raw) => ({
    // Scryfall emits lowercase codes already, but ManaBox exports are uppercase and the
    // whole join story depends on one canonical case. Normalize on write.
    code: required(raw, "code").toLowerCase(),
    name: required(raw, "name"),
    setType: required(raw, "set_type"),
    releasedAt: typeof raw.released_at === "string" ? raw.released_at : null,
    cardCount: typeof raw.card_count === "number" ? raw.card_count : 0,
    digital: raw.digital === true,
    iconSvgUri: typeof raw.icon_svg_uri === "string" ? raw.icon_svg_uri : null,
    parentSetCode: typeof raw.parent_set_code === "string" ? raw.parent_set_code.toLowerCase() : null,
  }));
}
