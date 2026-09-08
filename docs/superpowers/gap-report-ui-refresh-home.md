# Gap report — UI refresh, Home

**Design table:** `docs/superpowers/design-tables/ui-refresh-home.md`
**Plan:** `docs/superpowers/plans/2026-09-07-ui-refresh-home-decks.md` (Tasks 14–18)
**Branch:** `feat/refresh-home`
**Date:** 2026-09-07
**Verdict:** 0 gaps remain. Confirmation pass clean.

The design-review skill ran in its three passes: enumerate (the committed
property table), verify (against the implementation), confirm (against the gap
list below). A browser pass at 1300×950 and 390×844 ran alongside, via
`scripts/probe-refresh-home.mjs`. This document records what the verify pass
found, what was fixed, what was left as drawn and why, and the three findings
that belong to Design rather than to this branch.

---

## Fixed

### Visual

1. **Section labels could be compressed** — `ready-to-build.tsx`,
   `deck-rail.tsx`, `resume-decks.tsx`, `commitments-card.tsx`. Each `<h2>`
   sits in a flex column with a scrolling sibling, so under pressure the
   browser was free to shrink the label rather than the list. All four now
   carry `flex-none`, as does the more-above row in `ready-to-build.tsx`.

2. **`All commanders` sat at the far edge on desktop** — `ready-to-build.tsx`.
   The table pushes it to the edge on phone and sits it one gap after the
   count on desktop; `ml-auto` alone did the first and not the second. Now
   `ml-auto … sm:ml-0`.

3. **The first-run accent wash tinted the phone** — `first-run.tsx`. The
   640×340 radial at 40% is the light behind the card fan on a desktop frame;
   at 390px wide it is the whole screen, which is a tint over the page rather
   than a light behind anything. The gradient is now `sm:`-prefixed and the
   phone gets `--bg` alone.

### Accessibility

4. **Locked checklist steps were named by nothing** — `first-run.tsx`. The
   card was dimmed and carried an `aria-label` on a generic `<div>`, which
   names nothing: a screen-reader user heard the step's title and never that it
   was locked. Each step is now a `role="group"` named via `aria-labelledby`
   from its own two visible strings.

   This deliberately does **not** call `refreshCopy.firstRun.lockedItemAria`,
   which the table names for locked items. That helper hard-codes *"unlocks
   once a collection is read"* — true of the rail, the tab bar, and step 2, but
   step 3 waits on a commander, and a name saying otherwise would be wrong out
   loud while the card beside it read correctly. Recorded as departure 8 below.

### State

5. **First run was reachable with decks in hand** — `src/app/page.tsx`. The
   trigger read the collection alone, so a player who imported a decklist
   before reading a CSV was shown the three-step checklist and their deck was
   hidden. That state is reachable by design — the checklist's own escape hatch
   links to `/decks/import`. The trigger now requires both halves, and `decks`
   is loaded in the same `Promise.all` as `stats`; the three loads only the
   dashboard needs still sit after the early return.

### Doc-sync

6. **Stale comment in `commitments-card.tsx`** — the middle row's colour was
   described as a "warning token", a name that has not existed since the theme
   replacement. It now says what it does: the row keeps `--danger` at zero, and
   recolouring at zero would make the palette a second, quieter status system.

---

## Departures — drawn one way, shipped another, on purpose

1. **The phone header ships both buttons.** §Ambiguities 1 says the 390px
   frame draws neither `Update collection` nor `New deck`. Dropping them would
   leave the phone with no route to either from Home; both ship at 44px with
   `New deck` leading.

2. **`See the pool` uses `--border-strong`, not `--border-dashed`.** No such
   token exists in the six-theme contract, and inventing one for a single
   button would put a seventh border colour in every theme.

3. **Phone targets are 44px, not 36.** The table's 36 is a desktop figure read
   across; 44 is the touch floor this codebase already holds everywhere else.

4. **The resume-row status pill keeps its hairline.** It renders through
   `statusPillStyle`, so it carries the border the frame omits. One pill
   definition beats two that drift.

5. **The deck rail ships a phone footer the frame does not draw.** Without it
   the phone rail ends in a cut-off row with no route onward.

6. **The rail's two row-lists are a deliberate split subtree.** The sanctioned
   exception to the no-duplicated-subtree rule: the two lists render different
   decks with different remainders, so they are not one element with
   responsive classes.

7. **The hero's in-use clause is a sibling span at both widths.** The frame
   nests it inside the fit line on phone with a ` · ` shorthand for which the
   copy file has no key. Structure-only; the strings are unchanged.

8. **Locked checklist steps are named from their visible text**, not from
   `firstRun.lockedItemAria` — see fix 4 above.

---

## Not gaps

- **The rail's phone and desktop row counts differ** by design; the probe
  confirmed three rows in each against a three-deck fixture.
- **The hero art fallback** uses `ART_STRIPES`, the same fallback the deck tile
  and the deck hero already use. A second placeholder would be a second answer.

---

## For Design — three findings this branch cannot resolve

### 1–3. Two ratified tables both specify the phone top bar

`ui-refresh-home.md` §HomeHeader draws a phone top bar of its own: a 22px
diamond mark rotated 45° in `--accent`, a flex-auto spacer, and a 36px round
avatar on `--surface` with a `--border-strong` hairline.

`appshell.md` §Mobile Top Header (signed-in) — ratified earlier, shipped, and
implemented exactly by `MobileHeader` in `src/components/shell/nav.tsx:295-323`
— draws a *wordmark* and an avatar trigger for that same bar.

Home therefore draws no top bar of its own, and the three rows the verify pass
flagged (mark, spacer, avatar) are not missing from Home; they are a second,
conflicting specification of a bar the shell already owns. Which table governs
the phone top bar is a Design call, not an implementation gap. Nothing on this
branch changes until it is answered — the shipped shell wins by default.

### 4. `--fg-disabled` sits below the contrast floor — resolved in code, for ratification

Design-table ambiguity 6 leaves the locked-step body colour open, and the
handoff names a bare `#4A4033` for dimmed nav items and the locked-step reason.
That value measures roughly 1.8:1 against `--surface-rail` — under the 3:1
floor, and far under 4.5:1 for body copy. A contrast floor is not a taste call,
so it was resolved rather than escalated: `--fg-disabled` now colours only what
repeats something already said, and the words take `--fg-locked`.

| Element | Was | Now |
|---|---|---|
| Locked step reason line | `--fg-disabled` | `--fg-locked` |
| Locked rail slot (icon) | `--fg-disabled` | `--fg-locked` |
| Locked tab (icon + label) | `--fg-disabled` | `--fg-locked` |
| Padlock glyph | `--fg-disabled` | unchanged (`aria-hidden`, repeats the name) |
| Locked step numeral | `--fg-disabled` | unchanged (`aria-hidden`, ordinal is document order) |

The token stays in the contract and keeps its two decorative users, so the
dimmer step in the ramp is still available and still declared per theme. What
Design is asked to ratify is only that locked *text* reads at `--fg-locked`
rather than a step below it.

### 5. One named state has no frame and so was not built

The state coverage table names **Update collection running / partial** —
READINESS blocker 4 — and marks it *not drawn*, suggesting the manifest-wait
pattern be reused. `Update collection` on Home therefore navigates to the
replace flow and Home draws no in-flight state of its own. It was neither
built nor guessed. Several other rows are marked *not drawn* in the same way
(no further candidates, no buildable commanders at all, rail with all decks
shown, zero-decks Home, Commitments rows at zero, loading); each ships the
behaviour the code already had.

---

## Open question carried into the PR body

The **view toggle** at `CHROME-rail-and-tabs.md:83` is not built: the handoff
draws one state of it and no alternate, so there is nothing to toggle to. It
belongs to a later pass.
