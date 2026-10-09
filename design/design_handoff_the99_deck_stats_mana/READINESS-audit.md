# Readiness audit: Deck Stats card (b), PR 4b addendum

**Verdict: 🟢 GREEN for build.**

Audited against: `docs/superpowers/plans/2026-10-08-deck-stats.md` (origin/main) sections
*New in this plan: the mana cost vs. production chart*, *Proposed curve weighting* and *Settled
by Hugh*; PR #1303 (`docs/deck-stats-gishath-weighting`, Hugh's 2026-10-09 Ruling 10 dropping
curve weighting and rescoping PR 4b to unweighted non-land attribution); and the parent handoff
`design/design_handoff_the99_deck_stats_view/` card (b) and its R1 ruling 3 (raw pip-share
butterfly). Read every file in the handoff (`README.md`, `STATES-deck-stats-mana.md`,
`READINESS.md`, the copy-strings file, and the canvas's `card()`/`frames()` logic and data
fixtures) and cross-checked the printed figures, property table and generated styles against
each other rather than trusting the handoff's own claims at face value.

## The three calls the addendum was asked to make — all honored

1. **Non-land sources on the production side:** colored, in the color they make, drawn as a
   striped segment after the land segment in that color's bar (`otherBg`'s
   `repeating-linear-gradient(135deg, …)`, property table row "non-land segment"). Matches.
2. **Curve weighting:** dropped. No "weighted" string anywhere in README, STATES, READINESS, the
   copy-strings file or the canvas's visible copy — the one hit (`deck-stats-mana · copy
   strings.ts:28`) is the comment recording the absence. `demand`/pips stay raw per-copy counts.
   Matches Ruling 10 exactly, including the rescoped PR 4b description.
3. **Thin state, lands-only deck:** drawn (m3, "Feather"), all bars solid and fully rounded,
   legend replaced by the one-line fact. Matches.

## Verified internally consistent

- **Fixture arithmetic checks out.** Recomputed the canvas's own `card()` function against its
  `DECKS` data: Gishath totals 104 pips / 65 sources, green at 50% pips / 32% sources (15 land +
  6 striped = 21), matching every figure quoted in README and STATES prose and the ARIA-label
  example in STATES §Announcements. Korvold's per-color pip/source gaps are all ≤ 8 points,
  matching the "balanced" label. Feather has zero non-land sources on every row, matching the
  all-solid thin state.
- **Property table matches the generated styles.** Stripe (`135deg`, 2px/5px, 1px inset edge),
  radii (mixed bars round only the outer ends; single-part bars round all four corners at 3px),
  and the floor widths (8px / 10px land-adjacent minimum, 13px / 15px mixed-bar floor = the
  stated `minO + 5`) all match the code that draws them.
- **Both widths, all three named decks drawn** (`frames()` returns a 390 and a 1300 frame per
  deck) — HD Gishath (6/6/6 basics, green short, tooltip open at 1300 per the ledger), a balanced
  deck (Korvold), and the lands-only thin state (Feather). The "one color" and "no lands" states
  are described in STATES but not given their own canvas frames; both are stated as trivial
  variants of m1/m3's existing mechanics, which is a reasonable shorthand for this scope and not
  a gap.
- **Tokens all resolve.** Every `var(--x)` in the canvas (`accent-shadow`, `accent`, `b`, `bg`,
  `border-dashed`, `border-strong`, `border`, `elevated`, `fg-body`, `fg-faint`, `fg-locked`,
  `fg-muted`, `fg`, `g`, `r`, `surface-sunken`, `u`, `w`) is declared in
  `src/app/globals.css` for all six themes.
- **Copy obeys the house rules.** No em-dash anywhere in README, STATES, READINESS, the canvas's
  visible text, or the copy-strings file; no British spellings. Tooltip and legend strings in
  the canvas match the copy-strings file word for word.
- **About entry handled correctly.** Ledger item 3 treats the key-line edit as an ordinary edit
  to the existing (not-yet-shipped) `deck-stats` entry at whatever version comes next, exactly as
  the plan's own note prescribes (`AGENTS.md`'s cosmetic-vs-feature rule, applied in reverse) —
  not a new entry, no bump owed from this addendum alone.

## Findings

All eng-resolvable; none require a return trip to Design.

1. **Citation slip in `READINESS.md`'s Gap report (item 1):** it attributes the superseded
   "non-land sources … drawn hollow" rule to "**R2** ruling 3." That rule is R1 ruling 3 (the
   unlabeled `## Rulings` list in `design_handoff_the99_deck_stats_view/README.md`); the `## R2`
   section that follows it never restates ruling 3 — it covers placement and the curve/job/
   average/money color directions only. `README.md`'s own line 4 in this same addendum correctly
   says "R1 ruling 3." A one-word fix (R2 → R1) in `READINESS.md`; no substantive disagreement.
2. **The plan's "source of truth" isn't on `origin/main` yet.** This addendum's README cites
   Hugh's 2026-10-09 ruling dropping curve weighting as settled in the plan, but as read from
   `origin/main` right now, `docs/superpowers/plans/2026-10-08-deck-stats.md` still carries the
   un-superseded "Proposed curve weighting" heading and lacks Ruling 10 in "Settled by Hugh" —
   that content exists only in PR #1303, which is still **OPEN** (not merged; Copilot review is
   green with 0 findings, and both commits are authored/co-authored by Hugh himself). Not a
   disputed fact, just a merge-ordering dependency: land #1303 before or alongside any PR 4b
   implementation PR so the plan the handoff cites actually says what's quoted.
3. **Build-lane items the handoff already flags itself, carried forward rather than re-raised:**
   copy strings are placeholders pending `/copy-review` (Ledger item 1); the stripe's six-theme
   contrast check on `--w` and the C row is owed (`READINESS.md`'s "Stripe fill" row); the
   non-land color-parse and land-search-attribution hit rates need measuring on staging once
   built, per the plan's own `measure:tutors`/`classifierCollapse` convention (`READINESS.md`'s
   "Non-land color parse" / "Land search attribution" rows, and Ledger item 5). None of these
   are design calls.

## PR 4b's scope in the plan

**No change needed.** The plan as amended by PR #1303 (non-land mana sources — rocks, dorks,
land search — added to `supply[color].nonland` with unweighted counts; `demand` stays the raw
pip count; curve weighting dropped) and this handoff agree exactly, including which cards draw
colored vs. hollow and where the hollow-squares removal applies.
