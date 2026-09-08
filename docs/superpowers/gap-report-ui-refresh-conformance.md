# Gap report — UI refresh, conformance sweep (PR F / plan Task 19)

Scope: the four surfaces the refresh does not redesign but which must still obey its
two global rules — deck detail, the builder spine, the card modal, and the Commander
detail page. Rule 2: one filled button per screen, and it is bone (`--fg` on `--bg`),
never accent; everything else is a 32px hairline pill (`--border-strong`, 12.5px
label, 14px side padding, 8px radius). Rule 3: colour is status, and status only.

Property table: `docs/superpowers/design-tables/appshell.md` §404 plus the surface
tables named per section below. Verify pass returned 15 gaps; six were real and are
fixed, the rest are rulings recorded here.

## Resolved

| # | File | Element | Was | Now |
|---|------|---------|-----|-----|
| 1 | `src/components/decks/detail.tsx` | header controls | mixed ad-hoc heights | 32px hairline at `sm:`, 44px floor below |
| 2 | `src/components/decks/detail.tsx` | back chrome | a second route back | removed — the rail and the tab bar are the route back at both widths |
| 3 | `src/components/decks/builder-spine.tsx` | Update button | ad-hoc geometry | hairline at `md:`, `min-h-[44px]` below |
| 4 | `src/components/decks/builder-spine.tsx` | Export, both branches | ad-hoc geometry | `h-[32px] px-[14px] text-[12.5px]` |
| 5 | `src/components/decks/builder-spine.tsx` | meta caption status | no pill | `StatusPillBadge` in flow, status passed from the shell |
| 6 | `src/components/commanders/detail.tsx` | Build this deck, both sites | `bg-[color:var(--accent)]` | the exported bone `PRIMARY` |

Gap 6 is the sweep's one rule-2 violation. Both call sites hand
`SelectableBuildButton` a hand-rolled class string rather than rendering
`PrimaryButton`, which is why neither picked up the earlier conversion of the
primary to bone. `PRIMARY` is now exported from `src/components/ui/button.tsx` so
the fill has one definition rather than three.

## Rulings — reported by the verify pass, deliberately not changed

**Facet strip (`src/components/commanders/rack/`) — full hairline geometry.**
Out of scope. The strip is a radiogroup with its own ratified property table from
PR #435, and this plan scoped the file to the desktop height change alone (30px to
the hairline 32). Applying the pill's padding and label size to a radio would put
this file's shipped table and the appshell table in conflict.

**Mobile Export in the builder spine.** Out of scope by the plan's own words: at
that width Export "is not a button, it is a text link with an icon", and the
handoff draws no phone frame for the builder.

**Disabled Export border is `--border`, not `--border-strong`.** What the plan's
code block specifies. A disabled control reading as strongly as an enabled one is
the thing the weaker token exists to prevent.

**Draft pill label is `--fg-muted`.** A documented, already-shipped entry in
`PILL_EXCEPTION` (`src/lib/decks/status-style.ts:39`). Not this sweep's to reopen.

## Departures recorded, not fixed

- **Coverage-sort control is 38px tall with a sunken fill**, not the hairline. Pre-existing
  and outside the four named surfaces.
- **Sub-44px touch targets** survive on the coverage-sort control (38px) and the facet
  strip (32px). Both are desktop-first controls that predate the refresh's global
  targets table; neither is in this sweep's scope, and both want their own pass.
- **Card modal (Step E) verified clean, no change.** Accent appears only as text colour
  (`Next ›`, the trigger hint), a 7px diamond marker, and meta field values, plus
  `FinishChip`'s selected-toggle state — never as a button fill. The handoff's "no
  change beyond inherited button and field styles" row holds.
- **Ruling C confirmed**: no Tuning panel exists in `src/`, so the sweep has nothing
  to apply there.

## Table ambiguity

The appshell README gives 14px side padding for the hairline pill; the drawn frames
measure 13px. 14px shipped — the README is the normative statement and 1px is inside
the frames' own rounding. Flagged for ratification, not blocking.

## Plan drift

Plan Step C targets `sort-menu.tsx` and `search-field.tsx`. Neither file exists:
PR #435 rebuilt the Commanders list into `src/components/commanders/rack/` with its
own ratified table, which already carries the hairline. Step C is obsolete, not
skipped.

Deleting deck detail's back chrome also drops its `avail=free` back-link behaviour —
the rail and tab bar return to the unfiltered route. Recorded as an accepted
consequence of gap 2, since a back control that silently restores a filter is the
kind of second answer the refresh removes.

## Verdict

Agent 3 confirmation pass: **0 gaps remain.** Gate green — 252 files, 3562 tests.
