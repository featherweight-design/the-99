# Readiness audit: Deck printings (sub-project 3), R2

Audited 2026-10-09 against `docs/superpowers/design-briefs/2026-10-09-collection-deck-printings.md` and `origin/main` at e319b00ce, and Hugh's rulings of 2026-10-09. The handoff's own READINESS.md claims were verified, not trusted.

## Verdict: ORANGE

Two Design calls are missing or wrong, both small and both with a recommended answer below: the region's intro line in deck scope (finding D1) and the price of a pick that is sold out (D2). Everything else is engineering-resolvable. Flip to YELLOW once Design (or Hugh) answers D1 and D2.

The four rulings are drawn correctly: a pick is cosmetic (no banner, Commit or History line, analysis not stale), the commander is in scope, one pick per card per deck, ownership by card with no buy created by a pick. R2 supersedes R1 where noted at the end.

## Open items 1-9

| # | Call | Result |
|---|---|---|
| 1 | Where choosing lives | The card's Set field disclosure, in card details opened from a deck. Pinned line `For this deck`. Holds, subject to D1. |
| 2 | Second door | None; card details only. Recorded. |
| 3 | Owned only, or every printing | Owned only (Hugh's R2 review). This departs from the brief's Locked line "reuse `PrintingRegion` in its choose role": on main the choose role is `source: "catalog"` only (`printing-region.tsx:98`), so owned-only is the art role plus a `scope` prop. Sound; the departure is recorded in the README. |
| 4 | Choice versus default | No mark on rows, tiles or Shopping; only art and the priced figure follow. Recorded. "You own a different printing" is moot with owned-only picks. |
| 5 | Sold out or never stocked | NOT resolved. See D2. |
| 6 | Reset | None; picking another tile is the way back. Recorded. |
| 7 | Import and export | Strip clause and export lines drawn. Findings E3, E4. |
| 8 | Commander | Same Set field in its own details, from the head's art. Holds; see E1 and E2. |
| 9 | Older versions | No marker; older versions show today's art. Recorded. |

## Design findings

- **D1. The drawn region omits an element the shipped region always renders, and that element is wrong in deck scope.** `PrintingRegion` renders `regionIntro(n)` ("You own N of these. Pick the one that represents this card.") and, once picked, `regionIntroPicked` ("Your pick shows wherever this card appears in your collection.") at `printing-region.tsx:336-340`, with `copy/collection.ts:514` noting "Do not mention decks". The R2 canvas (`DP Picker.dc.html`) draws the region with no intro line at all. Opened from a deck, the picked sentence would be false (the pick shows in this deck only), which is the confusion between "show it everywhere" and "this deck uses it" the brief's Locked section exists to prevent. READINESS.md and README.md say "one new string" (the pinned label); the copy file carries five; this makes at least six. Recommended: in deck scope the region draws no intro line, drawn that way in the canvas and stated in STATES; or a deck-scope intro replaces both. Either way it is an explicit call, not an omission.
- **D2. A pick that is sold out or never stocked is undrawn, and R2's reason for cutting it does not hold.** README departure 1 says those states "only occur on a spoken-for Shopping row, where the shipped buy tag already covers them". The tag does cover the vocabulary (`sold out`, bare `buy`); it does not cover the decision. A spoken-for row is a card the player owns, so an owned printing is picked, and an old owned printing is often not in the feed. Today the tag shows the cheapest printing in stock (`price-query.ts`, `distinct on` ordered live, non-foil, cheapest). After this ships it would read `buy · sold out` for a card the Mana Pool link (names only) can still buy in another printing. Design must say which: (a) price the pick and say `sold out`, honest about the pick but a regression for a buyable card; or (b) price the pick when stocked, otherwise fall back to today's cheapest-in-stock figure, which keeps the tag truthful but means the I got it preset (the printing behind the price) is then not the pick. Recommended: (b), with the preset following the printing actually priced, and "I got it" still never writing the pick.

## Engineering-resolvable findings

- **E1. Commander membership.** The deck page mounts the details provider with `deckOracleIds={proxyEligibleIds}`, which is `deck.cards` alone (`builder-shell.tsx:1247`); commanders arrive separately as `comboDeckOracleIds`. Gating the pick on the proxy set would silently give commanders no Set pick, and the pick must also be refused for cards the deck does not hold (Consider and search results open under the same provider). Gate on the commander-inclusive set (`comboScopeIds`), as `setCardProxied` gates on membership.
- **E2. Storage shape.** Neither commander is a `deck_cards` row, so a column there cannot hold a commander's pick. The precedent is `deck_proxies` (`schema.ts:530`): a side table, outside versioning, keyed `(deck_id, oracle_id)`. That also matches ruling 1 (cosmetic, like a proxy). `deck_version_cards` gains nullable printing columns for "versions after the line record the printing each card showed"; nullable, no backfill. The commit snapshot must keep them out of the draft-versus-version diff, which compares oracle id and quantity (`draft-state.ts`). The new table needs the `user_data_touch` trigger, or `pnpm check:list-cache` fails and Home and `/decks` serve stale commander art. Commander art on Home and `/decks` deck tiles follows the resolver ("one rule covers every surface"); neither surface is named in the handoff.
- **E3. Strip composition.** The copy file appends `importClause` to `deckImportCopy.arrival.clean`, which ends in a full stop ("All N lines came over clean. Imported from your list a moment ago."), giving "...a moment ago., 12 with the printing you own". The canvas draws "All 100 lines came over clean, 12 with the printing you own." and, on the phone, "All 100 came over · 12 printings kept", dropping the shipped provenance ("Imported from your list a moment ago", "from your list, just now"). The copy file does not reproduce the canvas. Resolve in `/copy-review` with a combined string; whether the provenance sentence survives is Design's to confirm.
- **E4. Export.** The canvas labels the preview "unchanged", but the commander line gains a printing (`1 Gishath, Sun's Avatar (LCC) 1`); `buildDecklistText` writes commanders by name only (`export-helpers.ts:58-61`), and the import round trip must then read a printing off a commander line. The `//` header and rule in the preview are the dialog's presentation, not export text. Also note an export names an owned printing only, so with owned-only picks the pick and the existing owned-copy naming coincide for picked cards.
- **E5. Price source, and the money card.** `price-query.ts` is keyed by oracle id, deck-independent. Pricing the pick needs a per-(deck, oracle) read. After this ships, row tags follow the pick while Deck stats' money card (PR 6, not merged; PRs 1-3 are on main) sums today's cheapest, so the two disagree. The brief calls pricing picks in the money card a follow-up; the README's follow-up list omits it. Name it in the plan.
- **E6. Pick lapse and Undo.** "Its pick left the Collection" clears the stored pick. Collection edit has Undo and History (F); undoing a removal restores the copies but not the cleared pick. Acceptable ("cheap to make again", as drawn) but it should be stated, or the pick kept and ignored while unowned. Note the second option re-activates an old pick on re-acquire.
- **E7. Version restore.** Not drawn: whether restoring or viewing an older version touches picks. Consistent with ruling 1 and `deck_proxies`: restore leaves picks alone.
- **E8. Phone coverage.** Drawn at 390: A1 (picked, open), A2 (nothing picked, picked, one printing), C (strip). Not drawn at 390: save failed, overflow, pick-left, open-nothing-picked, commander head, deck tiles. All are shipped components or one-line states and the R2 canvas is the only current drawing of them; acceptable, but the contact sheet at feature close must cover them.
- **E9. READINESS build check 1** ("`card-modal.tsx` wasn't read in full: confirm every deck surface opens details with deck context"). Verified in part: the deck context is provider-level (`CardDetailProvider deckId`, `builder-shell.tsx:1243`), so rows, tiles, the card view and the commander door (`change-commander-door.tsx:91,168`) all carry it. Also mounted with `deckPage` and no `deckId`: `update-diff.tsx:231` and `review-changes.tsx:898`; those must not offer the pick. `proxy-list-view.tsx:156` mounts none.
- **E10. About entry shape.** `AboutEntry` (`about.ts:77`) requires `width`; the canvas draws "plate" but the `.ts` object omits it and a `chapter`/`specimen` string the siblings do not carry. `AboutSwitch` lacks `DECK_PRINTINGS_ENABLED`. Both are build-time. The "7 new" sheet count holds (five collection edit entries, I got it, this one).
- **E11. Approval date.** README and READINESS say "approved to ship (Hugh, 2026-10-10)"; the brief and the audit date are 2026-10-09. Not verifiable from the repo; confirm the approval is on record before D1 and D2 are closed.

## Verified, holds

- **Tokens:** every `var(--x)` in all eight canvases, including the About artboard, exists in `src/app/globals.css`. No new tokens.
- **Copy:** `deck-printings · copy strings.ts` and the About entry have no em or en dashes in shipped strings and no British spellings. The `&mdash;` in the R2 canvas is the card's oracle text and the export preview's rule. Dashes in the `.md` titles and one code comment are not copy.
- **Consistency with collection edit and I got it:** `PrintingRegion` gains `scope`, alongside the `role`/`source` props from the 1+2 handoff; finishes stay `printings.finishes` held counts for tiles; the pick is `(set_code, collector_number)` with no finish, matching the art preference. The I got it preset prints the printing behind the price (its README call 3), which E5 and D2 must keep in agreement. The brand sheet and `support.js` copies are byte-identical to `design_handoff_the99_i_got_it/`.
- **Migration effects:** nothing looks different on the day it ships (no pick, no change), no deck reads edited, no history line, older versions keep resolving as today. Lands after Deck stats PR 6 (see E5).
- **Switch:** `DECK_PRINTINGS_ENABLED` off passes no deck scope and skips resolver step 1; picks are kept. R1 said picks are not stored while off; superseded.
- **About entry:** drawn (`about-entry/`, chapter 03 after `export`, which exists at `about.ts:876`), `since: 12` follows `ABOUT_VERSION = 11`, ships with the launch bump, not in this round.

## What R2 supersedes in R1

R1 chose any catalog printing, owned or not, with `Use the default`, a Printings group in versions, an older-version line, an import report naming printings it could not match, and a sold-out chosen printing on the row. R2 drops all of it: owned only, no reset, no new block, nothing reported for a printing not owned. R1's "printings are not stored while the switch is off" is replaced by "kept". R1 B (deck views, 390 tiles) is partly still the best picture of the phone, but R2 says those surfaces are `main`'s.

## Server gaps

- A pick store (E2) and nullable printing columns on `deck_version_cards`; `user_data_touch` trigger on the new table.
- A resolver (deck pick, then art preference, then default) keyed per (deck, oracle); today `owned-printings.ts` and `price-query.ts` key by oracle alone.
- A write action gated on commander-inclusive membership (E1); clear-on-lapse in the collection write paths (E6).
- Import: read a printing off a line and keep it only if owned; commander lines too (E4).
- Export: pass the resolved printing, commanders included.

## Errata (Design's files are not edited)

- README and READINESS "one new string" is five in the copy file, plus D1.
- README (Tiles) and the picked frames draw `Shown now` on the deck's fallback printing while a pick exists. On main `Shown now` means the art on screen (`printing-region.tsx:446`, `!picked`), so in deck scope `resolvedKey` must be passed as the fallback, not the printing shown; the label then names what the deck would show without its pick. A reader may take it as what is shown now. Eng-resolvable; `/copy-review` may prefer a different label there.
- The export preview is labelled "unchanged" but gains a printing on the commander line (E4).
