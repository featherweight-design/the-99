# Six-column token table — text inks addendum

`design/design_handoff_the99_themes/addendum-text-inks/` · **R1** · 2026-10-17

**Supersedes the parent table's values for the rows below and nothing else.** Every other token in
`../TOKEN-TABLE.md` stands. Rationale in `README.md`.

- **One key added**: `--accent-text`, a hex in Oil Haze and a `var(--accent)` alias in the other five.
- **Nine values change**: `--fg-faint` in all six, `--accent` in First Frost, `--accent-hover` in Oil Haze
  and First Frost.
- Contrast figures are `contrast()` from `src/lib/theme/color.ts`; floor 4.5:1 on all six solid grounds.

## Values

`—` means unchanged from the parent table.

| Token | Family | Low Sun<br/>`:root` | Neon Rain<br/>`kamigawa` | Oil Haze<br/>`phyrexia` | First Frost<br/>`kaldheim` | Canopy<br/>`ixalan` | Witching Hour<br/>`eldraine` |
|---|---|---|---|---|---|---|---|
| `--fg-faint` | Chrome | `#8B8270` → **`#948B78`** | `#6F7486` → **`#84899B`** | `#78747E` → **`#87838D`** | `#7C8A8C` → **`#8A999B`** | `#808C7C` → **`#879383`** | `#898395` → **`#8F899B`** |
| `--accent` | Accent | — | — | — | `#5C86C9` → **`#6C97DB`** | — | — |
| `--accent-hover` | Accent | — | — | `#629189` → **`#6E9D95`** | `#6C95D8` → **`#7CA6EA`** | — | — |
| `--accent-text` *(new)* | Accent | `var(--accent)` | `var(--accent)` | **`#5D8E85`** | `var(--accent)` | `var(--accent)` | `var(--accent)` |

## Each changed value on all six grounds

Shipped → proposed. `--accent-text`'s shipped figure is `--accent`'s, the ink those sites draw in today.

| Theme | Token | `--bg` | `--surface` | `--surface-raised` | `--surface-sunken` | `--surface-rail` | `--elevated` |
|---|---|---|---|---|---|---|---|
| Low Sun | `--fg-faint` | 4.95 → 5.58 | 4.55 → 5.13 | 4.41 → 4.96 | 4.82 → 5.43 | 4.74 → 5.33 | 4.04 → 4.55 |
| Neon Rain | `--fg-faint` | 4.12 → 5.50 | 3.81 → 5.09 | 3.70 → 4.94 | 4.02 → 5.37 | 3.96 → 5.28 | 3.41 → 4.56 |
| Oil Haze | `--accent-text` | 4.51 → 5.30 | 4.25 → 4.99 | 4.14 → 4.86 | 4.42 → 5.19 | 4.39 → 5.15 | 3.89 → 4.57 |
| Oil Haze | `--accent-hover` | 5.54 → 6.46 | 5.21 → 6.08 | 5.08 → 5.92 | 5.42 → 6.33 | 5.38 → 6.28 | 4.77 → 5.57 |
| Oil Haze | `--fg-faint` | 4.29 → 5.28 | 4.04 → 4.98 | 3.93 → 4.84 | 4.20 → 5.18 | 4.17 → 5.14 | 3.70 → 4.56 |
| First Frost | `--accent` | 5.08 → 6.30 | 4.46 → 5.54 | 4.25 → 5.28 | 4.86 → 6.03 | 4.76 → 5.91 | 3.67 → 4.56 |
| First Frost | `--accent-hover` | 6.16 → 7.56 | 5.42 → 6.64 | 5.16 → 6.33 | 5.90 → 7.24 | 5.78 → 7.09 | 4.46 → 5.47 |
| First Frost | `--fg-faint` | 5.22 → 6.32 | 4.59 → 5.56 | 4.37 → 5.29 | 5.00 → 6.05 | 4.90 → 5.93 | 3.78 → 4.58 |
| Canopy | `--fg-faint` | 5.32 → 5.84 | 4.82 → 5.28 | 4.62 → 5.07 | 5.24 → 5.74 | 5.11 → 5.60 | 4.20 → 4.60 |
| Witching Hour | `--fg-faint` | 5.22 → 5.65 | 4.79 → 5.19 | 4.59 → 4.97 | 5.15 → 5.58 | 5.06 → 5.48 | 4.23 → 4.58 |

## Character checks

| Theme | Token | Hue moved | Chroma | Nearest pip or semantic (ΔE) |
|---|---|---|---|---|
| Oil Haze | `--accent-text` | 1.1° | 0.055 | `--success` 0.088 (fill `--accent` keeps 0.117) |
| First Frost | `--accent` | 0.1° | held | `--b` 0.134 · `--u` 0.101 → 0.155 |
| All six | `--fg-faint` | ≤ 1.1° | ≤ 0.0295 (budget 0.03) | n/a |

`--fg-faint`'s step under `--fg-muted` (OKLab L), shipped → proposed: Low Sun 0.086 → 0.056 · Neon Rain
0.127 → 0.056 · Oil Haze 0.114 → 0.063 · First Frost 0.085 → 0.036 · Canopy 0.084 → 0.060 ·
Witching Hour 0.061 → 0.041.
