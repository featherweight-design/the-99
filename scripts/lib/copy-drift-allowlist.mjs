// Quotations the word-drift check must not report, each with the reason.
//
// ADDING TO THIS LIST IS A DELIBERATE ACT and it shows up in a diff, which is
// the whole point: an exemption that could be granted silently is an exemption
// that hides the next rename. A row here says "these two strings look alike to
// a machine and have nothing to do with each other" — never "this drift is
// fine".
//
// The `quoted` field is the span reduced to its WORDS, which is what the check
// compares: interpolations dropped, punctuation swept, lowercased. Run
// `pnpm check:copy-drift` and copy the `table:` line from its output.
export const WORD_DRIFT_ALLOWLIST = [
  // ── Singular/plural branches ───────────────────────────────────────────
  // The shipped string branches on a count and the table documents one arm.
  // Same length, one word apart, and both are the same string.
  { quoted: "rows didn't parse quantity columns mostly nothing fatal want to see the carnage?", reason: "plural arm of a singular/plural branch" },
  { quoted: "put all declined candidates back on the list", reason: "plural arm of a singular/plural branch" },

  // ── A table deliberately quoting the form that was REPLACED ────────────
  // `add-panel-addendum.md:288` documents a locked block and states the change
  // in its own note: "the second `ninety-nine` → `the ones`". The before-form
  // appears in the row because the row is about the edit. Allowlisted because
  // the table is doing the honest thing, NOT because the wording drifted.
  { quoted: "ninety-nine slots zero filled type a name below or take the ninety-nine we've already picked out eats everything anyway", reason: "the pre-edit form, quoted by the row that documents the edit" },
  // ── Templates the table fills with an example ──────────────────────────
  { quoted: "filter off · n results you don't own", reason: "table writes `n` where the code branches singular" },
];

/** The allowlist as a set of reduced spans, for the check to test against. */
export function allowlisted() {
  return new Set(WORD_DRIFT_ALLOWLIST.map((e) => e.quoted));
}
