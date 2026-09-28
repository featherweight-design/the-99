# Readiness audit: About, "How the app reaches its answers" (R1)

**Verdict: 🟠 Orange, with two items for Hugh (not Design).** Everything else is Yellow: it can be
built once the engineering corrections below are applied. The audit was run against the #1089
brief (`docs/superpowers/design-briefs/2026-09-28-how-it-works.md`), its inventory, and
`origin/main`.

## For Hugh

- **Prices, and the Game Changers sub-row, fit none of the four locked methods.** Both are
  someone else's published list: ManaPool's feed, and Wizards' list as Scryfall carries it.
  The copy draws Prices with no tag (`copy strings.ts:98`), which breaks §3's "every row names
  one or more". The two options:
  - Add a fifth method, `published list`. Design leans this way (`READINESS-r1.md:83-87`).
  - Relax the rule, so Prices shows no mark.
- **Whether the batched bump announces the appendix** (Design's open 5, `READINESS-r1.md`).
  The brief says only that it rides the next batched bump with no bump of its own. It does
  not say whether that bump's sheet names it. Rows are not entries, so by default the sheet
  would say nothing.

## What checks out

- **§2.** All eight rows are present (`copy strings.ts:58-117`, canvas `:545-604`), none merged,
  each with its source, how it's decided, refresh, and exact or partial. These figures were
  spot-checked against the code and hold:
  - the 10/10/8/3 fallback;
  - fit 15/25/60, pool full at 200, out of 40 with no list;
  - the 30% "Something new" floor;
  - the UTC-day rotation;
  - credits 10/3 per rolling 24 hours;
  - Game Changers via Scryfall.
- **§3.**
  - Exactly four method marks, used consistently, with EDHREC and Commander Spellbook named in
    the key.
  - No new score or percentage.
  - Card labels are excluded.
  - It rides the batched bump, with the `about.test.ts` hash re-pinned deliberately.
- **§4.** All four questions are answered:
  - a closing appendix after the chapters;
  - word tags in a new `MethodTag`, shown reused in the "How we make these decisions" sheet;
  - one "explained in" row per entry;
  - on the phone, the same rows stacked.
- **About and version.** No route, no new `AboutEntry`, `ABOUT_VERSION` stays 9, and all 21
  entry keys exist. The page can host the appendix after `CHAPTERS.map`. Design's open 5 (does
  the bump announce the appendix) is Hugh's, above.
- **Tokens and parts.** Every token is declared in all six themes. `ProvenanceOpener`,
  `CURRENT_BAND`, `JumpMark` and the detection copy exist.

## Engineering corrections

The first three exist because Design worked from the brief before its #1090 cadence update.
**They ship with #1090's schedules, never before.** On `main` today the catalog and prices
still run weekly and there is no release index (`catalog-refresh.yml`, `price-refresh.yml`:
`0 9 * * 1`), so copy saying "daily" would state a cadence the app doesn't run.

1. **Prices refresh** becomes "Daily." The drawn "Weekly, Monday 09:00 UTC." (`:101`) breaks the
   brief's no-clock-time rule, and the cadence is now daily.
2. **Brackets refresh** becomes "Card data refreshes daily and combos weekly." It currently
   says weekly for both (`:62`).
3. **Roles, Themes and Recommendations** gain "and about two weeks after each new set"
   (`:72`, `:79`, `:86`).
4. **Map the sub-row keys and fix the state names.** The detection keys are `landDenial` and
   `combos`, not `massLandDenial` and `twoCardCombos`. None of README:164-165's state names is
   the code's:
   - the phone's open set is `opened` (`contents-r6.tsx:310`), not `openChapters`;
   - there is no `jumpedId`, because the jump is the `data-jumped` DOM attribute
     (`jump-mark.tsx:7`);
   - there is no `currentId`; the code uses `place` (`contents-r6.tsx:35`) and `current`
     (`contents-rail.tsx:38`).
5. **Tutors' "Not measured yet"** waits on brief §5.5, which gives the tutor classifier a stated
   accuracy.
6. **Keep the sequencing.** The Roles and Recommendations lines say three surfaces use the
   fallback targets. That stops being true when brief §5.4 is fixed, so the copy and the fix ship
   together.
7. **New engineering:**
   - `MethodTag` and `HowRow`;
   - the "explained in" line in `Entry`;
   - a non-chapter group in the contents rail and list, whose types are keyed on `AboutChapter`;
   - the search denominator +8;
   - a hash that opens its row before the jump mark lands.
8. **Tag a method where a row reads it.** Stand-ins also reads your deck's colors, and
   Recommendations' Roles part reads rules text.

## For `/copy-review`

These do not affect the verdict.

- "Between them they name 22 of the 24…" (canvas `:552`) has no antecedent here.
- "Game Changers" is the app's "Game changers" (`deck-analysis.ts:370`).
- The "Themes" row title collides with the existing About entry "Themes" (the visual themes).
- "10 a day … over a rolling 24 hours" reads as two windows.
- "which one it is, is yours to say" is awkward.

Checked and fine: no em dashes and no British spellings in shipping strings, and no §5 defect is
restated as fact.

## Against Design's READINESS-r1

- **Agree** with its opens 1–4.
- **Open 5** is Hugh's, above.
- **Its self-assessment missed** the Prices clock time and cadence, the Brackets cadence, and
  the new-set clause.
