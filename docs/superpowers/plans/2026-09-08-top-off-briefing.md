# Briefing — Top off the last 31 (#360)

Written 2026-09-08, for the autonomous build of issue #360. The design handoff is
`design/design_handoff_the99_top_off` (merged in PR #439 with a 🟢 Green readiness verdict), and
this file carries only what the handoff does not: the run's premises, its current state, and the
walk script the journey gate runs against.

## What the feature is

The builder's last-31 strip today offers two buttons that write 31 cards into the deck the instant
either is clicked: `Fill N from my collection` and `Top up with cards to buy`. The design's single
ruling replaces both:

> **The strip stops adding cards and starts opening a list.**

One door — `Choose the last 31` — opens a ranked, interleaved list of every legal candidate in the
strip's own place, in the page. Owned candidates arrive ticked. The player ticks and unticks up to
the number of open slots, sees the running count and the money, and commits once. What the commit
placed is then recorded as a *pass*, and the provenance line below the spine becomes a ledger with
one line per pass and a real undo on each.

That closes three issues at once: **#360** (the design ticket), **#361** (the two CTAs look out of
place — closed by deletion), and **#359** (no way to undo a top-off before deciding whether to keep
the fill — closed by the ledger's per-pass undo).

## The three premise questions

### 1. Launch gating — when does this vertical become reachable, and what flips it?

**There is no flag and no gate, and none is wanted.** This is not a new vertical; it is a
replacement of two shipped controls on a route that is already live for every player with a deck
under 99 cards. Nothing here is reachable by a new URL, and nothing is hidden behind an entitlement.

What that costs the plan is a constraint on where the seams fall: **the first PR that changes what
the strip renders must ship the whole journey at both widths, or players get a half-replaced
control.** So PRs 1 and 2 are server-only and change nothing a player can see, PR 3 swaps the
controls for the list at both widths in one merge, and PR 4 swaps the provenance line for the
ledger at both widths in one merge. There is no intermediate state in which the door exists and the
list does not, or the desktop list exists and the phone one does not.

Between PR 3 and PR 4 the ledger has not landed, so a player who commits a pass sees the shipped
provenance line rather than a ledger line. That is a real intermediate state and it is acceptable:
the provenance line is honest about the deck either way, and the pass rows PR 1 writes are already
being recorded, so PR 4 lights up history that was accruing before it merged.

### 2. Off-happy-path homes — where does every new state a user can land in *live* in the IA?

**The feature adds no new IA node.** Every state it can produce renders inside the strip or the
ledger, both of which sit on `/decks/[id]` between the builder spine and the decklist. There is no
modal, no tray, no route, and nothing that can be linked to or bookmarked. The design took that
call explicitly and the long-list note defends it.

The states that are not the happy path, and their homes:

| State | Home |
|---|---|
| Candidates exhausted (nothing legal left to place) | The strip outlives its control: the §7.6 shortfall line prints and the door goes. Quick-add is exactly where it ships. |
| Commit refused by the server | `MutationError` under the clicked control, ticks preserved. The player is still in the list. |
| Nothing ticked | The commit's primary is disabled with the slots-stay-open note beside it. **No error** — not ticking anything is not a mistake. |
| A ticked row goes illegal between tick and commit | The row draws its illegal treatment on the same line and is dropped from the commit; the count corrects itself. |
| A pass is fully kept or fully removed | Its line drops out of the ledger. **Its money then goes unaccounted for** — the shopping list is its own surface and nothing joins the two. This is READINESS open item 2, a known and accepted hole, not a bug to fix in this run. |
| Scratch selection lost on reload | Accepted (READINESS open item 4). The selection is client state; it survives closing the list, not a reload. |
| A deck with auto cards but no pass rows (every deck at migration time) | The legacy ledger line — one dashed sentence, no `Show these`, no undo. |

### 3. Journey walk script

Numbered, written before the build, and the input to Gate 5. Fixture: the local-dev account's
Kykar, Wind's Fury deck, taken down to 68/99.

**Journey A — choose and commit.**
1. Open `/decks/<kykar>`; the strip shows one door reading `Choose the last 31`.
2. Click the door. The list opens in the strip's own place; owned candidates arrive ticked.
3. Untick two owned rows, tick three unowned ones. The selection head and the commit both move.
4. Tick past the open-slot count. The remaining boxes go inert with the cap line, not hidden.
5. Commit. One request. The deck's count rises, the shopping figure moves, the list closes.

**Journey B — reverse the pass.**
6. In the ledger, click `Show these {n}` on the newest line. The decklist marks those rows; nothing
   filters, reorders or scrolls.
7. Click it again. The mark clears.
8. Click `Undo these {n}`. The pass's surviving cards leave the deck, the shopping list gives the
   money back, the line goes.

**Journey C — repeat, and the keyed-state trap.**
9. Commit a second pass. The ledger now holds two lines, oldest first with the seed at the top, and
   the newest line — appended at the bottom — is the accented one.
10. Keep one card out of the second pass with the per-row `Keep`. The line's count re-reads
    `{n} cards · 1 now yours`, and `Undo these` can no longer reach that card.
11. Undo the rest of the second pass. The line goes; the kept card stays in the deck.
12. Commit a third pass containing the same card the second pass placed and the undo removed. It
    gets a fresh line — pass membership is per pass, never per card.
13. `Keep all` from the toolbar. Every pass empties, the ledger goes, and the sweep goes with it in
    the same act.

**Journey D — resume.**
14. Reload with the list open and rows ticked. The list is closed and the ticks are gone; the deck
    is unchanged. (Accepted.)
15. Reload after a commit. The ledger is server state and reads exactly as it did.
16. Open the same deck in a second tab, commit in one, reload the other. The ledger agrees.

**Journey E — the phone.**
17. Repeat 1–5 at 390px. The commit takes the quick-add dock's slot and the dock collapses to its
    one-line notice; `Close the list` restores the dock with its query and focus intact.
18. Scroll the whole list at 390px. One scroll surface, no inner scroller, a real page end.

## Current state — verified 2026-09-08

Every claim here was checked against this worktree today, not recalled.

- **The handoff is merged.** `design/design_handoff_the99_top_off/` is on `main` at `95983b3`;
  README, STATES, the long-list note, the copy file and READINESS are all present.
- **The two CTAs ship** in `src/components/decks/last-slots-strip.tsx`, mounted from
  `builder-shell.tsx:636-646` behind `ownedCandidates > 0 || unownedCandidates > 0`.
- **`planLastSlots`** is at `src/lib/decks/last-slots.ts`, called from `actions.ts:724` and from the
  route at `[id]/page.tsx:84,94`. It caps at `openSlots` today.
- **The quick-add dock** is at `builder-shell.tsx:973-987`, `data-testid="quick-add-dock"`, sticky
  at `bottom-[var(--tabbar-h)]` on phone and `bottom-0` at desktop.
- **The auto-lifecycle cluster** is `clear-auto.tsx` — kept note, `Keep all`, `Clear all auto` —
  with `keepAutoCard` / `keepAllAutoCards` at `actions.ts:546,569` and `clearAutoCards` at
  `actions.ts:605`.
- **Three writers set `auto: false`**, not the two READINESS names: `actions.ts:549`,
  `actions.ts:572`, and `update-actions.ts:355`.
- **`CostPips`** is promoted to `src/components/ui/cost-pips.tsx` with
  `{ cost, size, track, cap, spoken, className }` and five production call sites;
  `manaCopy.costAria` exists at `src/lib/copy/card-surfaces.ts:24`. The top-off row is a sixth
  consumer of a finished component, not build work.
- **`BuyTag`** (`src/components/decks/buy-tag.tsx`) takes `variant`, `word`, `label`, `price`,
  `newestAsOf`, `provenance`, `reserveSlot`, `density`, `corner`. `density="full"` is the default,
  which is what the row needs — the collapse to a bare `$` is opt-in and this surface declines it.
- **`OwnershipDot`** and **`AvailabilityMarker`** are at `src/components/ui/ownership-dot.tsx` and
  `src/components/ui/availability-marker.tsx`.
- **`decks.filled`** is `notNull().default(false)` and is never reset by a sweep, which is why the
  design refuses to synthesise a seed count from it.
- **`deck_cards`** has no surrogate row id — its primary key is `(deckId, oracleId)`. That decides
  the shape of pass membership (see the plan).
- **Latest migration** is `drizzle/0019_nebulous_vulcan.sql`; the new one lands as 0020.
- No environment variable, external account or feature flag is needed by any part of this run.

## Rulings inherited, not to re-litigate

From the three design rounds and the readiness audits:

1. The list is the page. No inner scroller, no virtualisation, no pagination, no filter, no sticky
   list head, no jump-to-top.
2. One pinned element at 390px, whichever it is — so the commit takes the dock's slot and the dock
   collapses rather than the two stacking.
3. One interleaved list, both pools, no pool control. Owned arrives ticked.
4. The tick cap is `openSlots`, enforced client- and server-side; inert boxes are never hidden.
5. Keeping is a graduation out of provenance, not a third reversal — a kept card leaves its pass.
6. No backfill. The ledger begins at migration and says so with one dashed legacy line.
7. Kept and removed counts are derived, never stored.
8. The buy tag keeps its figure at both widths on this surface.
9. No motion is added anywhere in this feature.
10. `passRecountedAllKept` is dropped — ledger state `i3` leaves no line to print it on.
