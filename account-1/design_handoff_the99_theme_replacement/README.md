# README — Theme replacement pass

`design/design_handoff_the99_theme_replacement/` · **R6** · 2026-09-06

Six themes, two of them redundant. This pass removes those two, adds two that are not, and
renames three survivors into a naming system that was implicit already.

## The problem, measured

Accent hue in OKLCH. The complaint was that four themes read as two:

| Theme | Accent | Hue | Nearest neighbour |
|---|---|---|---|
| Moonlit `innistrad` | `#8AAFA1` | 165° | **15° from Oil and Iron** |
| Oil and Iron `phyrexia` | `#52827A` | 180° | **15° from Moonlit** |
| Screen Glow `duskmourn` | `#49A9DC` | 240° | **25° from Rune Frost** |
| Rune Frost `kaldheim` | `#5C86C9` | 265° | **25° from Screen Glow** |
| Gilded Stone `amonkhet` | `#CF8745` | 57° | 62° |
| Neon Rain `kamigawa` | `#FF4D9A` | 355° | 62° |

The two well-separated themes sit 62° apart. **62° is therefore the target**, and anything
under roughly 40° stops reading as a separate decision at the sizes accents actually render.

## Decisions

**1 · Cut Moonlit and Screen Glow.** Client's call, against my recommendation, which was to cut
Oil and Iron and Rune Frost instead — those two are the set's only `--accent` AA failures (4.3
and 4.5 at 14px). The consequence is recorded rather than argued: **the link-out handoff's
`--accent-hover` rule is now permanent, not transitional.** Nothing else in this package
depends on which half went.

**2 · Ixalan · Canopy** — `#A3C445`, 118°, **61° of clearance**, 9.6:1 on its own ground. The
only candidate that matches the survivors' own spread. Takes the wide empty corridor between
brass and teal. Trirong gives the set its first slab.

**3 · Eldraine · Witching Hour** — `#AE88E6`, 300°, 35° of clearance, 6.6:1. Tighter than
ideal on hue alone, which is why it separates on two more axes: a genuinely purple ground
against First Frost's teal-tinted slate, and a nine-point chroma gap. No semantic token within
90°.

**4 · Tarkir · Ember Steppe was drawn and rejected.** `#E27A62` at 33° sat 24° from Gilded
Stone — closer than the pair this pass exists to separate — and **2° from `--danger`**, which is
fixed across all six themes. A primary accent and a destructive action separated only by
lightness is a worse bug than a redundant theme.

**5 · Naming: weather and hour, plane prefix retained.** Three systems were drawn (material,
weather, single-word). Weather and material tie on churn — both rename three of the four
surviving themes — so churn is not the reason. Weather won on two counts: it keeps the two
names already settled in decisions 2 and 3, and it is the only category that survives a
seventh theme. The plane
prefix stays at the client's direction — and it earns its keep, because it constrains each name
to weather that could occur on that plane. `Salt Fog` failed exactly that test on New Phyrexia
and became `Oil Haze`.

| Plane | Ships as | Was |
|---|---|---|
| Amonkhet | **Low Sun** | Gilded Stone |
| Kamigawa | **Neon Rain** | *unchanged* |
| New Phyrexia | **Oil Haze** | Oil and Iron |
| Kaldheim | **First Frost** | Rune Frost |
| Ixalan | **Canopy** | *new* |
| Wilds of Eldraine | **Witching Hour** | *new* |

**6 · Ids do not change.** A consequence of decision 5 worth stating on its own: the four
survivors keep `amonkhet`, `kamigawa`, `phyrexia`, `kaldheim`, so no selector and no persisted
value moves for them. Only the two removals need handling.

**7 · The chroma contract stands; the palettes moved.** R5 shipped two palettes that failed
`src/lib/theme/contract.test.ts` — Canopy on 2 gates, Witching Hour on 15. Engineering offered to
raise the chroma budget instead. **Declined.** Every shipped theme sits at or below 0.0199 surface
chroma, which means ground-temperature separation in this system has *always* been carried inside
a 0.02 budget. Decision 3 justified Witching Hour's purple ground as one of three separation axes;
what it did not check was whether that axis needed 0.038 chroma to work. It does not — the
precedent says 0.02 is enough. Every changed token keeps its OKLCH **lightness and hue** and moves
only in chroma, so the ground is the same purple, less saturated. **Accents are untouched.**

**8 · `--b` was wrong in R1 and R5 inherited it.** The table listed `#1E1B1A` for the black pip in
all six columns; the shipped code uses `#98748F`. On Witching Hour's surface the near-black
measured **1.02:1** — a pip you cannot see. Corrected in all six columns. Worth asking what else in
R1's table has drifted from code, because this one survived two handoffs unnoticed.

## Gaps — what this package does not close

**0 · One number in decision 3 is now weaker than it was.** Witching Hour's separation from First
Frost was argued on three axes: 35° of hue, a purple ground, and a chroma gap. The ground axis is
real but **smaller than R5 claimed** — 0.019 rather than 0.038, still opposite First Frost in
temperature but no longer dramatic. The 35° hue gap and the accent chroma gap are unchanged and do
the bulk of the work. I still think the pair separates, but it separates by less than the R5
document says, and that is worth one look side by side before beta.

**1 · Canopy is the third green in its own palette.** `--accent` `#A3C445`, `--success`
`#6FA368` and `--g` `#4B7A46` all coexist. They are separated by lightness and chroma rather
than hue, which holds in the specimens I drew but **wants one look at a real deck-completion
reveal**, where accent and success appear together at size. This is the one thing I would check
before beta.

**2 · Cormorant Garamond has no margin for error.** It is the lightest display face in the set
and must ship at 600. At 400 it lands in the same 12–22px failure band the R2 Metamorphous
ruling was written about. Worth a lint rule if display weight is ever set per call site.

**3 · The ten §3 empty-state surfaces have not been re-rendered in the two new themes.** The
R2 handoff shows all ten across six themes; two of those columns no longer exist. Mechanical,
not risky, but it is real work and it is not in this package.

**4 · Accent-area heuristic not re-run.** R2's "roughly 10%" is eyes-on, not CI. Canopy's
accent is the highest-chroma green in the app and may want less area than brass did. Unmeasured.

## Package

`TOKEN-TABLE.md` — 35 keys × 6 themes as literal hexes, the CI contract, plus the two new
blocks as paste-ready CSS · `MIGRATION.md` — **read before deleting anything**, the persisted-id
fallback and its order of operations · `themes · copy strings.ts` — the picker block, renames
annotated with what they replace · `tokens.json` — same data, machine-readable, including a
`removed` block with each retirement's fallback · `The 99 - Theme Replacement Candidates.dc.html`
— the working document: hue map, three candidates in situ, three naming systems, and the
rejected Ember Steppe with its measurements.
