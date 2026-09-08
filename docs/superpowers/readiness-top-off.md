# Readiness verdict — Top off the last 31

**Handoff:** `design/design_handoff_the99_top_off/` (R3)
**Issues:** #360 (scope), folding #359 and #361
**Date:** 2026-09-08

## Verdict — 🟢 Green

Every Design-owned blocker raised across R1–R3 is closed. Design's own R3 self-assesses Green and
that assessment holds against the repo. What remains is a list of engineering corrections against
the handoff's prose, recorded below and carried into the build.

The three rounds each closed one substantive gap:

| Round | Blocker | Resolution |
|---|---|---|
| R1 | #359's scope was declined without saying so — its `Schema change` and "surface the distinction" bullets were both dropped, and "no time window, ever" was built on client-held row ids that die on reload | **R2 took the schema in full.** A persisted fill-pass table, one reversal per ledger line at any age after any number of reloads, and `Show these {n}` as the "before deciding" distinction |
| R1 | The commit row was placed in a sticky bar that is not on this route, in a slot the quick-add dock already holds | **R2 retired the dock while the list is open**, collapsing rather than unmounting it, with query and focus intact and a mono notice in the commit bar |
| R2 | The ledger arrived on top of a shipped auto-lifecycle cluster it never mentioned — the kept note, the bulk keep and the sweep — and keeping clears the `auto` flag the ledger depends on | **R3 ruled keeping a graduation out of provenance.** A kept card leaves its pass exactly as a removed one does, the line names which exit each card took, and the backfill was replaced by an honest legacy line |

## Design's self-flagged risks, checked

| Item | Finding |
|---|---|
| R2 open item 1 — "#361 is still a one-line summary, and its scope could change a ruling once readable" | **Confirmed clean.** #361's body carries no constraint beyond "the two buttons read as visually foreign… should be resolved as part of that handoff". Deleting both CTAs for one door satisfies it entirely. |
| R3's invariant, offered for audit as a rule — `sweep absent ⟺ 0 auto rows ⟺ every pass empty ⟺ ledger absent` | **Holds where it is load-bearing, but see correction 2.** The sweep is absent at zero (`clear-auto.tsx`, "Absent (not rendered) at 0") and `ProvenanceLine` already returns null when no row is `auto` (`src/components/decks/provenance-line.tsx:54-75`), so the seed line's stated reversal cannot be orphaned. |
| R3 — "the kept note must survive at zero auto, where there is no ledger to hold it" | **Correct.** `src/components/decks/clear-auto.tsx` states the shipped rule explicitly: the kept note survives when `count === 0` and the button is absent. |

## Corrections carried into the build

The design calls are right. These are engineering findings against the handoff's prose, and none of
them needed a Design round-trip.

1. **A fourth writer clears the `auto` flag, and R3 names only two.** R3's engineering delta says
   keeping must clear pass membership in `keepAutoCard` / `keepAllAutoCards` (`src/app/decks/actions.ts:546,569`)
   and calls that "the only shipped action R3 asks eng to touch". The decklist update flow clears
   `auto` as well, at `src/app/decks/update-actions.ts:349-357`, for the same stated reason — *"A card
   the list names is a card the player chose"*. R3's rule generalises to it without amendment, so the
   join must be maintained wherever `auto` is cleared, not in two places. The consequence is state
   `i4` by another route: an update naming every auto card empties every pass and the ledger goes
   with the sweep, which the invariant already predicts.

2. **The invariant's middle leg is false at state `l0`.** `every pass empty ⟺ ledger absent` breaks
   on a deck that predates the ledger: it has zero passes (vacuously all empty) and still renders the
   legacy line. The leg that is true, and the one to implement, is the outer one — **the ledger is
   present exactly when the sweep is** — which holds at `l0` because the legacy deck's `auto` rows
   keep the sweep on screen. State `l0` and ledger rule 6 need to agree before either is coded.

3. **`passRecountedAllKept` (`all {n} now yours`) has no state.** State `i3` rules that a pass
   entirely kept leaves the ledger, so no line survives to print it. Either the string is dead or
   `i3` is wrong; the states read as deliberate, so the string is the one to drop.

4. **`celebration.ts` no longer exists.** It is on the Untouched list in all three rounds. The file
   was deleted with the completion reveal in #362; nothing needs to be preserved.

5. **Three numbering slips in the package, all cosmetic and none of them a design call.** Ledger
   rules in `STATES-top-off.md` run 1–7 and then 5, 6, 7 again; the panel state table lists state 17
   after state 20; and `README.md`'s title still says "R1" where every other line of the round is
   R3. The rules and states are cited by number elsewhere in the package, so a build that quotes a
   number should say which of the two it means.

## Checked and correct — `CostPips` and the cost track

R1–R3 all specify the cost track as "`CostPips` at its shipped desktop metrics: 12px pips… fixed
40px right-aligned track, shingling from three at −5px, capped at five slots, generic `+N` pip…
`aria-hidden`; the `sr-only` alternative speaks the whole cost, uncapped." **Every word of that is
already shipped**, and this section exists because an earlier draft of this audit said the opposite.

`CostPips` lives at `src/components/ui/cost-pips.tsx`, promoted out of `suggestion-tile.tsx`, and
takes `{ cost, size, track, cap, spoken, className }`. `spoken` renders an `sr-only` span carrying
`spokenManaCost(cost)`, which is uncapped even when the pips are. `manaCopy.costAria` exists at
`src/lib/copy/card-surfaces.ts:24`. The decklist row already passes the exact metrics the handoff
names — `PIP_TRACK = 40`, `PIP_SIZE_DESKTOP = 12`, `PIP_CAP = 5` (`decklist-row.tsx:46-48`) — and
there are five production call sites, so the top-off row is a sixth consumer of a finished
component rather than build work of its own.

## Known limitations, accepted

Carried from Design's own open items. None blocks the build.

1. **The ledger grows one line per pass, uncapped.** R3 improves this — fully kept and fully removed
   passes drop out, so ordinary use prunes the list. The collapse-to-header fallback (`four passes`,
   disclosed on tap) is designed but unbuilt, and is the fix if heavy use makes it bite.
2. **A pass whose cards were all removed or kept loses its line, so its money is unaccounted for**
   in the ledger. The shopping list is its own surface with its own removals; nothing joins the two,
   and nobody has asked for that join.
3. **The scratch selection dies on reload** — up to 31 ticks of real work. Now the only thing on this
   surface a reload loses, which makes it more visible rather than less. Persisting it is a second
   schema decision plus a stale-candidate problem on every load, and is not taken.
4. **`decks.filled` is never reset** (`src/db/schema.ts:184-188`), and R3 routes around it rather
   than fixing it. If eng resets `filled` on a full sweep, the legacy line could be narrowed; the
   design does not need it.
5. **Cost pips stand against card-row parity Q2's refusal**, argued on Q2's own rule — pips go where
   the reader is choosing or paying, and this is that surface. README gap 9, and the cheapest call in
   the package to reverse.
6. **Four components were unreadable to Design** (`last-slots-strip.tsx`, `builder-spine.tsx`,
   `button.tsx`, the shopping row), and `clear-auto.tsx` and `builder-shell.tsx` only as this audit
   quoted them. If the components disagree with README's component table, the components win.
