# READINESS — Art wash on detail surfaces

**Verdict: GREEN on everything except one value, which is 🟡 PENDING RE-RATIFICATION
(2026-09-11):** the `left-portrait` ambient layer this handoff specs at `.20` is no longer
drawn — see the errata at the foot of this handoff's README. Decision §G survives it. Nothing
else in this review is affected, and the rest remains ready to build.

Handoff: `design/design_handoff_the99_deck_details_wash/` (R5 — `README.md`, `The 99 - Deck
Details Art Wash.dc.html`, `brand/`). Extends the shipped amendment in
`design_handoff_the99_art_wash/` to the deck-details header at both widths, the commander-details
hero on mobile only, and the deck rename interaction. Decisions numbered 11–15, continuing from
that handoff.

Five review rounds. R1 and R2 were built from screenshots and sibling documents and specced hex
literals against a system that is six per-theme token sets; R3 moved the whole document onto
`var(--*)`; R4 drew the states that had been named in prose only; R5 drew the desktop editing band
and corrected two specs against the components that own them. This file records the verdict and
the work engineering carries into the build.

---

## Why this is Green

Every blocker raised across the five rounds is closed, and the last two were closed against
shipped source rather than by assertion. Both of R4's remaining items resolved in R5:

**The desktop rename mechanism is now drawn.** Decision 15's zero-reflow claim — Save and Cancel
replacing Update and Export in the actions slot rather than adding a row — was asserted in prose in
both files across three revisions and rendered nowhere. The only drawing of it was an isolated
title-column demo that placed the buttons inline beside the field, and the hint row was conditional
on the field's presence, so it was not possible to tell whether entering rename added a row.
R5 draws the whole 168px band in the editing state (canvas:356-391): the field replaces the title
in place at the same 352×29 box, Save and Cancel occupy the actions column where Update and Export
sit at rest, the hint moves beneath them inside that column, and the pips/subtitle row, count, bar
and owned line are all at the pixel they hold at rest. The claim and the drawing now agree.

**The status chip renders as shipped.** An earlier draft respecced the chip — a
`var(--surface-sunken)` fill and a `var(--border-dashed)` border on `Building` — while citing the
ratification that shipped the component it was respeccing. R5 adopts `statusPillStyle` verbatim,
and the table in README §5 matches `src/lib/decks/status-style.ts` token for token: the status
colour lives in the fill as `color-mix(in srgb, var(--token) N%, var(--bg))` at 18% with 16% and
14% exceptions for `Draft` and `Building`, every status takes one `var(--border-strong)` hairline,
and `Building` differs only in `border-style: dashed`.

**Design found a third defect while reading that file, which the audit had not raised.** The
progress bar had been specced as a percentage tri-state — success at ≥99, warning at 55–98, danger
below 55. `statusBarStyle` keys the fill off the status token instead, with no threshold on the
count, so the tri-state would have rendered the document's own 40/99 `Building` frame red. R5
replaces it with the six-status table and the canvas redraws that frame at `var(--fg-body)`.
Verified against `status-style.ts`.

## What was verified independently

Every claim below was checked against the tree at `a4a0af2`, not taken from the handoff:

- The chip and bar tables match `src/lib/decks/status-style.ts` exactly — `STATUS_TOKEN`, the 18%
  fill with the `Draft` 16% / `Building` 14% exceptions, the uniform `--border-strong` hairline,
  the dashed `Building` style, and `Math.min(100, …)` on the bar width.
- Pips adopt `IdentityPips` verbatim (`src/components/commanders/commander-art.tsx:19-46`) —
  `rounded-[2px]`, `inset 0 0 0 1px rgba(0,0,0,0.4)`, `var(--w…--g)` from
  `src/lib/collection/browse.ts:127-129`, and `null` on an empty identity.
- The focus ring exists already: `globals.css` sets `outline: 2px solid var(--accent);
  outline-offset: 2px` on `:focus-visible` inside `@layer base`, and the editing field's
  `focus-visible:outline-none` opt-out is the one that rule's own comment anticipates.
- 768px is the right breakpoint: the shipped header (`builder-spine.tsx:282-535`) uses `md:` in 45
  places and `sm:` in none, and `.guided-banner` splits at the same width.
- The clamp reasoning against `suggestion-tile.tsx:291-299` is correct — that file's
  `min-h-[2.5em]` aligns one-line titles across a grid of sibling tiles, which a header has none of.
- Contrast: `var(--fg-body)` on the corrected ramp measures 5.05:1 against the stated 5.06:1, and
  the retired ramp 3.60:1 against the stated 3.59:1, both computed over white art at `.58` under a
  `var(--bg)` scrim in the default theme.
- Geometry: portrait `168 × 1.37 = 230px`; crop loss `1 − 1.37/1.6 = 14.4%` and
  `1 − 1.37/2.2 = 37.7%`; a 390px-wide `2.2/1` band is 177px.
- All six `[data-theme]` blocks are complete and match `globals.css`, including Phyrexia's
  `--g: #527030`. No colour literal appears inside any drawn product frame except the sanctioned
  `rgba(0,0,0,0.4)` inset ring, the `rgba(0,0,0,0.85)` / `rgba(0,0,0,0.8)` text shadows, and `#000`
  as a `mask-image` alpha.

## Engineering carries into the build

Not gaps. Work the handoff implies that no drawing can show.

1. **`art_crop` does not reach the deck detail page.** `getDeckDetail`'s commander select
   (`src/lib/decks/read.ts:128-137`) lists `oracleId, name, colorIdentity, manaCost, typeLine,
   oracleText, imageUri` and not `artCropUri`; the crop currently only reaches `DeckListItem`. The
   query and the type change are a prerequisite for any of this rendering.
2. **`<ArtWash>` needs a wider `band` and parameterised scrims.** `band` is typed as the literal
   union `148 | 72` and legal only on `left-portrait`; the deck header needs `168`. `portrait()`
   branches on `band === 148` in six places and both `SCRIM` and `COVER_ART_OPACITY` are module
   constants. Decision 12 — the label edge decides the ramp, so the third stop is `.62 @ 50%` —
   means the `cover` scrim has to become a function of that edge rather than a constant, and the
   change applies to every bottom-labelled `cover` surface, not just the two new ones.
3. **`FullCardTrigger` needs its tap target scoped.** It renders a hard-coded pill at
   `top:56 right:16` *plus* a full-band `absolute inset-0` click overlay
   (`src/components/commanders/full-card-trigger.tsx`). The deck header is full of controls, so the
   overlay must be scoped to the pill before the pill can sit there. This is the handoff's own open
   item 2, and it is ours. Three placements, one component: the portrait's bottom-left on desktop,
   `top:13px right:16px` on mobile, and the canonical `top:56px right:16px` on the hero.
4. **The clamp ships as `-webkit-line-clamp`, not as `max-height`.** README blocker 6 says so
   explicitly; the canvas draws `max-height` only because its style compiler drops `-webkit-box`.
   Follow `suggestion-tile.tsx:291-299`'s inline-style precedent — Tailwind's `line-clamp-2` is
   used nowhere in `src/`. No `min-height`.
5. **Four stale readings, corrected in review — nothing carried.** R5's two late corrections
   (conflict 3 on the bar, blocker 5 on the chip) had not been propagated into the README's
   summary sections: the retired-colour table still called the bar a percentage tri-state and gave
   the chip a flat `var(--surface-sunken)` ground, blocker 4 said a 40/99 deck renders
   `var(--danger)`, and conflict 6 listed the chip among the flat grounds. All four now read as
   `statusBarStyle` / `statusPillStyle`. Build to those two functions; nothing in the document
   disagrees with them any more.

## Open with Design, not blocking

The handoff's own open items 1 and 3–6 carry forward unchanged: rename undo (a product call on how
loud the confirmation should be, since blur commits), focal calibration on five arts rather than a
census, undrawn full-art and extended-art printings, app-shell chrome drift that needs
`design_handoff_the99_appshell/` rebased onto tokens before either document can be called correct,
and the shipped header's divergence from `design_handoff_the99_deck_reimport/`'s type sizes. Item 2
is engineering's, and is listed above.
