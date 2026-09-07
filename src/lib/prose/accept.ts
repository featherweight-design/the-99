// The contract a generated commander sentence has to satisfy before it is stored, from
// design/design_handoff_the99_commander_explained/PROSE-one-string-two-surfaces.md §3-§5.
//
// One string serves two columns: a 640px section that holds ~160 characters in two lines,
// and a ~183px home card that holds ~58. No single length reconciles them, so the second
// rule is a position rather than a length — the claim has to land inside the first 55
// characters, and the home card shows the first two lines of the same sentence rather than
// a shorter one.
//
// A string that fails any check is NOT STORED. Truncation was the alternative and it is
// worse in every direction: it produces a sentence nobody wrote, silently, and permanently,
// because the stored string is what review sees. A missing paragraph is visible to the
// review queue as a missing paragraph; a truncated one looks like a paragraph.

export const OK_MIN = 110;
export const OK_MAX = 160;
export const HARD_MAX = 190;
export const CLAIM_BY = 55;

/** The index is a distribution, so the hedge is the honest verb. A proxy for the
    confident-assertion failure mode, not a guarantee against one. */
const HEDGES = /\b(tend|tends|usually|mostly|often|typically)\b/i;

/** Periods that belong to a name rather than to a sentence: an honorific, or a letter
    standing alone inside an initialism. */
const NAME_PERIOD = /\b(?:Mr|Mrs|Ms|Dr|St|Sgt|Capt|Lt)\.|\b[A-Z]\./g;

export function acceptProse(s: string): boolean {
  const t = s.trim();
  if (t.length < OK_MIN || t.length > HARD_MAX) return false;

  // Exactly one sentence: a second one in this slot would be half-clamped on the card.
  // A period inside a commander's name is not a sentence end, and the subject of every
  // one of these strings is a commander, so a title ("Mr. Orfeo, the Boulder") or an
  // initialism would otherwise reject every sentence written about that commander.
  const sentences = t
    .replace(NAME_PERIOD, (m) => m.slice(0, -1))
    .split(/[.!?](\s|$)/)
    .filter((p) => p.trim().length > 0);
  if (sentences.length !== 1) return false;

  // Front-loading. A comma-free sentence passes only if it is short end to end, which
  // in practice means it fails the floor above — the branch exists so a 115-character
  // sentence whose only break is an em dash at 50 is not rejected.
  const firstBreak = t.search(/[,;—]/);
  const claimEnd = firstBreak === -1 ? t.length - 1 : firstBreak;
  if (claimEnd > CLAIM_BY) return false;

  return HEDGES.test(t);
}
