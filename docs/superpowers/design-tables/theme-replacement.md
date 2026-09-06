# Design Property Table — Theme Replacement

Source: `design/design_handoff_the99_theme_replacement/` · **R6** · 2026-09-06
Files enumerated: `README.md`, `MIGRATION.md`, `READINESS.md`, `TOKEN-TABLE.md`, `tokens.json`,
`themes · copy strings.ts`, `The 99 - Theme Replacement Candidates.dc.html`, `support.js`.

Scope note: this package supersedes `design_handoff_the99_themes/` (R1/R2) for **theme
membership, names and the token table only**. Picker chrome, the ten §3 empty-state surfaces,
the crown and the mobile pass are **not respecified here** — they are inherited from R1/R2 and
are out of scope for this table except where MIGRATION.md adds the retirement notice.

---

## Theme tokens — `ixalan` (Canopy)

Selector: `[data-theme="ixalan"]`. 35 contract keys + `--font-display-face` (not one of the 35).

| Token | Value |
|---|---|
| `--bg` | `#0E1310` |
| `--surface` | `#171E19` |
| `--surface-raised` | `#1A221C` |
| `--surface-rail` | `#121814` |
| `--surface-sunken` | `#101512` |
| `--surface-inset` | `#141B16` |
| `--elevated` | `#212A23` |
| `--elevated-hover` | `#18201A` |
| `--border` | `#1D2620` |
| `--border-strong` | `#2C3830` |
| `--border-dashed` | `#3B4A3F` |
| `--fg` | `#E0E7DE` |
| `--fg-body` | `#B6C2B3` |
| `--fg-muted` | `#98A695` |
| `--fg-faint` | `#808C7C` |
| `--fg-locked` | `#626E5E` |
| `--accent` | `#A3C445` |
| `--accent-hover` | `#B2D257` |
| `--accent-strong` | `#85A22F` |
| `--accent-shadow` | `#3E5220` |
| `--accent-dim` | `#3E5220` |
| `--accent-mid` | `#85A22F` |
| `--success` | `#6FA368` |
| `--warning` | `#E0913C` |
| `--danger` | `#C6533F` |
| `--avail-soft` | `var(--fg-muted)` (alias, **not** a literal) |
| `--avail-hard` | `var(--accent)` (alias, **not** a literal) |
| `--avail-hard-fg` | `#ABCB5B` |
| `--avail-over-fg` | `#C56A58` |
| `--avail-over-border` | `#752619` |
| `--w` | `#F4E9C4` |
| `--u` | `#3A6AA5` |
| `--b` | `#98748F` |
| `--r` | `#C05A3E` |
| `--g` | `#4B7A46` |
| `--font-display-face` | `"Trirong", serif` |

Display face: **Trirong**, `font-weight: 600`. Declared "wherever the shipped four declare
theirs".

## Theme tokens — `eldraine` (Witching Hour)

Selector: `[data-theme="eldraine"]`.

| Token | Value |
|---|---|
| `--bg` | `#120E17` |
| `--surface` | `#1B1821` |
| `--surface-raised` | `#1F1C25` |
| `--surface-rail` | `#15121B` |
| `--surface-sunken` | `#131018` |
| `--surface-inset` | `#17141D` |
| `--elevated` | `#26232C` |
| `--elevated-hover` | `#1D1A23` |
| `--border` | `#241D30` |
| `--border-strong` | `#342C41` |
| `--border-dashed` | `#443C52` |
| `--fg` | `#E4DEEE` |
| `--fg-body` | `#B9B2C5` |
| `--fg-muted` | `#9C95A8` |
| `--fg-faint` | `#898395` |
| `--fg-locked` | `#6A6475` |
| `--accent` | `#AE88E6` |
| `--accent-hover` | `#BC9BEE` |
| `--accent-strong` | `#8E6AC4` |
| `--accent-shadow` | `#4A3568` |
| `--accent-dim` | `#4A3568` |
| `--accent-mid` | `#8E6AC4` |
| `--success` | `#6FA368` |
| `--warning` | `#E0913C` |
| `--danger` | `#C6533F` |
| `--avail-soft` | `var(--fg-muted)` (alias, **not** a literal) |
| `--avail-hard` | `var(--accent)` (alias, **not** a literal) |
| `--avail-hard-fg` | `#B795EA` |
| `--avail-over-fg` | `#C56A58` |
| `--avail-over-border` | `#752619` |
| `--w` | `#F4E9C4` |
| `--u` | `#3A6AA5` |
| `--b` | `#98748F` |
| `--r` | `#C05A3E` |
| `--g` | `#4B7A46` |
| `--font-display-face` | `"Cormorant Garamond", serif` |

Display face: **Cormorant Garamond**, `font-weight: 600` — **never 400**. At 400 it fails the
12–22px band covered by the R2 Metamorphous ruling.

## Cross-theme token corrections (all six columns)

| Token | Required value | Applies to |
|---|---|---|
| `--b` | `#98748F` | `:root` (amonkhet), kamigawa, phyrexia, kaldheim, ixalan, eldraine |

R1 documented `#1E1B1A` and R5 inherited it; the shipped code has always used `#98748F`. The
near-black measured 1.02:1 on Witching Hour's surface. Any theme block still carrying
`#1E1B1A` for `--b` is wrong.

## Surviving-theme tokens — unchanged, byte-identical to R1

`amonkhet` (`:root`), `kamigawa`, `phyrexia`, `kaldheim` keep every token value from R1 except
`--b` above. Full six-column values are in `TOKEN-TABLE.md` / `tokens.json` and are **not** part
of this pass's diff. Values that are constant across all six themes:

| Token | Value in all six |
|---|---|
| `--success` | `#6FA368` |
| `--danger` | `#C6533F` |
| `--avail-soft` | `var(--fg-muted)` |
| `--avail-hard` | `var(--accent)` |
| `--avail-over-border` | `#752619` |
| `--w` | `#F4E9C4` |
| `--u` | `#3A6AA5` |
| `--b` | `#98748F` |
| `--r` | `#C05A3E` |

`--warning` is `#DEAA29` on `amonkhet` only; `#E0913C` on the other five. `--g` is `#527030` on
`phyrexia` only; `#4B7A46` on the other five.

## Chroma contract (CI gate — `src/lib/theme/contract.test.ts`, unmodified)

| Cap | Max OKLCH chroma |
|---|---|
| Surfaces | `0.02` |
| Text ramp | `0.03` |
| Borders | `0.04` |

Measured headroom for the two new palettes:

| Theme | max surface C | max text C | max border C |
|---|---|---|---|
| Canopy `ixalan` | `0.0180` | `0.0290` | `0.0266` |
| Witching Hour `eldraine` | `0.0193` | `0.0286` | `0.0384` |

## Accent contrast targets (measured, informational)

| Theme | `--accent` on `--bg` | `--accent` on `--surface` | `--fg-muted` on `--surface` |
|---|---|---|---|
| Low Sun `amonkhet` | 6.4 | 5.9 | 4.6 ✓ |
| Neon Rain `kamigawa` | 6.3 | 5.8 | 4.7 ✓ |
| Oil Haze `phyrexia` | 4.7 | 4.3 ✗ | 4.6 ✓ |
| First Frost `kaldheim` | 5.0 | 4.5 ✗ | 4.6 ✓ |
| Canopy `ixalan` | 9.4 | 8.5 | 6.7 ✓ |
| Witching Hour `eldraine` | 6.8 | 6.2 | 6.1 ✓ |

Consequence recorded in README decision 1 / READINESS: because `phyrexia` and `kaldheim` were
kept, **the link-out handoff's rule routing outbound ink to `--accent-hover` is permanent, not
transitional.**

`eldraine` `--fg-locked` on `--surface` = **3.08:1** against a 3:1 floor (was 2.82:1 at R5).

---

## Retired themes

| Persisted id | Old display name | Status | Nearest survivor (fallback id) | Survivor's new display name | Reason |
|---|---|---|---|---|---|
| `innistrad` | Moonlit | **removed** | `phyrexia` | Oil Haze | accent 15° from `phyrexia` |
| `duskmourn` | Screen Glow | **removed** | `kaldheim` | First Frost | accent 25° from `kaldheim` |

| Persisted id | Status |
|---|---|
| `amonkhet` · `kamigawa` · `phyrexia` · `kaldheim` | ids unchanged — renamed only, **no migration** |

### Fallback resolution contract

| Input `persisted` | Returns |
|---|---|
| `null` / falsy | `"amonkhet"` |
| a key present in `THEMES` | that same value |
| `"innistrad"` | `"phyrexia"` |
| `"duskmourn"` | `"kaldheim"` |
| any other unrecognised value | `"amonkhet"` |

Explicit prohibition: do **not** fall back to `:root` / `amonkhet` for the two retired ids.

Exported data shape (`retiredThemes`, from `themes · copy strings.ts`) — the fallback must be
able to *name* the theme it moved someone to, so each entry carries:

| Key | Fields | Values |
|---|---|---|
| `innistrad` | `was` · `nowUse` · `nowCalled` | `"Moonlit"` · `"phyrexia"` · `"Oil Haze"` |
| `duskmourn` | `was` · `nowUse` · `nowCalled` | `"Screen Glow"` · `"kaldheim"` · `"First Frost"` |

### Order of operations (blocking, per READINESS)

| Step | Action | Precondition |
|---|---|---|
| 1 | Ship `resolveTheme` with `RETIRED` populated | the `innistrad` / `duskmourn` blocks still exist |
| 2 | Ship the `ixalan` and `eldraine` blocks + renamed display strings | step 1 shipped |
| 3 | Delete the `innistrad` and `duskmourn` blocks | steps 1 and 2 shipped |

Failure mode if 3 precedes 1: `data-theme` matches no block, user gets raw `:root` chrome under
a theme name that no longer exists.

---

## Theme registry / ordering

Order as declared in `themeCopy.picker.options` and in the working document's `ORDER` array
(brass · pink · teal · blue · green · violet):

| # | Id | `name` (display) | `plane` (subtitle) | Was | Display face | Weight |
|---|---|---|---|---|---|---|
| 1 | `amonkhet` | Low Sun | Amonkhet | Gilded Stone (renamed) | Cinzel | 600 |
| 2 | `kamigawa` | Neon Rain | Kamigawa: Neon Dynasty | *unchanged* | Chakra Petch | 600 |
| 3 | `phyrexia` | Oil Haze | New Phyrexia | Oil and Iron (renamed) | Syncopate | 600 |
| 4 | `kaldheim` | First Frost | Kaldheim | Rune Frost (renamed) | Metamorphous | 600 |
| 5 | `ixalan` | Canopy | Ixalan | *new* | Trirong | 600 |
| 6 | `eldraine` | Witching Hour | Wilds of Eldraine | *new* | Cormorant Garamond | 600 (never 400) |

`amonkhet` is `:root`; the other five are `[data-theme="…"]` blocks.

Ids do not change for the four survivors — no selector and no persisted value moves for them.

---

## Copy structure — `themeCopy.picker`

Wording is out of scope; this records key/arity only.

| Key | Shape | Arguments | Rendered by |
|---|---|---|---|
| `picker.label` | string | — | picker trigger/field label |
| `picker.groupLabel` | string | — | option group label |
| `picker.options[id].name` | string | — | per-option display name |
| `picker.options[id].plane` | string | — | per-option plane subtitle |
| `picker.optionLabel` | `(name: string, plane: string) => string` | `name`, `plane` | composed option label |
| `picker.applied` | `(name: string) => string` | `name` | confirmation after a theme is applied |

`options` keys, exactly six: `amonkhet`, `kamigawa`, `phyrexia`, `kaldheim`, `ixalan`,
`eldraine`. Keys `innistrad` and `duskmourn` are removed from `options`.

Everything in the R1 `themes · copy strings.ts` **outside** `picker.options` is unchanged and
not restated by this handoff.

---

## Component: Theme picker — retirement notice

Specified in `MIGRATION.md` ("Announce it once, then stop") as behaviour and placement only.

### Placement and form

| Property | Mobile (< 640px, bottom sheet) | Desktop (≥ 640px, `sm:`, popover) |
|---|---|---|
| Container | inside the theme picker | inside the theme picker |
| Form | a single dismissible line — **not** a modal, **not** a toast | a single dismissible line — **not** a modal, **not** a toast |
| Frequency | once, on first load after migration | once, on first load after migration |
| Audience | affected users only (persisted id is `innistrad` or `duskmourn`) | same |
| Dismissible | yes | yes |
| Dismissal | persisted | persisted |
| Typography / colour / spacing / dimensions / border | **not specified** | **not specified** |

No responsive difference is specified: the handoff states one form for both breakpoints. All
visual properties (font-size, weight, letter-spacing, line-height, text-transform, colour tokens,
padding, margin, gap, display, radius, border-width, dismiss-control geometry, hover/focus
styling) are **unspecified** by this package.

### Copy structure

| Element | Copy structure | Arguments |
|---|---|---|
| Notice line | Retirement announcement composed from the retired theme's old name, the survivor's display name, and the two new theme names | `retiredThemes[id].was`, `retiredThemes[id].nowCalled`, plus the two new theme `name`s (`Canopy`, `Witching Hour`) |

No copy key is defined for this string in `themes · copy strings.ts` — the handoff gives it as
prose in `MIGRATION.md` only. **Gap: the notice needs a copy key.**

### Dismiss / lifecycle states

| Trigger | Result |
|---|---|
| User dismisses the line | dismissal persisted; never shown again |
| User changes theme while the line is shown | "the line has done its job — drop it" |
| Subsequent loads after dismissal or theme change | line does not render |

---

## State Coverage

Derived from `MIGRATION.md` (persisted-value table + announce block) and `READINESS.md`.

| State | Triggering condition | Component rendered | Key data required |
|---|---|---|---|
| Normal theme | persisted `data-theme` is one of the six live ids | Theme picker, selected option highlighted; no notice | persisted id; `themeCopy.picker.options[id]` |
| No persisted theme | `persisted` is `null` / falsy | App renders `:root` (Low Sun / `amonkhet`); no notice | — |
| Retired — Moonlit | persisted `data-theme === "innistrad"` | App renders `[data-theme="phyrexia"]`; retirement notice shown once in picker | `retiredThemes.innistrad` (`was`, `nowUse`, `nowCalled`); dismissal flag |
| Retired — Screen Glow | persisted `data-theme === "duskmourn"` | App renders `[data-theme="kaldheim"]`; retirement notice shown once in picker | `retiredThemes.duskmourn` (`was`, `nowUse`, `nowCalled`); dismissal flag |
| Unrecognised id | persisted value is neither live nor in `RETIRED` (future / rolled-back build) | App renders `:root` (`amonkhet`); **no** notice specified | persisted id |
| Notice dismissed | user dismissed the notice previously | Theme picker without the notice | persisted dismissal flag |
| Notice superseded by choice | user changed theme after seeing the notice | Theme picker without the notice; new theme applied | new persisted id |
| Theme applied | user selects any theme option | `picker.applied(name)` confirmation | selected theme's `name` |
| Unstyled shell (failure mode — must not occur) | retired blocks deleted before `resolveTheme` shipped | Raw `:root` chrome under a non-existent theme name | — |

---

## READINESS status table (verbatim rows)

| Item | Status |
|---|---|
| Two redundant themes identified and cut | **Closed.** Moonlit and Screen Glow |
| Two replacements specified | **Closed.** Canopy and Witching Hour, full 35-token palettes |
| Third candidate evaluated | **Closed.** Ember Steppe rejected — 2° from `--danger` |
| Naming system | **Closed.** Weather and hour, plane prefix retained |
| Token table | **Closed.** Survivors byte-identical to R1 |
| Copy strings | **Closed.** Picker block rewritten |
| Persisted-id fallback | **Specified, not built.** `MIGRATION.md` |
| Chroma contract | **Closed in R6.** Both new palettes refitted; contract unmodified |
| `--b` black pip | **Closed in R6.** `#98748F` in all six columns |
| `--font-display-face` | **Specified.** Trirong 600, Cormorant Garamond 600; not one of the 35 keys |

**Verdict: 🟡 Amber** — ships as soon as `MIGRATION.md` step 1 is in.

---

## Rejected — must NOT ship

| Id | Name | Accent | Hue | Reason |
|---|---|---|---|---|
| `tarkir` | Ember Steppe | `#E27A62` | 33° | 24° from Low Sun; **2° from `--danger`** |

No `[data-theme="tarkir"]` block may be added.

---

## Out of scope / not closed by this package

| Item | Status |
|---|---|
| Ten §3 empty-state surfaces re-rendered in `ixalan` / `eldraine` | Not in this package (README gap 3) |
| Accent-area ~10% heuristic re-run for Canopy | Unmeasured (README gap 4) |
| Canopy's three greens (`--accent` `#A3C445`, `--success` `#6FA368`, `--g` `#4B7A46`) at size on the deck-completion reveal | Eyes-on wanted, not blocking |
| Witching Hour vs First Frost ground separation | Now 0.019 chroma, not 0.038 — one side-by-side look wanted (README gap 0) |
| Lint rule for display weight set per call site | Suggested, not specified |
| Picker chrome (layout, sizing, states), crown, mobile pass | Inherited from `design_handoff_the99_themes/` R1/R2 — not respecified here |
