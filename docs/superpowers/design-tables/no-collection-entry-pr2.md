## No-collection entry, PR 2: the import's tick and the ✕-only arrival dismiss (2026-10-15)

Handoff: `design/design_handoff_the99_no_collection_entry/` (R2, approved by Hugh): `R2 - Import-Desktop.dc.html`,
`R2 - Import-Phone.dc.html`, `STATES-no-collection-entry.md` S8 to S12, `design-tables/no-collection-entry.md`, and
READINESS's engineering audit (the refusal goes in the page's own `FailureBanner`, not a toast). Plan
`docs/superpowers/plans/2026-10-15-no-collection-entry.md`, PR 2.

Enumerated from the handoff first, then each row verified against the code. ✓ matches; ≈ matches with the deviation
named; — not built here, with where it is.

### S8 · the box on `/decks/import`

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 1 | Shown when | collection editing on, at any collection size (G4) | `canOwn = noCollectionEntryEnabled(requestSwitchEnv(user))` from the page; the switch needs `COLLECTION_EDIT_ENABLED` | ✓ |
| 2 | Off | no checkbox (S16) | absent; the payload is exactly as shipped (pinned) | ✓ |
| 3 | Label | `I own these cards. Add them to my collection.` | `deckImportCopy.entry.own` | ✓ |
| 4 | Default | unticked, from first run and from `/decks` | `useState(false)` | ✓ |
| 5 | Place | under Deck name, above the import button, margin-top 16 | after the name field, before `PrimaryButton`, `mt-[16px]` | ✓ |
| 6 | Anatomy | the precon start's own checkbox: 18px box in `--accent`, 13px/1.45 label in `--fg-body`, the whole label the press, gap 10 | `OptInCheckbox`, extracted from `StartPreconDialog` and used by both | ✓ |
| 7 | Box | radius 4, 1.5px `--fg-faint`, ticked `--accent` with `--bg` ✓ | the dialog's native box with `accent-color: var(--accent)`, as the precon start ships it | ≈ the shipped anatomy, not a re-drawn box (plan: "uses StartPreconDialog's opt-in anatomy") |
| 8 | Row, phone | `align-items: center`, the row hugs its line; READINESS: every press ≥44px | `min-h-[44px] items-center` | ✓ |
| 9 | Row, desktop | `align-items: flex-start`, no extra height, inside the 760 column | `md:min-h-0 md:items-start` | ✓ |
| 10 | Ticked, the rest of the page | nothing else changes; button keeps `Import N cards` | button untouched | ✓ |

### S9 · pending

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 11 | Waiting state | shipped `Reading the list`, nothing new | `ParsingBlock` untouched | ✓ |
| 12 | Order | the add settles before the deck is made | server: `importDeckOwned` (PR 1) | ✓ |

### The tick through the commander step

| # | Property | Handoff / plan | Built | |
|---|---|---|---|---|
| 13 | Carried | the tick carries through the commander-needed step | `own` is entry state; the second pass sends `own` and the SAME `actionId` (pinned) | ✓ |
| 14 | Picker | no checkbox drawn on the picker | the picker is unchanged | ✓ |
| 15 | Idempotency id | one per submission, reused by a retry | minted on the first ticked press, kept across the commander step and Try again; a new list, file or mode drops it; a name edit does not | ✓ |

### S10 · ticked, done (the deck page)

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 16 | Form | `ArrivalBand` `lines` at both widths (the phone takes the same three lines) | `ArrivalStrip` with `added` renders `ArrivalBand lines` | ✓ |
| 17 | Head | `All 100 lines came over clean.` 13.5/600 `--fg` | `arrival.own.head(n)`, n = the deck's line count | ✓ |
| 18 | Body | `All 100 cards added to your collection.` + `History`, 12.5 `--fg-body`, History `--accent` underlined | `arrival.own.body(copies)` + the band's link to `/collection/history?entry=<id>` | ✓ |
| 19 | Meta | `Imported from your list a moment ago`, mono 10.5 `--fg-faint` | `arrival.own.meta` | ✓ |
| 20 | Mark | `✓` `--success`, top-left, level with the head | the band's shipped `lines` mark | ✓ |
| 21 | Count | cards are copies | `copies` = the entry's rows' raised quantities, read from the ledger (`readImportAddReceipt`), never from the URL | ✓ |
| 22 | Claim | (eng) | `?added=<entry>` beside `imported=1`; answered only for the reader's own unreverted `add` with source `deck:<this deck>`; spent once seen (`StripAddedParam`) | ✓ |
| 23 | No second strip | "a second strip" is a Must-not | one band | ✓ |
| 24 | Printing clauses | plan: carries through every arrival variant | head `All N lines came over clean, 12 with the printing you own.` at both widths | ≈ not drawn; the clause joins the head |
| 25 | Unresolved lines | plan: carries through every arrival variant | the band also draws over unresolved lines, beside the banner: head `97 cards added to your collection.`, body `The lines we couldn’t put a card to added nothing.` + History | ≈ not drawn; eng-authored copy for `/copy-review` (PR 6) |

### S11 · ticked, refused

| # | Property | Handoff / READINESS | Built | |
|---|---|---|---|---|
| 26 | Channel | READINESS (eng audit): the page's own `FailureBanner`, not a toast; one refusal channel per page | `FailureBanner`, `role="alert"`, `id="import-failure"` | ✓ (the R2 board's toast is superseded by the audit) |
| 27 | Refused | `addFailed`: `We couldn’t add those. Your collection is unchanged.` | `failures.addFailed.heading`, the precon add's own string, no body | ✓ |
| 28 | Threw | `addUnsure`: `Couldn’t confirm the cards were added. Try again and they won’t be added twice.` | `failures.addUnsure.heading`, when a ticked press throws (the size cap excepted) | ✓ |
| 29 | Action | `Try again`, the same press, safe by the id | the banner's button repeats the last press's arguments with the same id | ✓ |
| 30 | What stays | the list and the box stay | list, name and tick kept (pinned) | ✓ |
| 31 | Never | make the deck anyway | the server returns `addFailed` with neither written (PR 1) | ✓ |

### S12 · imported unticked

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 32 | Strip | the shipped one-line strip | unchanged but for the dismiss below | ✓ |
| 33 | Offer | no offer after the import | none | ✓ |

### The ✕-only dismiss, every arrival strip

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 34 | Glyph | `✕` alone at both widths; the word `Dismiss` dropped at every width | `ArrivalDismiss` draws `✕` only | ✓ |
| 35 | Name | `aria-label="Dismiss"` | `deckImportCopy.arrival.dismiss` (the update strip passes its own `Dismiss`) | ✓ |
| 36 | Phone press | 44×44, margin -12px -12px -12px auto, 12px, `--fg-faint` | `h-[44px] w-[44px] -my-[12px] -mr-[12px] ml-auto text-[12px]` `--fg-faint` | ✓ |
| 37 | Desktop press | 32×32, margin -6px -8px 0 auto, 13px | `md:h-[32px] md:w-[32px] md:-my-[6px] md:-mr-[8px] md:text-[13px]` | ≈ bottom margin -6px rather than 0, so a one-line band keeps its height |
| 38 | Hover | (shipped) | `--accent` on hover from md, as before | ✓ |
| 39 | Which strips | every arrival strip, the precon receipt (S5) included | `ArrivalBand` (import, ticked import, precon start) and `UpdateStrip`; S5's receipt is PR 3 and takes the same component | ✓ / — S5 in PR 3 |
