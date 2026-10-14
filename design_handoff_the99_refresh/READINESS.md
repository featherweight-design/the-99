# Readiness — UI refresh · Home, Decks, chrome

`design/design_handoff_the99_refresh/` · R3 · 2026-09-08

## Closed

| Item | State |
|---|---|
| Direction chosen from real candidates | **Closed.** Three packages drawn (`Explorations (1a-1c)`), one combination picked: art-led cards, bone-fill 32px buttons, persistent filter column. |
| Scope agreed | **Closed.** Home, Decks, chrome. The other four surfaces keep their layouts; conformance list in `README.md`. |
| Six deck statuses | **Closed.** Token, pill, bar and keyline per value in `STATES-deck-statuses.md`. |
| Deck actions restored | **Closed.** One `…`, three shipped items. |
| Live filtering | **Closed.** No Apply, Clear only, counts removed, search inside the filter surface. |
| Mobile | **Closed for these two surfaces.** Tab bar, Decks list, filter sheet, 44px targets. |
| Rail icons | **Closed as a design call, open as a code change** — see below. |
| Themes | **Closed.** All six R6 themes rendered from `tokens.r6.json` in `Theme Matrix`. |
| Copy | **Closed.** `refresh · copy strings.ts`; reassurance and narration removed. |
| Home at first run | **Closed (R2).** Checklist restyled, locked rail and locked tab bar, both viewports. |
| Decks at zero decks | **Closed (R2).** Card-fan mark, Browse commanders + Import a deck, both viewports; distinct from the filtered empty. |
| Import placement | **Closed (R2).** Peer of New deck, hairline, header-left of it; full-width pair on phone. |
| Phone Ready-to-build | **Closed (R2).** Stacked list. Carousel withdrawn. |
| Draft tiles | **Corrected (R2).** Commander art on every tile; placeholder art and *no commander yet* removed. |
| Accent on actions — the four sites | **Closed (R3).** Three lose accent, signed-out Home keeps it as a written exception. `RULINGS-R3.md` §1. |
| Phone touch targets | **Closed (R3).** Facet strip and coverage-sort both to 44px; the phone column of the targets table is a floor, and the tile-`…` exemption does not generalise. §2. |
| Hairline side padding | **Closed (R3).** 14px confirmed; the R2 frames were off by a pixel and have been corrected. §3. |
| Suggestion tile's two add branches | **Closed (R3.1).** One geometry, two labels — `Add` / `Add · to buy`; `GhostButton` retired from the tile. §4. |
| Pill variants | **Closed (R3.1).** Two named variants only, Default and Dense chip; 44px phone height identical in both. §5. |
| `§1` tie-breaker | **Ratified, untested (R3.1).** The log-form case turned out to be mutually exclusive states. Rule kept, premise corrected. §6. |

## Blocking a green

**1 · `nav.tsx` adjudication #1 must be formally retired.** The rail now carries icons, which the
comment at `nav.tsx:20` forbids. The client instructed the change; Engineering should not discover
it as a silent contradiction. Retire the comment in the same PR, and add the `aria-label` +
tooltip per item that icon-only navigation requires (`CHROME-rail-and-tabs.md`).

**2 · Canopy's accent-vs-success call needs a decision, not another render.** The deck grid puts
`To buy` (`#A3C445`) next to `Complete` (`#6FA368`) at pill size, which is the case
`design_handoff_the99_theme_replacement/READINESS.md` left open. It is now rendered. Someone has to
say yes, or approve a darker Complete fill in Canopy only.

**3 · Home's "Ready to build" is fed by a threshold nobody has set.** The frame says
*scored 70 or better* because the two cards drawn score 74 and 71. The real rule — top N, or
score ≥ X, or both with a floor — is not specified, and the string interpolates whatever it is
(`home.moreAbove`). Product call.

**4 · "Update collection" has no state machine here.** The button exists on Home; what it does
while running, and what it says when a read comes back partial, is not drawn. The pattern to reuse
is the manifest wait from the earlier pass, but it is not specified in this package.

**5 · The Commitments card's third row is new data.** *To buy, all decks* (`18 · $94.80`) implies
an all-decks shopping roll-up. If no such aggregate exists, the row goes or the aggregate gets
built — it should not silently sum client-side over a paginated deck list.

## Not blocking, but I want eyes on it

**Accent loudness across the set.** Neon Rain's accent is chroma 0.22, Oil Haze's 0.054. *In use*
and *to buy* are the same semantic in both and do not read as the same weight. The fix is a token
rule (minimum separation between `--accent` and `--fg-body`), not a screen change, and it is not in
this package.

**Loading states.** They keep their layouts by decision, but they have not been rendered against
the new display faces or the 32px button. One pass before build.

**Collection.** Second item in the rail, no frame in this package.

**Phone frames are budgeted, and the budget is tight.** All five are 390×800 with nothing clipped,
but Home and first run are within ~20px of full. First run in particular carries a load-bearing
`Import a deck` at the bottom — if a step gains a line of copy, that button is what falls off, and
it is the one route for a player who arrives with a decklist and no CSV. Re-measure both frames
after any copy change.

**First run's locked rail needs accessible names.** The three dimmed items are inert; the reason
they are inert should live in the accessible name (`firstRun.lockedItemAria`), not only in the
visual dimming. Same for the locked step cards.

## What Design could not read

Nothing was blocked. `src/components/shell/nav.tsx` was read for item order and the adjudication;
`design_handoff_the99_theme_replacement/tokens.json` (R6) for every theme value;
`design_handoff_the99_availability/availability · copy strings.ts` for the in-use vocabulary. The
deck-status thresholds are transcribed from the client's own screenshot of the shipped status table —
**if the shipped table differs, it wins and `STATES-deck-statuses.md` is the file to correct.**
