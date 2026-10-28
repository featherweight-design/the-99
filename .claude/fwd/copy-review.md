# Project binding — The 99

MTG Commander companion: upload a collection CSV, get commander recommendations, build
decks from what you own. Every word on screen sits between the user and a deck they can
actually build.

## Voice

**Kitchen Table** — friend-at-the-table energy, Discord × kitchen-table Magic. Uniform
across chrome and data UI; words carry personality even where visuals stay quiet.

- Expressive moments (empty states, first-run, celebrations, non-safety-critical errors)
  get the wink treatment. Utility copy stays straight.
- Banned patterns: corporate-service-speak, motivational drift, fake urgency, SaaS
  onboarding phrasing.
- Failure copy leans honest, not cute.

Locked in `design/design_handoff_the99_richness/README.md` under "Locked — do not
re-open". Do not flatten it, and do not re-open it.

## Locked vocabulary (rule 10)

**No vocabulary table exists yet.** Rule 10's fallback governs: if a term is not already in
use in `src/lib/copy/`, flag it rather than coining it. Do not invent a table mid-pass.

Terms already load-bearing in the product, worth matching rather than restyling:
`collection`, `commander`, `deck`, `printing`, `unresolved row`. Grep `src/lib/copy/`
before introducing a synonym.

## Copy inventory

- `src/lib/copy/*.ts` (each with a `.test.ts` sibling that may assert exact strings)
- Hardcoded JSX strings, which are a separate finding: they violate the
  copy-in-`src/lib/copy` convention

Channels in play: in-app, email (the invite-code mail, `codeMail` in
`src/lib/invites/claim.ts`) and web push (titles and bodies in `src/lib/copy/push.ts`). Rule 2's
email subject, preheader, push title and push body caps apply to those. There is no
`releases.ts`, so the release-note caps and the frozen-record carve-out do not apply.

## Rule 4 calibration

**Rule 4 APPLIES to The 99. Hugh overturned the exemption on 2026-09-13.** Enforce it on new
and modified strings, as the rule is written.

The prior calibration (2026-09-01) exempted this project on the grounds that the em dash was
established house punctuation. Hugh read the result on the Games tab and rejected it. His
call overrides the measurement: the exemption is dead, not merely narrowed.

Two consequences the old entry was right about, which survive the reversal and must be
handled rather than ignored:

- **It puts shipped copy out of step with merged design handoffs.** `shell.ts` and
  `issue-inspector.ts` say in their own headers that their strings are transcribed verbatim
  from a handoff. Sweeping them is a _ratified divergence_, and each PR doing it says so, so
  a later design review reads it as an intended change rather than drift. The frozen-areas
  section below still governs everything about those strings EXCEPT this punctuation.
- **An em dash is not always punctuation.** Two classes are exempt on sight:
  - **The dash as a glyph for absence.** `'—'` standing alone is Data, not prose — it means
    "no value", chosen deliberately over `$0.00` or "unknown" (`price.ts` defends the choice
    in a comment). Seven such keys exist: `noMarks`, `absent`, `synergyNone`,
    `inclusionNone`, `chipNoFigure`, `rowNoFigureDesktop`, and the rule in `export-dialog`.
  - **The dash as a delimiter.** `commit-sheet.tsx` does
    `copy.pullNote.split(" — ")`. Changing that string's dash breaks the component with no
    type error and no failing test. **Grep for `split`/`indexOf` against any string before
    changing its dash.**

Measured 2026-09-13, comments excluded (the 2026-09-01 figure of "175 lines" counted code
comments, which rule 4 puts out of scope, and overstated the real total by roughly 5x):
**132 prose em dashes across 18 files** in `src/lib/copy/`, plus **29 hardcoded in `.tsx`**.
Only **15** literal em-dash assertions exist across all 252 test files, because component
tests reference copy by key rather than by string.

The rest of rule 9's tells still apply, as before.

## The label-joining dash is not in scope (ruled 2026-09-13)

Rule 4 applies to prose. It does **not** reach the em dash that joins a bold label to its gloss,
which Hugh ruled a deliberate pattern after the sweep:

> **Ramp** — you want your commander out a turn early, every game.
> **No synergy data** — EDHREC doesn't track this commander.

Twenty such dashes ship: nine in copy modules (`decks-builder.ts` ×4 rationale bodies,
`commander-explained.ts` ×4 hero notes, `recommendations.ts` `seedNote`) and eleven in components
(`coverage-section` ×3, `version-diff`, `discovery-row`, `resolution-expander`, `rec-card`, and
the glyph cases in `role-counter-cell`, `export-dialog`, `fit-bar`). **Do not flag them.**

The three documented locks that protected some of them — `decks-builder.ts:105` ("must not be
'fixed'"), brief ruling 6 for `seedNote` — stand as written.

Separately, the bare `'—'` meaning "no value" is Data, and `— = no EDHREC figure` is a legend
defining the glyph. Neither was ever in scope.

## Frozen areas — flag drift, never edit

- Strings quoted verbatim in a merged design handoff or a `READINESS.md` verdict.

## Mechanical backstop

**None.** The 99 has no `react/jsx-no-literals` lint rule, so nothing fails the build on a
new inline string. The "new user-visible string inline in a `.tsx`" trigger must be checked
by reading the diff.

## Tooltips and conventions (moved from the generic skill)

- A tooltip design exists: `src/components/cards/fact-tooltip.tsx`, and new mounts reuse it. Edit
  existing tooltip copy normally. Record `TOOLTIP` only for a string that needs a tooltip where
  no design covers it, and never invent one.
- Copy-in-`src/lib/copy` is the convention; hardcoded JSX strings are a separate finding.
- Locks include `READINESS.md` verdicts (the readiness audit's ready/not-ready call on a
  design handoff).
