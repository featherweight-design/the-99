# About The 99 — feature close-out

**Walked:** 2026-09-15, re-walked 2026-09-16 against `main` at `0d86b953`, in a real browser at 390×844 and 1300×900.
**PRs:** #653 (copy, table, guard) · #658 (page, gate, menu row) · #666 (five figures, compact
layout) · #670 (close-out, caption fix) · #673 (contents rail, annotation numerals, chapter 01) ·
#682 (the remaining 23 figures).
**Contact sheet:** `docs/superpowers/inventories/about-page.json` →
`node scripts/contact-sheet.mjs docs/superpowers/inventories/about-page.json`.

## The inventory

| Surface | 390px | 1300px | Notes |
|---|---|---|---|
| `/about` — reader at version 0 | ✅ | ✅ | Every entry, nothing marked, dismiss present |
| `/about` — the availability plate | ✅ | ✅ | Four states, including the one that draws nothing |
| `/about` — the buy tag | ✅ | ✅ | Four claims, `sold out` and silence among them |
| `/about` — the fit bar | ✅ | ✅ | `73/100 FIT` and `27/40 MEASURABLE FIT` |
| `/about` — the decklist marks | ✅ | ✅ | Five rows, `//`, `$` and `P` among them |
| `/about` — the six statuses | ✅ | ✅ | Each with its count and its bar; Draft's track empty |
| `/about` — arriving with a destination (`?next=`) | ✅ | ✅ | Destination printed and carried |
| Account menu — `About The 99`, first, no badge | — | — | Not in the sheet; see below |

The account-menu row is deliberately absent from the contact sheet. Every verb in that script
reaches page content through `onPage`, which scopes to `<main>`, and the shell's account trigger
sits outside it by construction — a row for it could only be written by defeating the scope that
exists because two probes once measured the shell while naming a page. It is covered by
`account-menu.test.tsx` instead: the row's position, its link, the roving wrap past it, and its
busy state.

One row per figure, each reached by NAME. The first version took one scrolled shot labelled for
all five, which is a cell that reads as coverage while photographing one of them — and when that
was split into five, a pixel offset on the fit row silently scrolled past its own subject to the
entries below. `scrollTo` was added to `contact-sheet.mjs` for that: an offset is an address that
stops being true the moment the page above it changes length.

## What the walk found

**A caption stutter in the availability plate.** Each cell drew the marker and then repeated it:
`◆ none free` sitting directly above the words `none free`, `◇ 1 in a brew` above `in a brew`.
Both halves were individually correct, which is why four review rounds and every assertion in the
file passed over it — the marker was right, the caption was right, and together they read as a
fault. Captions annotate rather than echo now — **in all three plates that had it**. The pre-open pass
caught that the first fix was the instance rather than the class: the marks row drew
`1 in a brew` over the note `a brew wants it`, and the buy tag drew `buy·$6.40 foil` over
`foil only`.

`about-page.test.tsx` pins the rule for the **availability plate only**, and that scope is the
honest part. There the mark is the whole label, so "does the caption repeat it" is a containment
test. On the other two it is not: the marks row reads `Rhystic Study 2 1 in a brew` and the buy
tag `buy·$6.40 foil`, so the mark carries a card name and a price and neither string contains the
other. A loop written across all five plates ran green over the defect in two of them — it was
written, mutation-tested, found to measure nothing, and narrowed rather than shipped. Those two
are held by the fix and by the sheet.

That is the whole argument for this artifact, twice over. No assertion catches the stutter,
because there is nothing wrong with either string — and the assertion written to catch it
afterwards could only reach a third of it.

## What the walk could not answer

**The three rows are one reader state, not three.** The inventory's note called them three
states reached by URL; that is wrong and the note is corrected. `?next=` sets only the dismiss
destination. The page renders differently for a
reader at version 0, a reader who is behind, and a reader who is current — but the acknowledged
version lives in `user_prefs`, so the fixture account is in exactly one of them at a time. The
sheet's three rows all photographed the same state. The other two are covered by
`about-page.test.tsx`, which renders `seen={0}`, `seen={ABOUT_VERSION}` and a version-2 page with
one entry marked; a future walk wanting the real thing would have to write the row and put it
back, in the shape `probe:review` uses for its collection edits.

## Everything is built

**65 entries, 65 figures.** (Was 64: `upcoming-precons` was added 2026-10-14, the upcoming precons entry (Commander sets on the way), `Specimen`-rooted, behind `UPCOMING_PRECONS_ENABLED`, with no bump. Was 63: `find-a-deck-read` was added 2026-10-12, Find a deck's read, `Specimen`-rooted (one `ReadRow`), behind `FIND_A_DECK_READ_ENABLED`, with no bump. Was 62: `decks-stats` was added 2026-10-12, Stats on /decks's entry (your decks, side by side), `Specimen`-rooted, behind `LINEUP_ENABLED`, with no bump. Was 61: `added-copy` was added 2026-10-12, the added-copy line's entry (where a new copy goes), `Specimen`-rooted, behind `ADDED_COPY_ENABLED`, with no bump. Was 60: `notes` was added 2026-10-12, the Deck notes entry, `Specimen`-rooted, behind `DECK_NOTES_ENABLED`, with no bump. Was 59: `deck-tokens` was added 2026-10-12, the tokens line's entry, `Specimen`-rooted, behind `DECK_TOKENS_ENABLED`, with no bump. Was 58: `precons` was added 2026-10-12, the Commander precons entry, `Specimen`-rooted, behind `PRECONS_ENABLED`, with no bump. Was 57: `all-decks-cart` was added 2026-10-12, the all-decks cart's entry, `Specimen`-rooted, behind `ALL_DECKS_CART_ENABLED`, with no version bump: a switched entry is announced when its switch flips. Was 56: `mana-balance` was added 2026-10-11, the Tuning line close-out's entry (Mana Balance), `Specimen`-rooted, behind `MANA_BALANCE_ENABLED`, with no ABOUT_VERSION bump. Before that it was 54: `shopping-got-it` and `deck-printings` were added 2026-10-11, the collection home epic's entries (I got it and Deck printings), each `Specimen`-rooted, behind `SHOPPING_MARK_BOUGHT_ENABLED` and `DECK_PRINTINGS_ENABLED`, in the 13 to 14 bump. Was 53: `deck-benchmarks` was added 2026-10-10, the evidence benchmarks line's entry, `Specimen`-rooted, behind `DECK_BENCHMARKS_ENABLED`, in the 12 to 13 bump. Was 48: the five collection-edit entries `collection-add`, `upload-choice`, `edit-copies`, `remove-card` and `collection-history` were added 2026-10-10 with the collection edit launch, each `Specimen`-rooted, behind `COLLECTION_EDIT_ENABLED`, in the 11 to 12 bump. Before that it was 47: `deck-stats` was added 2026-10-10, the Deck stats line's About entry, no bump, switched by DECK_STATS_ENABLED. Before that it was 46: `credits` was added 2026-10-05, Hugh's ruling that credits get one entry of their own, with no version bump. Before that it was 45: `suggested-changes` was added 2026-10-05, H35 ruling 7 — see
about.ts — a feature launch, not a drift. Before that it was 46: `reservations` was retired
2026-10-04 — a removal, not a drift, so each is noted here rather than silently folded into the
count.) The ledger
in `about.test.ts` is empty and fails on any entry arriving
without one — and those three totals are pinned to the source by that same file, because this
paragraph has now gone stale twice: once by being written without counting, and once by a figure
landing on `main` between the correction and the merge.

This record previously said four composition plates were outstanding. That was wrong by a factor of
seven: the page had five figures against a handoff that drew one per entry, and the gap was
described as its four hardest plates. The number was not checked before it was written down, and no
artifact here would have contradicted it — the inventory photographed the figures that existed, so
the sheet confirmed the scope back to its author.

**Sixty-five are `Specimen`-rooted and zero are `Legend`-rooted.** (`upcoming-precons`, 2026-10-14, is `Specimen`-rooted; before it this read sixty-four. `find-a-deck-read`, 2026-10-12, is `Specimen`-rooted; before it this read sixty-three. `decks-stats`, 2026-10-12, is `Specimen`-rooted; before it this read sixty-two. `added-copy`, 2026-10-12, is `Specimen`-rooted; before it this read sixty-one. `notes`, 2026-10-12, is `Specimen`-rooted; before it this read sixty. `deck-tokens`, 2026-10-12, is `Specimen`-rooted; before it this read fifty-nine. `precons`, 2026-10-12, is `Specimen`-rooted; before it this read fifty-eight. `all-decks-cart`, 2026-10-12, is `Specimen`-rooted; before it this read fifty-seven. `mana-balance`, 2026-10-11, is `Specimen`-rooted; before it this read fifty-six. `shopping-got-it` and `deck-printings`, 2026-10-11, are `Specimen`-rooted; before them this read fifty-four. `deck-benchmarks`, 2026-10-10, is `Specimen`-rooted; before it this read fifty-three. The five collection-edit entries, 2026-10-10, are `Specimen`-rooted too; before them this read forty-eight, and before `deck-stats` (2026-10-10, also `Specimen`-rooted) forty-seven. `credits`, added 2026-10-05, is `Specimen`-rooted too, and before it this read forty-six. `suggested-changes` is also
`Specimen`-rooted, added 2026-10-05 — see about.ts. Before that it was forty-five, and before
`reservations`, itself `Specimen`-rooted, was retired 2026-10-04, it was forty-six.) This record said "four mount
and the rest are legends" — wrong when written, and wrong in the paragraph correcting a previous
wrong count, which was the second time a figure here was written down without being counted. It is
now every figure: chapter 04 converted the last four, and `Legend`, `Line` and `LegendBox` went
with them.

That makes the whole figure layer `aria-hidden`, so the rule the two populations existed to hold
is now carried by a check instead: every entry drawing a figure must have a caption or keys of its
own, because a hidden figure beside no prose hides its subject from exactly the readers least able
to recover it. `spokenAs` is the remaining way to put a figure's own content into the reading
order, and Discover's five orders — the case the legend existed for — use it.

**Width follows what the figure IS, and that is a ruling rather than a taste.** Hugh settled it
on 2026-09-19: a genuinely narrow figure takes `inset` and sits beside its text; a surface the app
draws full-width takes `plate` and sits under it. The canvas used the two-column rhythm for several
entries, and chapter 03/04 widened most of them — not for looks, but because an ~300px column
truncated real content: the shelf line wrapped to three rows, the Shopping rows read
`Dockside ...` and `R. —`, and the Top off strip stacked `THE LAST 5` into three lines. The
entries still on `inset` (`commitments`, `proxies`, `reservations`'s neighbours) are the ones whose
surface genuinely fits one.

The split is a settled rule rather than a shortfall: a figure reproducing a surface becomes a second
copy of it and drifts an edit at a time, and `DecklistRow`, `DeckCard` and `RoleCounterStrip` all
take deck ids, mutation handlers and card records a reference page has none of.

`figures.test.ts` fails when a legend's mark **duplicates a string the app already ships**. It does
not require every mark to come from a copy module: `draft`, `63 / 99` and `a shelf` are this page's
own annotation, which no module owns and the grammar allows. The rule is narrower than "read it
from copy" and that is deliberate — a machine cannot tell an annotation from a label by shape, but
it can tell whether the app already says it.

## The gate that was skipped

`design-review` — required by `AGENTS.md` for every UI PR — was not run on #653, #658 or #666. It
ran on 2026-09-16 and found **twelve** measurable gaps that four review rounds, a contact sheet and
this walk had all passed over — a 1px heading, a missing line-height, two type sizes half a pixel
out, a padding axis, the rail's width, and six more. Three of the twelve were introduced by that
gate's own first pass, whose property table had been back-filled from the shipped code and so
certified the build against itself; the cold-eyes read found those. See `gap-report-about.md`. None of those artifacts was looking at the table,
because nobody had written one.
