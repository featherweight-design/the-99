/** The two decisions a player makes while choosing the deck's last slots:
 *  `ticked` are the candidates they mean to add, `declined` the ones they have
 *  passed on. Both are held together because both are lost to the same reload,
 *  and restoring one without the other would hand back a list still offering
 *  everything the player already cleared. */
export type TopOffDraft = { ticked: Set<string>; declined: Set<string> };

/** Per-deck localStorage key for an uncommitted top-off selection.
 *
 *  Keyed on the deck id for the same reason `arrivalDismissKey` is: deck ids
 *  are `uuid().defaultRandom()` primary keys and are never reused, so a deck
 *  deleted and rebuilt from the same list gets a new id, a new key, and an
 *  empty selection rather than inheriting a dead one. */
export function topOffDraftKey(deckId: string): string {
  return `the99:top-off-draft:${deckId}`;
}

/** The stored shape. Short keys because the value is a pair of uuid lists that
 *  can run to the deck's whole open slot count, and localStorage is a quota
 *  shared with every other key this app writes. */
type Stored = { t: string[]; d: string[] };

export function encodeTopOffDraft(draft: TopOffDraft): string {
  return JSON.stringify({ t: [...draft.ticked], d: [...draft.declined] } satisfies Stored);
}

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** Reads a stored selection, or null when there is nothing to restore.
 *
 *  Parsed strictly, and the whole value is rejected rather than half-read: a
 *  draft that restored its ticks and dropped its declines would re-offer every
 *  candidate the player had already passed on, which is the loss this module
 *  exists to prevent wearing a different face. Null therefore means "no
 *  selection" — the state before any tick — and never "a partial one".
 *
 *  Entries are checked for being strings because they are compared against
 *  candidate oracle ids, which are strings: a number that reached the ticked
 *  set could never match a candidate, so it would sit there uncommittable,
 *  counted by the commit bar and dropped by the commit. */
export function readTopOffDraft(raw: string | null): TopOffDraft | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const { t, d } = parsed as Record<string, unknown>;
  if (!isIdList(t) || !isIdList(d)) return null;
  return { ticked: new Set(t), declined: new Set(d) };
}
