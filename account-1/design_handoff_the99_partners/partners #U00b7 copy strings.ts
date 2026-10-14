// partners · copy strings — #364, design handoff R2.
//
// Four new strings and one new aria form. Everything else the partner surfaces
// print is either data (two commander names, an identity label, a count) or a
// string that already exists and is reused BY REFERENCE — listed at the bottom
// so no one re-mints it.
//
// Home: `src/lib/copy/deck-import.ts` under `deckImportCopy.commander`, which is
// where the picker's other strings live and what `create-picker.tsx` already
// imports as `copy`. Nothing below needs a new module.

export const partnerCopy = {
  // ── The picker's second slot ────────────────────────────────────────────────

  // The two eyebrows in the Selected sidebar. They appear TOGETHER with the
  // slot and never before it: a lone `Commander` label over a single pick is a
  // new word on a shipped surface for no gain, and it is the label pair that
  // carries the order in text.
  primaryLabel: "Commander",
  partnerLabel: "Partner",

  // State B, the empty plate. A verb, not a noun: the plate is a button.
  addPartner: "Add a partner",

  // State B's caption. `ability` is printed VERBATIM from
  // partnerAbility(oracleText) — `Partner`, `Partner—Father & son`,
  // `Partner with Pir`. The card's own words answer "why can this deck have
  // two?" better than any sentence of ours, and the em-dashed restricted form
  // is the reason the spec needed the `restricted` arm at all.
  //
  // `n` is the canPair count over the player's owned legal commanders, so a
  // filter that returns 3 of 400 is visibly a filter and not a broken list.
  // At n === 0 the ability still prints and the plate is still drawn: the
  // commander CAN pair, the player just owns nothing to pair it with, and that
  // is a collection fact rather than a disabled control.
  partnerAvailable: (ability: string, n: number) =>
    n === 1
      ? `${ability} · 1 of your commanders can pair`
      : `${ability} · ${n} of your commanders can pair`,
  partnerNoneOwned: (ability: string) => `${ability} · none of your commanders can pair`,

  // State C, the import proposal. `line` is the source line number the
  // importer already tracks (`sourceLine`), which is what makes the proposal
  // auditable against the paste rather than merely reversible.
  proposed: (line: number) => `Proposed · from your list, line ${line}`,
  // The primary's eyebrow in import mode, where BOTH halves came from the paste.
  primaryLabelFromSource: "Commander · from your list",

  // The slot's two actions. `Change` re-opens the filtered list; `Remove`
  // returns to state B. Both are text, both are 11px mono, and neither is
  // accent — refresh decision 3 reserves accent for `in use` and `to buy`, and
  // a proposal is neither.
  change: "Change",
  remove: "Remove",

  // ── The re-headed list, while a partner is being picked ────────────────────
  //
  // `short` is commanderShortName(primary.name) — the primary scrolls out of
  // view on a phone, so this strip is the only thing naming what you are
  // pairing. Short rather than full because the strip also carries the count
  // and a Cancel, and the full name is 27 characters of a 358px row.
  pairingFor: (short: string, n: number) => `Partners for ${short} · ${n}`,
  pairingCancel: "Cancel",

  // ── The header's second card trigger (decision 22) ────────────────────────
  //
  // The header band is one image — the primary's — so the partner's printing
  // opens from the word that names it. This is the trigger's accessible name;
  // the visible affordance is an underline on the partner's half of the caption
  // and nothing else. The primary needs no equivalent: its trigger is the 230px
  // of art beside the text.
  partnerCardAria: (partner: string) => `Show the printing for ${partner}`,

  // ── Accessible names ──────────────────────────────────────────────────────
  //
  // The one thing the pixels are allowed to drop, and the one thing the
  // accessible name is not. Primary first, both in full, on every surface that
  // truncates or shortens — the resume row and the rail.
  pairAria: (primary: string, partner: string) => `${primary}, with partner ${partner}`,
  // Decision 23 — the resume row drops the to-buy clause on pair decks, so the
  // accessible name is where it survives. Appended after pairAria's names.
  pairRowBuyAria: (copies: number) =>
    copies === 1 ? "1 copy to buy" : `${copies} copies to buy`,
  // The empty plate's accessible name, since `Add a partner` alone does not say
  // a partner for WHAT once the list has scrolled.
  addPartnerAria: (primary: string) => `Add a partner for ${primary}`,
  // The proposal's, so a screen reader hears that it is reversible before it
  // hears the name.
  proposedAria: (partner: string) => `Proposed partner from your list: ${partner}. Change or remove.`,
};

// ── Reused by reference. Do not re-mint. ────────────────────────────────────
//
// 1. The two commander names and the identity label are DATA, not copy. The
//    spine's caption is `{primary} + {partner}` with a literal ` + ` joiner —
//    not `·` (this app's fact separator, and the shipped caption uses it three
//    characters away), not `//` (assigned to two-faced cards by #363), not `&`
//    (reads as a unit rather than a sequence).
//
// 2. The resume row's short pair is shortCommanderName applied to both halves —
//    exported and pure at `decks-builder.ts:17`, so nothing new is needed.
//    Pair-only: a single commander keeps its full `deck.commanderName`, so no
//    shipped row changes its words.
//
// 3. `addPanelCopy.createPicker.dockSummary(name, identity)` is unchanged and
//    takes the pair as one string — `Ishai + Bruse Tarl` — through the same
//    argument it already takes a single name through. The dock is one truncating
//    line; it needs no partner-specific form.
//
// 4. `refreshCopy.decks.detailCopies` is unchanged AS A STRING, but decision 23
//    changes where it renders: the resume row drops the clause entirely on pair
//    decks, because `62 pill + 28 gaps + 113 long-form count = 203 > 200` leaves
//    negative room for any name at all. It is not shortened, abbreviated or
//    ellipsised — a partly truncated figure reads as a different figure. The
//    clause survives in the row's sr-only text.
//
//    The status words and every other count string are untouched. The count's
//    DENOMINATOR moves with the §4 ceiling — a pair deck reads `/ 98` — but the
//    sentence shape does not, so those five "of 99" strings in
//    `copy/top-off.ts` are §7's mechanical parameterisation, not a copy review.
//
// 5. `deckImportCopy.commander.nameLabelFromSource` and `.nameLabel` still label
//    the deck-name field in import mode only. A pair does not change what that
//    field is for.
