# Journey lifecycle — Add panel overhaul (#158)

Gate 5 of the epic-run: every journey in the briefing's walk script run four ways —
forward, reverse, repeat, resume. Gate 2's forced states are recorded at the bottom.

Run against **local dev**, not staging. This repo has no `apps/e2e` audit sweep and no
staging seed, so the capture is the documented Playwright fallback: `walk.mjs`, untracked
and throwaway, signing in by redeeming a Clerk sign-in token through `window.Clerk` on the
public root page. Both viewports (1440×900, 390×844). Screenshots landed in
`audit-output/` and are not committed.

Local dev is the *fastest* environment this app runs in, which matters for the mutation
feedback sub-check below: a gap visible here is worse everywhere else.

## Journeys

| # | Journey | Forward | Reverse | Repeat | Resume |
|---|---|---|---|---|---|
| A | Create a deck, land on an empty builder | ✅ | n/a | ✅ | ✅ |
| B | Consider → add a suggestion | ✅ | ⚠️ **#178** | ✅ | ✅ |
| C | Coverage strip → shelf link → Consider | ✅ | ✅ | ✅ | ✅ |
| D | Quick add by name | ✅ | ⚠️ **#178** | ✅ | ✅ |

### A — Create a deck, land on an empty builder

Forward: commander picked, name typed, `Create deck →`, lands on `/decks/<id>` with the
empty state. Repeat: a second deck for the same commander creates cleanly. Resume: reload
holds the empty builder.

**Desktop only.** At 390px `Create deck →` is occluded by the fixed tab bar and is
genuinely un-hittable — not a harness artifact, confirmed by probing the element (it is
enabled, has client rects, and a forced click still does not reach it). Filed as **#177**;
it is a `/decks/new` defect that predates this run and this epic does not touch that route.
The walk creates every deck at desktop width and then drops to the viewport under test.

Reverse is n/a: deck deletion is not part of this epic's walk script.

### B — Consider → add a suggestion

- **Forward** ✅ — the tab counts move in the same frame as the click. `Your deck 0 → 1`
  immediately after the click, still 1 once settled, so the optimistic path and the server
  agree.
- **Reverse** ⚠️ — remove works and the row goes, but the count stays at 1 immediately
  after the click and only drops to 0 after the round-trip. `useOptimisticDeckCards` has a
  single reducer that only ever appends; there is no remove action. Filed as **#178**.
  Pre-existing: introduced by `4f199fd` (#154, 2026-08-02), before this run. Left out of
  this epic deliberately so the shell rewiring stays reviewable.
  Also **mobile has no remove control at all** — `decklist-row.tsx` renders the ✕ as
  `hidden md:block`, faithfully to `design-tables/decks.md:1278` ("desktop only"). That is
  a gap in the drawn design, not the build: filed as **#179** with a design-pipeline row.
- **Repeat** ✅ — add → remove → re-add returns the count to 1. No keyed-state bug: nothing
  in this journey stores a dismissal or a "seen" marker, so there is no key to outlive its
  subject.
- **Resume** ✅ — reload holds the added card. The selected tab resets to "Your deck"
  rather than staying on Consider; view is component state by design, and landing on the
  deck you just changed is the better default, so this is recorded rather than filed.

### C — Coverage strip → shelf link → Consider

Forward ✅ — the `consider →` link under an under-target cell switches the builder to the
Consider tab. It is an anchor with an `onClick`, because the href alone would land on a
panel the deck tab has unmounted; the click handler is what actually works. Pinned by
`role-counter-strip.test.tsx`, including that the link is drawn *only* under a cell that is
short, and not at all when the strip is given nowhere to send the user.

Reverse ✅ (tab back to Your deck), repeat ✅, resume ✅.

### D — Quick add by name

Forward ✅ — "sol" returns 8 options, ArrowDown activates, Enter adds, count moves. Reverse
inherits **#178**. Repeat ✅. Resume ✅ — reload holds the added card; the query itself is
component state and clears, which is correct.

## Gate 2 — forced states

| State | How it was forced | Result |
|---|---|---|
| Empty builder | New deck, zero cards | ✅ Both widths |
| Quick add, no results | Query `zzzzqqq` | ✅ after the fix below |
| Consider, sorted | Sort control cycled through every option and back | ✅ |
| Card already in deck | Re-added an owned card already committed | ✅ `✓ In deck` |

**Not forceable locally, and named rather than skipped:** the `degraded` EDHREC banner
(requires the upstream call to fail) and the `imageUri: null` tile (**0 rows in the live
DB**). Both are covered by unit tests that force the prop directly; neither was exercised
in the browser.

## Mutation feedback sub-check

Add is optimistic and lands in the frame of the click, at both widths. Remove is not — see
**#178**. Measured on local dev, the fastest case.

## What the walk changed in this run

The mid-run cold-eyes critic, run cold over the reel with no plan and no diffs, returned
two Criticals that the per-PR gates all passed:

1. The quick-add results panel rendered in flow *below* a bottom-stuck field, so at phone
   width the no-results escape hatch sat under the tab bar, unreachable. The handoff had
   drawn it correctly ("rises off the bar"); the build had not.
2. `RECOMMENDED_MIX_WORKED_EXAMPLE` claimed "you're at 8, fine for a slower build" from a
   static string, on a deck with 0 ramp, directly beneath a cell reading 0.

Both fixed in this PR, along with WebKit's duplicate search-cancel ✕ and a tile baseline
that went ragged when a card name wrapped to two lines.
