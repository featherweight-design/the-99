/**
 * Where an added copy goes: the line a surface draws when a copy it reports went to a deck, and
 * the chooser's additions (plan `plan-added-copy-2026-10-12`, re-scoped: no Keep it free).
 *
 * PLACEHOLDERS PENDING /copy-review. Transcribed from `design/design_handoff_the99_added_copy/
 * added-copy · copy strings.ts` (R1), less every Keep it free string (Hugh ruled it out on
 * 2026-10-12). This file carries only the forms the upload summary draws; Add Cards' long forms
 * and I got it's receipt additions arrive with the PR that draws them.
 *
 * TWO VERBS, AND THE VERB IS THE CLAIM. `goes to` only when a deck holds the copy, by seniority or
 * by a pick. `is free for` when the copy is loose and brews read it as theirs, so the line never
 * names a brew as holding a copy it only reads.
 */

const n = (x: number) => x.toLocaleString("en-US");
const and = (xs: string[]) =>
  (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export const addedCopyCopy = {
  /** The summary's short forms: the card is the row's own first column. */
  row: {
    goesTo: (deck: string) => `goes to ${deck}`,
    /** Every deck took one copy. */
    goesToMany: (decks: string[]) => `goes to ${and(decks)}, one each`,
    /** Not engineering's handoff string: a deck took two, so `one each` would be false (audit 8). */
    goesToManyUneven: (decks: string[]) => `goes to ${and(decks)}`,
    goesToEarlier: (deck: string) => `goes to ${deck}, which you picked earlier`,
    goesToPicked: (deck: string) => `goes to ${deck}, as you picked`,
    freeForBrew: (brew: string) => `is free for ${brew}, a brew`,
    freeForBrews: (k: number) => `is free for the ${n(k)} brews that need it`,
  },
  change: "Change",
  done: "Done",
  changeAria: (card: string) => `Change where ${card} goes`,
  /** Appended to the `No longer to buy` section's note when its rows carry the line. */
  summaryNoteTail: " Change where a copy goes.",
  /** The chooser's additions, beside `cardAssignmentsCopy.contested`. */
  chooser: {
    /** A brew's soft share: it reads a loose copy as covered, and so does every other brew. */
    canUse: "can use it",
    fold: (k: number, deck: string | null) =>
      (deck ? `${n(k)} committed decks ahead of ${deck} have theirs` : `${n(k)} committed decks have theirs`),
    foldShow: "Show",
    /** The handoff wrote `all both` at two brews; `both` alone is the sentence. */
    brewNote: (k: number) =>
      `A brew holds a copy only once you pick it, so ${k === 2 ? "both" : `all ${n(k)}`} can use this one. Pick one to give it the copy.`,
  },
};
