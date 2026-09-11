# States — /collection/sets and /collection/sets/[code]

Every state in the spec's "Surfaces and states", at both widths. Each row says what the state **is**,
what it **must not do**, and where it is drawn.

## /collection/sets — the index

### S1 · First run (no collection uploaded)
Centred block: three `--border-dashed` diamonds, Cinzel 19px *Upload your collection and the sets
appear*, 13.5px `--fg-muted` body, one filled 48px `Upload a collection`, and below it a mono
secondary route — *or search a set to browse it at 0%*, because ruling 5 makes that real even with
nothing uploaded.
**Must not:** show an empty list with a search field above it, or borrow a different upload page —
it points at the same locked upload surface the other first-run surfaces do.
*Drawn: §2, phone.*

### S2 · Populated
Rows: 26px icon disc · 44px code · name + release date · extras count · ratio block (mono 15px figure,
`/ M`, percent, 4px bar) · chevron. Ordered `released_at desc`. No paging, no window.
**Must not:** sort by completion (that reorders the list every upload), or hide the release date at
desktop — it is how a reader recognises a set whose name they half-remember.
*Drawn: §2, desktop + phone.*

### S3 · Search active
The field takes an `--accent` border and a clear disc. Results span **all collectible sets**, mixing
sets you hold with sets at 0%. Result line: `3 collectible sets match · 2 of them are new to you`.
**Must not:** grey the 0% rows, or split into two lists/tabs — the 0% row is a legitimate destination
and the result line already carries the only fact a scope control would have.
*Drawn: §2, desktop.*

### S4 · Search, no match
Cinzel *No set called `qqz`*, 13.5px body making the point that search covers every collectible set so
this is a spelling and not a gap in the collection, plus a 44px `Clear the search` hairline.
**Must not:** say "none of your sets match" — that would be true of the at-rest list and false of the
search.
*Drawn: §2, phone.*

### S5 · `base_set_size` is null — not yet indexed
The ratio slot carries a dashed `--fg-locked` tag reading `not indexed yet`. **No bar is drawn at all.**
The row still links, and lands on the grid's loading state.
**Must not:** render `0 / 0`, `0%`, or an empty track — the spec's nullable migration exists precisely so
a null denominator cannot be read as a real zero, and an empty track is what **0%** looks like (S8).
*Drawn: §2, desktop, last row.*

## /collection/sets/[code] — the grid

### S6 · Loading
Route-level `loading.tsx`. Head name + icon render immediately from the index row; ratio, cost strip
and grid are skeletons. Cell plates are `--surface-inset` with a **solid** `--border` edge.
**Must not:** use the dashed missing edge or the 28% dim on a pending cell, and must not use a spinner
— a cell that is still arriving must never be mistakable for a card you do not own.
*Drawn: §3, phone.*

### S7 · The grid — base run + extras
Base run in collector-number order, 001–276, under a Cinzel `Base run` heading with `62 / 276`. Extras
below under their own heading with `7 / 123`, one type-step down, each cell carrying its treatment
(`showcase`, `borderless`, `extended`, `promo`). Missing cells carry number, name, rarity and price.
**Must not:** put extras behind a tab, fold extras into the headline figure, or reorder either section
by ownership.
*Drawn: §3, desktop (24 base cells + 8 extras).*

### S8 · 0% — nothing owned
The grid, with no lit cells. No empty state, no illustration, no *start collecting*. The cost strip is
the one thing that gets louder, because at 0% it is the only figure that has moved and this is the state
most often arrived at from search.
**Must not:** add an empty state on top of 261 dimmed cards — that describes the screen to the person
looking at it.
*Drawn: §3, desktop.*

### S9 · 100% — complete
See README call 2. Head only: `--success` hairline round the head block, ringed icon, Cinzel
*`<Set>`, complete*, `100%` and full bar in `--success`, cost strip replaced by the promoted extras
count and one hairline button. Missing-only inert, glossed *nothing missing to show*.
**Branch not drawn:** a 100% set with **no extras** or **zero extras owned** — the promoted line then
reads `Extras 0 / 0` or `0 / 96`. Rule: with `extras = 0` the line is replaced by *Nothing left in this
set*; with extras present but none owned the line renders normally (`0 / 96`) and the button reads
`Cost the 96 extras`.
**Must not:** animate, badge the index row, or change the grid.
*Drawn: §3, desktop.*

### S10 · Missing-only on
214 of 276. Numbers skip, and **the skip is stated once in the result line and never marked in the
grid**. The collector number brightens to `--fg-muted` in this mode.
**Must not:** draw gap glyphs or placeholder cells for the hidden 62, or renumber the visible cells.
*Drawn: §3, desktop + phone (390px).*

### S11 · Rarity and colour, alone and combined with missing-only
All three controls render at all times and grey rather than disappear. Active controls take an
`--accent` border; the phone `Filters` button carries a count badge of controls off default (max 3 —
missing-only, rarity, colour; a multi-pip colour selection counts once).
**Must not:** collapse or reorder the rack at any result count; it holds its height at zero.
*Drawn: §3, desktop rack at rest and at three-active; phone at two-active.*

### S12 · Filters combining to zero
Cinzel *You are not missing any white mythics*, body naming the count that exists and the cheapest
correction, one filled `Show all 4` + one hairline `Clear filters`. The cost strip reads
`$0.00 over 0 of 0` rather than disappearing.
**Must not:** offer *clear everything* first. With missing-only on, zero means you own everything that
matched — the opposite of /commanders' zero, and the copy has to carry that difference.
*Drawn: §3, desktop.*

### S13 · Unknown set code
Cinzel *No set with the code `ZZZ`*, body naming both causes (wrong link / too new for the checklist),
one filled `Back to your sets`. Breadcrumb survives.
**Must not:** be a 404 route, or offer a search field.
*Specified; the shared layout is drawn as S14.*

### S14 · Non-collectible set code
Cinzel *Secret Lair Drop has no set to complete*, body explaining there is no fixed numbered run so
there is no denominator, plus the count of cards you hold from it. Two buttons: `See those 11 in
Collection` (filled) and `Back to your sets` (hairline).
**Must not:** show a grid with a null denominator, or a 0% bar.
*Drawn: §3, desktop.*

### S15 · Price absent (unstocked) vs foil-only
Four price cases in one skin, plus the owned-in-foil cell. Unstocked: `no stock`, `--fg-locked` on a
dashed hairline, **excluded from the cost total and named in the sentence that states it**. Foil-only:
`◆ foil $14.10` — finish before figure, because a foil price read as a normal price is the one error
here that costs money.
**Must not:** render `$0.00`, an empty slot, or a tag whose height differs from the priced case.
*Drawn: §3, the price-slot strip.*

### S16 · Unpinned fill (ruling 4) — **ruled at R2: mark the cell**
Owned cells filled by `oracle_id` carry an **outlined** brand diamond + mono `BY NAME`, bottom-left of
the art, in the foil mark's skin. The filled diamond is `printing_picker`'s shipped `Your pick`; this
is its unset half. Plains #262 filled and marked, Plains #268 missing.
**Must not:** appear on a missing cell, become a control, or introduce a second write path against
`card_art_preferences` — the cell's existing target opens card detail, where the `Set` picker lives.
**Consequence to build:** pinning #268 there fills #268 and empties #262, ratio unmoved. Requires
`revalidatePath` to reach `/collection/sets/[code]`.
*Drawn: §3, three marked cells including the Plains pair.*

### S18 · An upload completes while the set page is open
The page holds every figure it was serving. One `--accent`-edged strip inside the head names the delta
for this set — `Your upload finished. 17 more cards from this set are in your collection now.` — with a
filled `Refresh the grid`.
**Must not:** re-render under the reader, use a toast, or be dismissible. If the delta is zero it never
appears.
*Drawn: §3b, desktop.*

### S19 · A set name long enough to wrap the sticky head at 390px
The name clamps to two lines and the head grows 96 → 118px once. The cost strip collapses to total +
button and its sentence moves under the result line.
**Must not:** truncate the set name, or let the head grow a third line.
*Drawn: §3b, phone.*

### S21 · The grid at 390px, base run, unfiltered
Three columns at 108px. Head carries breadcrumb, icon, name, meta, ratio, bar and the cost strip;
`Filters` + `Missing` sit in a sticky row beneath it. Section head repeats `62 / 276` and carries
`extras ↓`. Cell caption is **number and price only** — rarity drops at this width.
**Must not:** drop either mark (both survive at 8.5px), or move the extras into a separate screen.
*Drawn: §3, phone.*

### S20 · 100% with extras present but none owned
The cost strip re-scopes to the extras and prices them; the count line reads `Extras 0 / 96` beside
`the only thing left in this set`. Not a failure state.
**Must not:** hide the line, render `0 / 0` (that is the no-extras branch, S9), or keep the
Missing-only toggle — it is removed at 100%, not greyed.
*Drawn: §3b, desktop, beside the no-extras branch.*

## /collection — the one edit

### S17 · Entry point
`By set →` hairline pill, trailing cluster, outside the view well. Phone: a 44px pill paired with
`Filters`. **Absent, not disabled, at first run.**
*Drawn: §1, three options.*
