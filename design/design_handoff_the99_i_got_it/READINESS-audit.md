# Readiness audit: I got it (sub-project 4), R2

Audited 2026-10-09 against `docs/superpowers/design-briefs/2026-10-09-collection-i-got-it.md` and `origin/main` at 500a3d8d5. Handoff READINESS.md claims were verified, not trusted; its "Not read" list (write.ts, price-query.ts) was read here.

## Verdict: YELLOW

Every item in the brief's "Open for Design to call" (1-8) is made and recorded (README, "The eight Design calls"). Every closed ruling holds. What remains is engineering-resolvable, plus four items Hugh should confirm that the handoff itself lists as open.

## Open items 1-8: made and recorded

| # | Call | Where | Result |
|---|---|---|---|
| 1 | Control placement | README call 1, STATES A1-A12 | The shipped buy tag becomes the button (verified: `BuyTag` row variant is a plain `<span>` on main, so nothing is displaced). Within the brief's call 1; reads as one action because there is still one tag. |
| 2 | Confirm form | README call 2 | Normal modal on desktop, bottom sheet on phone, one form. |
| 3 | Printing display | README call 3, B1/B2 | `PrintingRegion role="choose" layout="row"`, preset preselected with no badge and no price. |
| 4 | Quantity | README call 4 | Stepper, preset to need, cap 20, `1 spare` copy. |
| 5 | Receipt | README call 5, C1 | 1+2 toast, 8s, held on hover/focus/undo in flight; claimed form names the deck. |
| 6 | Undo | README call 6, C4-C8 | Toast Undo, `Checking decks…`, `ShortDeckWarning` with a new verb. |
| 7 | History entry | README call 7, D1-D4 | Live `From Shopping` tag, deck line resolved at read time, deleted-deck form keeps Revert. |
| 8 | Leave transition | README call 8, C9 | Spent-slot shape, 150ms crossfade, no height animation. |

## Closed rulings

- **Defaults to the printing behind the Shopping price, changeable:** holds (B1, B2). The preset finish follows `priceOf`'s states (`priced` gives nonfoil; `foilOnly` gives foil, else etched). `priceOf` returns null for a `sold out` row, so there the finish preset has no source in the price: build rule, nonfoil when the printing offers it, otherwise its first offered finish. The handoff does not state this.
- **One entry tagged `From Shopping`:** holds. Consistent with the reserved, ghosted tag in `design_handoff_the99_collection_edit/` (F1 row; its README line 46 and READINESS item 7).
- **Undo is a revert and shows `ShortDeckWarning`:** holds for every deck except the source deck (see Hugh item B).
- **Switch off matches main:** holds for the row, with one internal contradiction (finding 5).
- **Phone and desktop both drawn:** holds. Every A-D state has a 390 and a desktop frame (A: R2 canvas; C/D/E: R1 C-D-E canvas; History drawn at both widths).
- **About entry drawn, ships at the end of the launch:** holds. `about-entry/` has the §G artboard and the entry object; `since: 12` follows `ABOUT_VERSION = 11` on main; `stand-ins` exists in chapter 03 (`src/lib/copy/about.ts:755`).

## Checked against what has shipped

- `applyCollectionChange`, kind `edit`, `source: shopping:<deck id>`: the handoff matches. `EditRow.expected` and `staleEdits` give the required stale outcome (`status: "stale"` with `current`), `opts.id` is the per-press idempotency key (`alreadyApplied` makes a double press apply once), and `planEdit` keeps an existing holding's condition and `scryfallId`, as the brief says.
- `confirmShort` and `wouldShort` exist, and `revert` runs the same deck check.
- Tokens: all 26 `var(--x)` names in the canvases and About artboard exist in `src/app/globals.css`.
- Copy: `i-got-it · copy strings.ts` and the About entry contain no em or en dashes in shipped copy and no British spellings (the About entry file has one `—` in a code comment, line 11). The `—` in `IGI Row*.dc.html` is the shipped empty-figure glyph, not copy.
- The 1+2 components this handoff reuses (`PrintingRegion` choose role, `ShortDeckWarning`, the toast, the History page) are not on main yet. That is sequencing (brief: ships after sub-project 2), not a gap.

## Server gaps (what the UI needs that the server cannot supply today)

1. **Printing behind the price.** `PriceFact` (`src/lib/decks/price.ts:24`) and `loadPrices` (`price-query.ts`) carry cents only; the chosen printing is `distinct on (oracle_id)` inside the CTE and is dropped. Add `scryfall_id`, set code and collector number to the fact. (Handoff flag 4. Note a `sold out` row still has a chosen printing, a stale one, so the preset works there too.)
2. **Finish validation.** `write.ts` never reads `printings`; `collection_items_finish_check` only restricts the enum. A new action must check that the printing exists for the oracle id and that the finish is in `printings.finishes` before calling `applyCollectionChange`, or a forged or stale client can save a finish the printing lacks.
3. **Source deck excluded from the undo check.** `newlyShort` considers every committed deck, so this needs an option on `revert` (for example `ignoreDeckId`, derived from `source`). Without it every clean undo on a committed deck warns about the deck on screen. Narrow by construction: `committedShortfalls` ignores uncommitted decks already.
4. **History deck line.** `HistoryListEntry.source` is raw text; resolving `shopping:<id>` to a live deck name, or to the deleted form, needs a join at read time. The column has no FK, so a deleted deck leaves the id behind, which is what the deleted-deck form needs.
5. **The receipt's "claimed by an older deck" and "short N".** `ChangeResult.applied` carries only the entry; claims are read before a write only when it lowers. The action must read `loadAvailability` for the oracle id after a raise, and run `allocateClaims`, to name the deck and the remainder.
6. **`expected` is per holding.** The player can change printing or finish inside the confirm, so the confirm must load the card's holdings (`owned-printings.ts` exists) when it opens and send the count of the (printing, finish) actually chosen. The handoff says the count "isn't printed"; the brief says "the count on screen". The behavior is the same if the count is read at open.

## Findings

1. **[eng-resolvable] Finish control on a changed printing.** The chips come from the selected printing's `finishes` (B3 draws the foil-only case with the other finish dashed). Not drawn: a printing change while a finish is picked. Rule to build: options always derive from the new printing's `printings.finishes`; keep the current finish when it is still offered, otherwise nonfoil, otherwise the first offered. Etched-only and three-finish printings have copy (`etchedOnly`) but no frame; use the same chip pattern.
2. **[eng-resolvable] `alreadyReverted` and `notFound` on undo.** Not drawn. Treat `alreadyReverted` as undone (the toast's `undone` form); `notFound` as the failed form.
3. **[eng-resolvable] Held slot over revalidation.** C9's slot must survive the revalidation the action triggers; the existing `spent` slot mechanism (`spent-slot-undo`) is the model.
4. **[eng-resolvable] History tag source.** There is no `shopping_mark_bought` kind in the schema (`kind` stays `edit`; `collection_history_kind_check` is unchanged). The tag is `kind = 'edit'` and `source like 'shopping:%'`, and the copy key name in `collection-edit.ts` is a UI-side label only. No migration.
5. **[eng-resolvable, Design wording] Shipped-surface changes versus "the row is main's".** README flags two changes to shipped surfaces (the ⇄ key text shortened; below `lg` the stack flipped to `buy` over `over $X`; main has `over $X` above the tag, `decklist-row.tsx:653-663`, below `lg` only; from `lg` it sits inline after the figure). The E frame says "Visually the row was always main's". Both statements cannot hold with the switch off. Build rule: gate both changes on `SHOPPING_MARK_BOUGHT_ENABLED && COLLECTION_EDIT_ENABLED`, so off is main.
6. **[eng-resolvable] Copy.** All strings go through `/copy-review` as the handoff says. Annotation prose in the R1 C-D-E canvas uses six `&mdash;` entities and the R2 A-B canvas and READMEs say "neighbour", "centred" and "judgement". None of it is shipped copy; fix only if the canvases are edited again.
7. **[Hugh, confirm] A. Fallback printing.** The brief says the no-price preset is "the Add cards default"; the 1+2 handoff (Hugh, 2026-10-09) ruled Add cards has no default. The handoff follows the ruling: nothing preselected, `Choose a printing`. Consistent with the earlier ruling; confirm that it is also what the brief meant.
8. **[Hugh, confirm] B. Source deck left out of the undo warning** (gap 3). A committed source deck that goes short after an undo gets no warning. Its returning row is the signal. The alternative is to warn about the deck on screen every time.
9. **[Hugh, confirm] C. Toast 8s for the three-line claimed form; D. cap of 20.** Both are judgement calls the handoff already marks. The row repeats the claimed fact, so nothing depends on the toast, and the fallback is 12s for the claimed form only.
10. **[Unverifiable] "Approved to ship (Hugh, 2026-10-09, LGTM)"** in READINESS.md and README. Recorded by the handoff, not checkable from the repo.

## Errata inside the handoff (Design's next pass; not edited here)

Found by the Copilot round on this PR. Each is real, and none changes the verdict. Build rules until Design corrects the source:

1. **Accessible name of the buy tag.** README call 1 and the R2 canvas say `I got it: <card>`; `gotItCopy.row.tagAria` and `IGI Row` render `Bought <card>? Add it to your collection`. Build the copy-strings name (`tagAria`), which `/copy-review` owns anyway.
2. **Toast live region.** `IGI Toast.dc.html` hard-codes `aria-live="polite"`, which overrides `role="alert"` on the failed state. Build with the roles alone: `role="status"` for the receipt, `role="alert"` for failure, no explicit `aria-live`.
3. **README "Notes for engineering" still names the withdrawn R1 shape** (popover; the details link as `I got it`). The R2 truth is the modal and sheet, and `Bought this card?` for both the title and the link (README lines 9-10, call 2, STATES A11). Build R2.
4. **STATES A1 "Must not: differ from `main` by a pixel"** conflicts with the approved phone-stack flip (finding 5). The exception is: with both switches on, below `lg`, `buy` sits above `over $X`; with either off, the row is main's.

## Contents drawn (every canvas)

- `The 99 - I Got It (R2) · A Row and B Confirm.dc.html`: current. Shipped Shopping view at 1300 (confirm open) and 390; every row shape (plain, every neighbor, spoken for, commander, sold out, bare buy, foil-only price); the buy tag's states; the details-link second way in; the confirm as desktop modal and phone sheet.
- `The 99 - I Got It (R1) · C Receipt, D History and E Switch off.dc.html`: current. Receipt (clean, claimed, partial), undo (checking, warning as sheet and dialog, in flight, done, failed), leave transition, History entries (live, reverted, deleted deck), switch off.
- `The 99 - I Got It (R1) · A Row and B Confirm.dc.html`: superseded, kept for the record.
- `IGI Row.dc.html`, `IGI Row R1.dc.html`, `IGI Confirm.dc.html`, `IGI Toast.dc.html`: canvas parts, not production components.
- `about-entry/The 99 - About · I Got It Entry.dc.html` and `brand/The 99 - Brand Sheet.dc.html`.

## Gate notes

The `dialog.test.tsx` "delayed disturbance" test and an About load-timeout are known flakes on main; neither failed on this run: `pnpm typecheck`, `pnpm lint` (0 errors, 44 existing warnings) and `pnpm test` (755 files, 13,044 tests) all passed. Docs only, so no build ran.
