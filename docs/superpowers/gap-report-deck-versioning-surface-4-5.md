# Gap report — deck versioning, Surfaces 4 and 5

**Surfaces:** §Surfaces 4 (the version rail and the diff it opens) and §Surfaces 5 (the version
stamp on a logged game).

**Property table:** `docs/superpowers/design-tables/deck-versioning-surface-4-5.md`

**Implementation:** `src/components/decks/version-history.tsx`,
`src/components/decks/version-diff.tsx`, `src/components/decks/game-history-row.tsx`,
`src/app/decks/[id]/versions/page.tsx`, `src/lib/copy/deck-versioning.ts`

**Verdict:** Agent 2 returned 18 visual gaps and 2 state gaps. Ten were fixed, ten were resolved
without a code change for the reasons recorded below. Agent 3 confirmed **0 gaps remain**.

---

## Fixed

| # | File | Element | Design | Was |
|---|------|---------|--------|-----|
| 1 | `version-history.tsx` | rail row button | no motion (READINESS 19) | `transition-[filter] hover:brightness-110` |
| 2 | `version-diff.tsx` | phone segmented control | no motion (READINESS 19) | `transition-[filter] hover:brightness-125` |
| 3 | `version-history.tsx` | Delta group | `align-items: center` | `items-baseline` |
| 4 | `version-diff.tsx` | InitialPanel `i` disc | 1.5px rule | `border` (1px) |
| 5 | `version-diff.tsx` | InitialPanel browse link | `--accent-hover` on hover | no hover state |
| 6 | `version-diff.tsx` | outer panel, v1 arm | no trailing margin | `md:mb-[22px]` on both arms |
| 7 | `version-diff.tsx` | Column, last group | 16px phone bottom margin | `last:mb-0` at both widths |
| 8 | `game-history-row.tsx` | version stamp | 10.5px | 11px |

Item 8 is a divergence between two design assets rather than a drawing the code missed: the
property table says 10.5px and the implementation plan says 11px. The table is the source of
truth this PR is verified against, so the table wins and the plan's figure is the errata.

Items 1 and 2 are the same rule reported twice. READINESS item 19 — "Motion, anywhere on these
two surfaces: none" — is a blanket absence, so both were swept in one pass rather than the
flagged one alone.

### State gaps

**9. `initial` was inferred from a nought delta.** `Delta` decided the word from
`adds === 0 && removes === 0`. Those are different facts: a version that swapped one card back
for the same card has a nought delta and is emphatically not the deck's first list. The rail
already computes `versions[i + 1] ?? null` for the diff's `previous`, so it now passes
`initial={previous === null}` and `Delta` never inspects the counts. Covered by
`version-history.test.tsx` — "reads `initial` off the absence of a predecessor, not off a nought
delta".

**10. A partner-only swap rendered `Korvold → Korvold`.** `commanderMoved` fired on a
`partnerOracleId` difference, but both sides of `copy.commanderChange` were built from
`commanderName` alone, so the sentence said nothing. `VersionSummary.partnerName` was never read.
A `helm()` helper now builds each side as the whole helm — the primary alone, or
`copy.commanderPair(primary, partner)` — which also gives a partner's arrival and departure a
correct reading. One copy key was added; its wording goes to `/copy-review`. Covered by two tests
in `version-diff.test.tsx`.

---

## Resolved without a change

**Gap 9 — the diff's group headers are `DecklistGroupHeader`, not the canvas's Cinzel heading
over an unnamed `#574463`.** Deliberate. The handoff's own absences list forbids introducing a new
hex, and §Surfaces 4 says the diff is grouped "like every other card list in the app" — which is
this component. A bespoke header would make the diff the one card list in the product that groups
differently.

**Gap 17 — the phone stamp riding the meta line rather than taking its own slot.** Discrepancy 46
is prose-only in the handoff; no canvas draws it. The shipped answer keeps one slot at both widths,
which is what makes every row's marks land on one vertical above `md` — the reason the slot is drawn
even when a game has no version.

The probe measured the phone honestly: the two stamps sit at left 191 and 197, not on one vertical,
because the meta cell to their left has a fixed width only at `md:` and so sizes to its own date
text below it. That is the game log's existing behaviour at that width — every cell after the date
already shifts with it — and it is outside this property table, so the stamp inherits it rather than
restyling shipped chrome. Desktop is aligned: both stamps at left 293.

**Discrepancy 55 — the v1 panel is drawn at 390px, against the property table's `—`.** Errata,
not a gap. The `—` in that row records that no phone frame in the handoff draws the v1 panel; it is
a canvas absence, and the table marked it a discrepancy rather than a stated absence for exactly
that reason. A version that is a deck's only version is the commonest v1 there is, and a phone
reader opening its row would get an empty panel where the desktop gets `Initial`, one sentence and
the way into the list. Mobile/desktop parity in one PR is the standing rule, and nothing in
§Surfaces 4, §Copy per state or READINESS 8 names the phone as an exception. The property table's
row stands corrected to `drawn` at both widths.

**Gap 4 — the active Versions-tab treatment is unreachable.** ~~Not a gap in this PR's surface.~~
**Overturned 2026-09-12 — this was a real gap, and it is now fixed.** The original verdict argued
that `/versions` should draw its own header rather than the tab row, "exactly as the sibling
`/changes` route does". That reasoning took a sibling route as the authority over the canvas.
§Surfaces 4 draws the deck's four-cell tab row at the head of this route at both widths with
`Versions` active, and draws neither a back link nor a visible heading. The shipped route drew the
opposite, which left the property table's "Versions tab — active cell" component rendered nowhere
in the product — the tell the original verdict rationalised away rather than checked.

Fixed by extracting `LinkCell` out of `BuilderTabs` and adding `BuilderRouteTabs`, the same row
drawn as four links on a route that is not the builder, with the read page carrying
`aria-current="page"`. The `Consider` and `Games` cells land on the tab they name via a new
arrival-only `?tab=` parameter (`readBuilderView` / `TAB_PARAM` in `src/lib/decks/builder-view.ts`);
switching tabs inside the builder is still component state and still costs no history entry. The
`Games` count comes from a `count(*)` subquery folded into the existing `getDeckReviewHeader`, so
the route makes no extra round trip. The `Consider` cell ships with no count: that figure is the
whole recommendation computation, which this route has no other use for, so the cell takes a
countless accessible name (`considerAriaBare`).

**Discrepancy 28 — `history.heading(n)` is drawn as the route's `h1`.** Errata, not a gap —
**amended 2026-09-12.** The discrepancy offered two arms: an unnamed heading slot on the route, or
a dead string. The first arm still stands, because a page with no `h1` is an accessibility
regression no design absence asks for. What changed is the ink: nothing on the canvas draws a
heading here, so the `h1` is `sr-only`. It names the document without drawing what the design does
not. The back link it used to sit beside is gone with Gap 4's fix — the tab row is the way back,
and `Your deck` is a better-named exit than `← deck name`.

**Discrepancy 30 — the Versions cell keeps its count at phone width.** The inactive-sibling row's
`— (not drawn on phone)` governs the three shipped tabs, not this cell. Discrepancy 30 states the
canvas's phone frame "draws the three labels bare and keeps only the `Versions 3` count", so the
count at 390px is what the design draws, and hiding it below `md` would be the deviation. The
cell's number is `aria-hidden` and the figure also rides `accessibleName`, so nothing is lost to a
screen reader either way.

**Gaps 1, 2, 3, 5, 6, 15, 18 — shipped chrome outside this PR.** These sit in `builder-tabs.tsx`,
`game-history-row.tsx`'s existing cells and `games-panel.tsx`, all of which shipped in earlier
PRs and are unmodified here apart from the stamp slot. Flagging them is correct behaviour from a
verify pass that reads whole files; changing them would be scope creep into surfaces this
handoff's property table does not govern.

---

## Confirmed correct by Agent 2

- The §Errata cost-track ruling: `COST_TRACK = 40`, `COST_PIP_CAP = 5`, not the canvas's 90/76px.
- Every stated absence: no ownership dot, no price, no buy tag, no pull offer, no marker, no
  restore control, no `+99` on a v1, no win rate, no draft row in the rail, no `ver` column
  header, no chip or link on the stamp, no filter or search, no bucket headings, no elision line.
- `heldLabel` / `heldValue` resolving Discrepancy 43, and `recountedItem` resolving Discrepancy 40b.
- The `button`-with-`aria-expanded` rows and the 44px phone segments as the accessible resolutions
  of Discrepancies 34 and 47.
- States 36, 37, 37b, 38, 40, 40b, 42, 43, 44 and 45 all reachable: the triggering field is on
  `VersionSummary` or `DeckGame`, the loader computes it, and a branch renders it.
