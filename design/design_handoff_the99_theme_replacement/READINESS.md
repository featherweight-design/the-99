# READINESS — Theme replacement pass, R6

**Verdict: 🟡 Amber — ships as soon as `MIGRATION.md` step 1 is in.** The design is settled and
measured. The one thing standing between this and green is not a design question: it is that
deleting two theme blocks before the fallback exists breaks every user sitting on them.

## What is done

| Item | Status |
|---|---|
| Two redundant themes identified and cut | **Closed.** Moonlit and Screen Glow, client's choice of halves. |
| Two replacements specified | **Closed.** Canopy and Witching Hour, full 35-token palettes, contrast measured. |
| Third candidate evaluated | **Closed.** Ember Steppe drawn, measured, rejected — 2° from `--danger`. |
| Naming system | **Closed.** Weather and hour, plane prefix retained. Three of four survivors renamed; two new themes keep their §2 names. |
| Token table | **Closed.** `TOKEN-TABLE.md`, survivors byte-identical to R1. |
| Copy strings | **Closed.** Picker block rewritten, renames annotated. |
| Persisted-id fallback | **Specified, not built.** `MIGRATION.md`. Nearest-survivor, not default. |
| Chroma contract | **Closed in R6.** Both new palettes refitted to the shipped `contract.test.ts` caps. Contract unmodified. |
| `--b` black pip | **Closed in R6.** `#98748F` in all six columns; R1's `#1E1B1A` measured 1.02:1 and was never what shipped. |
| `--font-display-face` | **Specified.** Trirong 600 and Cormorant Garamond 600 in `TOKEN-TABLE.md`; not one of the 35 keys. |

## Blocking — one item, and it is Engineering's

**Ship `resolveTheme` before deleting the two blocks.** Order of operations is in
`MIGRATION.md`; the failure mode if reversed is an unstyled shell for every affected user, under
a theme name that no longer exists. Not a design decision, but this package is what makes it
someone's job.

## Not blocking, but I would like eyes on it

**Canopy's three greens.** `--accent` `#A3C445`, `--success` `#6FA368`, `--g` `#4B7A46` in one
palette, separated by lightness and chroma rather than hue. It holds in every specimen in the
working document, but the deck-completion reveal puts accent and success together at size and
that surface has not been rendered in Canopy. **One screenshot would settle it.**

**Cormorant Garamond at 600, never 400.** Lightest display face in the set. At 400 it fails in
the 12–22px band the R2 Metamorphous ruling covers. If display weight is ever set per call site
rather than centrally, this wants a lint rule.

## Changed under test, R5 → R6

Engineering ran R5 through the CI gate and it failed. **The palettes were wrong, not the gate.**
14 Witching Hour tokens and 2 Canopy tokens moved in chroma only — same lightness, same hue,
accents untouched. The one design claim this weakens is recorded as gap 0 in `README.md`: Witching
Hour's ground-temperature separation from First Frost is now 0.019 of chroma rather than 0.038.
Smaller, still directional, and no longer the second-strongest of its three axes.

## Recorded, not reopened

I recommended cutting Oil and Iron and Rune Frost rather than Moonlit and Screen Glow, because
those two are the set's only `--accent` AA failures (4.3 and 4.5 at 14px). The client's call
went the other way and the design is built to it. The consequence: **the link-out handoff's
`--accent-hover` routing is permanent.** Anyone who later reads that rule as a workaround
awaiting a fix should read this paragraph instead.

I also flagged that the plane names are Wizards' settings and suggested dropping the prefix. The
client judged the exposure overblown and kept it. Noted here once because it is a decision, not
an oversight — and it pays a real dividend in `MIGRATION.md`, where four of six ids consequently
need no migration at all.

## Superseded

This package supersedes `design_handoff_the99_themes/` (R1/R2) for **theme membership, names and
the token table only.** Everything else in that handoff still stands: the ten §3 empty-state
surfaces, the crown, the mobile pass, and the Metamorphous synthetic-bold ruling — which now
applies to a theme called First Frost, same id, same face, same rule.
