# Gap report — the verdict block (PR 4a)

`design-review`, run against `design/design_handoff_the99_verdict` before `gh pr create`.
Enumerate → verify → confirm, three passes, no open-ended discovery after the first.

**Result: 5 gaps found, 5 fixed, 0 remaining.** No finding needs Design.

## What the enumerate pass read

`HANDOFF.md`, `README.md` §1, `STATES-verdict.md` §A and §E, `verdict - copy strings.ts`,
`READINESS-r2-audit.md`, `design_handoff_the99_deck_analysis/assets/ASSETS.md`, and the Turn 4
sections of the canvas — 4b at 1300 and 4c at 390. Turns 1–3 are superseded and were read only
where Turn 4 draws no example: `[1,2]` and the desktop `[2]` and `[3]` blocks exist nowhere in
Turn 4, so their values carry over from the older turns, where every structural property is
byte-identical.

## The gaps

| # | Element | Design | Shipped | Fixed |
|---|---|---|---|---|
| 1 | the `/` separator between two marks | 11px at 390, 12px above | 12px at both | ✅ |
| 2 | the ringed `?` box | 14px at 390, 15px above | 15px at both | ✅ |
| 3 | the ringed `?` numeral | 9px at 390, 9.5px above | 9.5px at both | ✅ |
| 4 | the single-bracket sub-line | 12.5px at 390, 13px above | 12.5px at both | ✅ |
| 5 | the chip row's wrapper | desktop `flex`, `center`, `gap: 10px` | a plain block | ✅ |

Gaps 1–3 are the same mistake three times: the phone drew at the desktop's size. Gap 4 is its
mirror — the desktop drew at the phone's — and the sibling range sub-line one branch away carried
the step correctly, so the two sub-lines disagreed at desktop by half a pixel. Gap 5 is inert
today, the wrapper holding exactly one child; it is fixed because the box does not otherwise match
the spec and anything added beside the pill would sit wrong.

## Two resolutions this pass settled rather than reported

**The mark ships at 26 / 36, not the canvas's 30 / 36.** The Turn 4 canvas draws the mark at 30px
in the 390 block, and 30 is not on `ASSETS.md`'s ladder — that file declares itself normative on
sizes (*"Any other trio quoted elsewhere is a demonstration row, not a ship size"*), and the
round's own readiness audit says *"Build from `ASSETS.md`, not from this canvas."* 26 is the
ladder's size below 30, and `markForm` resolves both 26 and 36 to the same full-mark file, so one
element serves both widths.

**`[4]` has a drawn reading; `[3,4]` has none.** The package was drawn before the 3-vs-4 boundary
resolved, so its state matrix says `[3,4]` is deferred and a lone `4` does not occur. Since the
2026-09-20 ruling that is exactly backwards: `permitsFor` returns `[4]` and cannot return `[3,4]`.
`[4]` also arrives with `violatesB3` FALSE — nothing at bracket 3 was violated — so the
"what ruled the one below out" sentence has no violation to name, and a reading built from
violations alone would draw an empty sentence on a real deck. `verdictSubLine` gives it its own
`assembled` reading, in Design's own `singleExact` slot, which takes its clause from code
precisely because these facts live there.

## What no property table can check, and what covers it instead

The mark's three failure modes all render plausible markup and error nowhere: an `<img>` inks
every mark black, a mask alone leaves the numeral in the platform serif, and a typo in the slug
serves a 404 behind identical markup. `pnpm probe:verdict-block` reads the resolved font-family,
the painted ink and the served bytes; five mutations were run against it and all five fail.

The contact sheet is `docs/superpowers/inventories/deck-verdict.json`, six cells at both widths.

## What the pre-open pass added, after the three design passes

Four findings, all four acted on, and two of them were tests of this feature's own rules that
measured nothing:

- the two-rule case was **two game changers** — one rule with a count of two — so
  `ruledOutClause`'s `nameList` join passed with `facts[0]` in its place. A game changer beside
  an unreachable combo is the only shape where two rules can co-occur at the bracket below
  (mass land denial violates bracket 3 as well, and at bracket 1 only extra turns can fire
  alone), and that fixture now fails the mutation.
- the allowance case drew a range and exercised nothing of the branch it named. The branch is
  **unreachable**: `below` is 1, 2 or 3; every rule caps at zero at 1 and 2; and `below === 3`
  needs `permits` to be `[4]`, which arrives with `violatesB3` false and no bracket-3 violation
  to report. The test pins that invariant instead.

The other two are claim corrections — the comment describing bracket-3 reasons that cannot
occur, and the contrast gate's own scope, which now records what it does not cover.
