/**
 * src/lib/copy/deck-versioning.ts — ADDITIONS (R3)
 *
 * #390 — putting a cut card back, on the review surface only.
 *
 * A `restore` block appended to the EXISTING deckVersioningCopy object, not a
 * new file: same feature, same vocabulary (version · draft · commit a version),
 * same surfaces.
 *
 * R3 IS A DELETION ROUND. Both of R2's refusal states were unreachable, so
 * every string that served them is gone: claimedTag, claimedRefusal,
 * claimedA11y, commanderRefusalA11y, and the `refused` fallback. What is left
 * is a control label, an accessible name, three announcements, and one edit to
 * a shipped string.
 *
 * WHY THERE ARE NO REFUSAL STRINGS. `Put back` is an ADD, and adds in this app
 * never refuse on claims — they price them. DeckAddRejection
 * (add-validation.ts:22) is three values — not-commander-legal,
 * off-color-identity, is-commander (meaning THIS deck's own commander) — and
 * addCardToDeck does not read availability at all. A row under `Going out` was
 * in this deck's committed list, so legality and colour identity already
 * passed; and a commander is not a deck_cards row, so it never appears under
 * `Going out` to be refused. Every gate is closed by construction and the
 * claim gates were never open.
 *
 * R2's mistake was its parent: it modelled the restore on the PULL flow. A pull
 * is contended — it mutates another deck. A restore mutates only your own
 * draft. Refusing it would make a restore stricter than an add of the same card
 * from the deck page one route away, where the card reads as unavailable rather
 * than refused.
 *
 * `Put back` SURVIVES THE FINDING AS THE RIGHT WORD. It was chosen partly
 * because a restore can be refused, and it cannot — but it remains the pool's
 * own vocabulary on the page that says "back in the pool on commit", and the
 * mirror of `Pull it`. A request-word for an action that always succeeds is
 * honest: it describes ASKING, not DOUBT. #185's `Undo`, at the moment of the
 * tap, stays as it is — two features, two surfaces, two words.
 *
 * THERE IS NO IN-FLIGHT COPY AND NO IN-FLIGHT STATE. R2 held the row through
 * the round trip because the refusal was drawn on it; with no refusal to draw,
 * that argument retires with the states it protected. The restore is optimistic
 * and the row leaves on tap. A transport failure returns the row and states
 * itself through the shipped MutationError — the app's existing behaviour for
 * every optimistic write, NOT this feature's copy, and not a refusal: nothing
 * was decided, and trying again is the whole remedy.
 */

export const deckVersioningCopy = {
  /* … pending, review, commit, discard, history, changed, stamp as shipped … */

  /* ---- Putting a cut card back (the `Going out` row) ----
   * Derived from draftDiff.removes, which already enumerates every cut, so this
   * lives until the draft is committed and is stored NOWHERE. Nothing expires —
   * only #185's shortcut does — so there is no "restorable until" string, no
   * timer and no countdown. */
  restore: {
    cta: 'Put back',
    ctaA11y: (card: string) => `Put ${card} back in the deck`,

    // ---- Success, which is the only outcome ----
    // The restored row LEAVES `Going out` — the list is derived and the card is
    // no longer in draftDiff.removes. This is the opposite of the pull rule (a
    // pull changes a row's availability; a restore changes its membership) and
    // it is the only row in the feature that moves.
    //
    // NO MONEY FIGURE APPEARS IN ANY OF THESE. A restored card is in NEITHER
    // list: putting a cut back returns the draft to "no change" on that card,
    // so it leaves `Going out` and never enters `Coming in`. Nothing is
    // bought, because the deck already holds it. (R2 announced a buy-total
    // change here; it was wrong twice over — the money block is scoped to
    // draftDiff.adds, and the case cannot arise regardless.)
    announced: (card: string, cards: number, out: number) =>
      `${card} is back in the deck. ${cards} cards, ${out} going out.`,
    // No count of nought is ever drawn, including in an announcement.
    announcedLastOut: (card: string, cards: number) =>
      `${card} is back in the deck. ${cards} cards, nothing going out.`,
    // A restore can dissolve the draft entirely, which deletes the banner and
    // redirects /changes. The absence IS the news, so this is the only notice.
    announcedLastChange: (card: string, version: number) =>
      `${card} is back in the deck. This deck matches v${version} again.`,

    // DELIBERATELY ABSENT: every refusal string, the in-flight string, and the
    // `refused` fallback. There is no state for them to describe. If a
    // DeckAddRejection value ever fires for a row under `Going out`, it is a
    // bug in the diff and not a state to draw.
  },
} as const;

/**
 * EDIT TO SHIPPED COPY — deckVersioningCopy.review.outNote
 *
 * Currently:
 *
 *   `all ${n} go back in the pool when you commit. No per-row toggle: putting one
 *    back is adding it to the deck, and the deck page already does that.`
 *
 * The FIRST clause is now false — there is a per-row control.
 *
 * The SECOND clause is true, and R3 leans on it entirely. Putting one back IS
 * adding it to the deck — which is precisely why it cannot be refused, and why
 * this restore is addCardToDeck unwrapped, the same call #185's undo makes. R1
 * claimed a bespoke mutation was needed to preserve seniority; versions.ts:175
 * inherits `since` at commit by oracle id, so any restore inside a draft
 * preserves it. R2 kept a thin-wrapper escape hatch for naming a holding deck;
 * R3 withdraws it, because there is no holding deck to name.
 *
 * "It never left" says the restore is a reversal and not a new acquisition, in
 * the feature's own box vocabulary.
 *
 * THIS IS THE ONLY EDIT TO SHIPPED COPY. R2's second edit is WITHDRAWN:
 * review.pull (the correct key — R2 twice called it pullCta) keeps `Pull it`
 * unchanged, border and pronoun intact. Its demotion existed only to fit a
 * refused row on one line at 390px, and there are no refused rows.
 */
export const REVIEW_OUT_NOTE = (n: number) =>
  `all ${n} go back in the pool when you commit. Put one back and it never left.`;

/**
 * FLAGGED, NOT EDITED — deckVersioningCopy.review.lede
 *
 * It opens "Nothing here is a decision except the pulls." That is now wrong by
 * one: every row under `Going out` carries a control that writes to the draft.
 *
 * It is LESS wrong than it was in R2, and the distinction is worth keeping: a
 * restore is a decision, but never a CONTENDED one. The lede's point is about
 * what can be taken from you on this page, and a restore takes nothing from
 * anyone.
 *
 * Changing the lede of a shipped surface is a ratification question rather than
 * a Design call, so it is raised in README §Gap report and left alone here. If
 * the audit wants it changed, the smallest honest edit is
 * "except the pulls and the puts-back".
 */
