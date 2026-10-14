# CONTRAST — the black mana pip, measured (R3)

Every figure below is computed on the shipped hexes in `src/app/globals.css` at `main`, rounded
to 2 d.p. (contrast) or 3 d.p. (ΔE). **Measured after 8-bit quantisation**, per the themes
handoff's finding that five values clamp clean in OKLCH and bust after rounding. ΔE is OKLab
Euclidean distance — the repo's own `deltaEOk`.

- Shipped `--b`: `#1E1B1A` — L 0.0113, C 0.004
- **Called `--b`: `#98748F`** — L 0.2115, C 0.059, hue 335
- *R1 `#837D78` — L 0.2085, C 0.010. Superseded: no hue.*
- *R2 `#857A93` — L 0.2101, C 0.040, hue 305. Superseded: **fails `contract.test.ts`** at
  ΔE 0.087. See §5 and §7.*

## 0. The four gates, and which one binds

| gate | source | floor | R3 |
|---|---|---|---|
| disc vs. ground | WCAG non-text | 3:1 | **3.37** (Rune Frost `--elevated`) |
| `--bg` glyph on disc | WCAG text | 4.5:1 | **4.65** (Moonlit) |
| **pip vs. that theme's accent** | **`src/lib/theme/contract.test.ts:145`, iterated over `["w","u","b","r","g"]` × 6 themes** | **ΔE ≥ 0.100** | **0.115** (Oil and Iron *and* Rune Frost) |
| pip vs. pip | same file | ΔE ≥ 0.100 | **0.122** (`--r`) |

**The accent gate is the binding one, and R1 and R2 both failed it.** R1's neutral measured
0.064 and R2's violet 0.087 — both red on `pnpm test`, R2 on two themes (phyrexia, kaldheim).
Worse, the 0.087 was quoted in R2's own README and READINESS as evidence of *safety*; it was the
breach. That is the correction R3 exists for.

**The chroma budgets do not apply here.** The theme brief's ≤0.02 (surfaces), ≤0.04 (borders)
and ≤0.03 (text) are stated per class and the WUBRG class is not among them — `--r` ships at
C 0.138. R1's "achromatic, so the chroma gate is unaffected" was answering a question that was
never open.

---

## 1. Disc against ground — all six themes, all three grounds

A pip renders on exactly three grounds: `--bg` (the desktop card-modal art column, the
collection canvas), `--surface` (the deck card, the decklist row, the commander detail panel)
and `--elevated` (filter chips, the picker trigger, the mobile Set row).

| theme | `--bg` before → after | `--surface` before → after | `--elevated` before → after |
|---|---|---|---|
| amonkhet · Gilded Stone | 1.10 → **4.69** | **1.01** → **4.31** | 1.11 → **3.83** |
| kamigawa · Neon Rain | 1.12 → **4.77** | 1.04 → **4.42** | 1.08 → **3.95** |
| innistrad · Moonlit | 1.09 → **4.65** | **1.01** → **4.23** | 1.15 → **3.71** |
| phyrexia · Oil and Iron | 1.15 → **4.88** | 1.08 → **4.60** | **1.01** → **4.21** |
| duskmourn · Screen Glow | 1.12 → **4.77** | 1.02 → **4.37** | 1.12 → **3.81** |
| kaldheim · Rune Frost | 1.09 → **4.65** | 1.04 → **4.09** | **1.27** → **3.37** |

**Before:** 1.01 – 1.27 — eighteen grounds, eighteen failures of the 3:1 floor, three of them
pixel-equivalent to the surface behind them. **After:** 3.37 – 4.88, eighteen passes, floor case
Rune Frost on `--elevated`.

## 2. Glyph ink on the disc

The 22px and 26px pips carry a letter. Four colours take `--bg`; black took `--fg-body` via
`PIP_TEXT` because `--bg` on the shipped disc was 1.09 – 1.15.

| theme | `--bg` on shipped `--b` | `--bg` on called `--b` |
|---|---|---|
| amonkhet | 1.10 ✗ | **4.69** ✓ |
| kamigawa | 1.12 ✗ | **4.77** ✓ |
| **innistrad** | 1.09 ✗ | **4.65** ✓ |
| phyrexia | 1.15 ✗ | **4.88** ✓ |
| duskmourn | 1.12 ✗ | **4.77** ✓ |
| kaldheim | 1.09 ✗ | **4.65** ✓ |

**The binding glyph case is Moonlit at 4.65, not Rune Frost.** Innistrad's `--bg` `#101314` is
the lightest of the six by luminance (L 0.00636 vs Rune Frost's 0.00699 — Rune Frost is bluer,
not lighter).

`PIP_TEXT` worked as a patch, and it worked in **one file**. `mana-pips.tsx`, which draws the
mana cost in the card modal on every route, hands `--bg` to all five — so its `B` glyph is
currently the 1.09 – 1.15 case, on an invisible disc, at 22px and 26px.

## 3. Pip against accent — the gate that set the value

`contract.test.ts:145` runs `deltaEOk(pip, accent) >= 0.1` for every pip in every theme.

| theme | accent | R1 `#837D78` | R2 `#857A93` | **R3 `#98748F`** |
|---|---|---|---|---|
| amonkhet | `#CF8745` | 0.148 | 0.167 | **0.153** |
| kamigawa | `#FF4D9A` | 0.212 | 0.221 | **0.190** |
| innistrad | `#8AAFA1` | 0.135 | 0.147 | **0.158** |
| **phyrexia** | `#52827A` | **0.064 ✗** | **0.087 ✗** | **0.115** ✓ |
| duskmourn | `#49A9DC` | 0.141 | 0.149 | **0.169** |
| **kaldheim** | `#5C86C9` | 0.079 ✗ | **0.092 ✗** | **0.115** ✓ |

Two themes bind, and they bind equally at R3. Note kamigawa: the accent nearest in *hue* to a
magenta pip is the one with the widest ΔE of the six, because the separation there is carried by
lightness.

## 4. Pip against pip

| pair | ΔE |
|---|---|
| `--b` vs `--r` `#C05A3E` | **0.122** ← nearest |
| `--b` vs `--u` `#3A6AA5` | 0.135 |
| `--b` vs `--g` `#4B7A46` | 0.170 |
| `--b` vs `--g` `#527030` (phyrexia's exception) | 0.181 |
| `--b` vs `--w` `#F4E9C4` | 0.331 |

All clear. The nearest neighbour moves from `--u` (R2) to `--r` (R3) — magenta is closer to red
than to blue — and it clears by 22%.

## 5. Candidate values considered

| value | L | C | hue | worst ground | glyph | **accent ΔE** | verdict |
|---|---|---|---|---|---|---|---|
| `#1E1B1A` (shipped) | 0.011 | 0.004 | — | 1.01 | 1.09 | 0.030 | The defect, and it fails the accent gate too. |
| `#3A3532` | 0.037 | 0.006 | — | 1.12 | 1.54 | — | Reads as black. Fails every gate. |
| `#7C7671` | 0.184 | 0.009 | — | 3.02 | 4.17 | 0.061 | Clears the disc, fails the glyph *and* the accent gate. |
| `#837D78` (R1) | 0.208 | 0.010 | — | 3.33 | 4.59 | **0.064 ✗** | Clears both contrast gates. **Rejected twice over**: reads as a dimmer white (§7) *and* red on CI. |
| `#7A6F88` | 0.173 | 0.040 | 305 | 2.87 | 3.96 | 0.088 ✗ | Violet at R1's pre-lift lightness. Fails three gates — hue does not buy contrast. |
| `#857A93` (R2) | 0.210 | 0.040 | 305 | 3.35 | 4.62 | **0.087 ✗** | Fixes the reading, **fails CI on two themes.** |
| `#8E7792` | 0.210 | 0.048 | 321 | 3.35 | 4.62 | **0.100** | Passes — *exactly* on the floor (0.101 in Rune Frost). **Rejected: no headroom.** |
| **`#98748F`** | **0.212** | **0.059** | **335** | **3.37** | **4.65** | **0.115** | **Called.** 15% clear of the floor on both binding themes. |
| `#9A7392` | 0.212 | 0.065 | 334 | 3.37 | 4.66 | 0.115 | Equal on the binding gate, more chroma, and starts reading as a pink pip. |
| `#918B86` | 0.262 | 0.011 | — | 4.02 | 5.55 | 0.077 ✗ | Reads unmistakably grey and fails the accent gate. |

**`#8E7792` vs `#98748F` is the only live choice**, and it is decided on headroom, not on looks:
the two are indistinguishable at 9px (§1 of the canvas draws both), and the themes handoff's own
finding is that a value with no headroom fails in **all six** themes the day one accent moves —
five of the six accents have moved at least once already.

## 6. The two pairs to watch

| pair | shipped | R3 | verdict |
|---|---|---|---|
| `--b` vs. `--border-dashed` (the generic `{n}` disc) | 1.69 – 2.13 | **2.23 – 3.27** | Accepted. Floor is **Screen Glow at 2.23** (`#3F4B55`), then Rune Frost 2.31. Four simultaneous differences: lightness, glyph ink (`--bg` vs `--fg`), glyph class (letter vs digit), and now hue — the generic disc is desaturated blue-grey, the pip magenta-violet. Tightest pair after the change; re-measure if `--border-dashed` lifts. |
| `--b` at `ColorPip`'s unselected `opacity: 0.40`, on `--surface` | `#1E1A17` → **1.00** | `#4F3E46` → **1.74** | Below 3:1, gap 2. Was pixel-identical to its surface. `0.55` reaches 2.18 and is still short; clearing 3:1 needs the opacity gone, which is a second file and changes all five pips. |

## 7. Why a neutral was wrong, in numbers

R1's grey and the hued values share a lightness, so no contrast gate separates them. What
separates them is **which axis carries the difference from white**:

| | `#837D78` (R1) | `#857A93` (R2) | `#98748F` (R3) |
|---|---|---|---|
| contrast vs. `--w` | 3.35 | 3.33 | 3.31 |
| ΔE vs. `--w` | 0.342 | 0.346 | 0.331 |
| **hue term of that ΔE** | **0.011** | 0.049 | **0.093** |
| accent ΔE (worst) | 0.064 ✗ | 0.087 ✗ | **0.115** ✓ |

Three of the five pips are separated from white by hue. R1 separated black from white by
lightness alone — and at 9px and 12px, where the pip carries **no glyph at all** and an identity
row is a run of adjacent discs, two hueless discs are two pale dots at two brightnesses. That is
the review's complaint; the hue term is the number behind it.

**And the accent row is why the answer was not simply "add a little hue".** The amount of hue is
fixed by a shipped test, not by taste: 0.100 is the floor, R2's 305° violet reached 0.087, and
335° at C 0.059 reaches 0.115.
