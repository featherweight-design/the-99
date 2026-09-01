# Theme system — design

Date: 2026-08-31
Branch: `feat/theme-system`
Status: proposed

## Problem

The 99 has one visual identity: a warm-brown/brass palette hardcoded across the
app, plus a crab/kaiju character layer. Hugh has fallen out of love with both.
The reference point is Deckcheck.co, which reads as clean not because of its
layout but because its chrome is desaturated — card art is the only saturated
thing on screen.

Two things follow. First, the app needs a theme dimension it does not currently
have: `globals.css` declares a single `:root`, no `color-scheme`, no data
attribute, no persisted preference. Second, a palette swap is not a
find-and-replace, because the tokens are not actually the source of truth.

### The tokenization debt

`globals.css` defines ~40 semantic tokens, but components largely ignore them
and paste brand hexes inline:

- **672 hardcoded hex literals across 67 `.tsx` files**
- **36 more in `.ts` files** (notably `src/lib/decks/celebration.ts`)
- Literals inside `globals.css` itself — `.guided-banner` hardcodes `#1E1A15`,
  `#2A241D`, `#C9A24B` and a two-hex gradient outside the token block

`src/components/commanders/rec-card.tsx` alone carries 53, in both Tailwind
arbitrary values (`group-hover:border-[#3A3229]`) and inline styles
(`style={{ background: "#1E1A15" }}`).

Until those resolve through tokens, no theme can change anything. The sweep is
a prerequisite phase, not cleanup.

## Goals

1. Six user-selectable themes, each evoking an MTG world subtly — recognisable
   to someone who knows the plane, not costume-y to someone who does not.
2. Colour *and* display typeface change per theme.
3. Chrome stays desaturated in every theme so card art keeps its monopoly on
   saturation. This is enforced mechanically, not by taste.
4. Adding a seventh theme costs one token block, one font declaration, and a
   passing contrast test — nothing structural.

### Non-goals

- No light mode. All six themes are dark. Light is a separate axis and would
  double the contrast matrix for no requested benefit.
- No per-theme layout, spacing, or radius changes. Themes are colour and
  typeface only.
- No user-authored or custom themes.
- No cross-device sync of the preference (see Persistence).

## Architecture

### Two tiers

Every theme is a **chrome skeleton** plus a **flavor layer**.

The chrome skeleton is the near-neutral scaffolding — backgrounds, surfaces,
borders, and text ramps. It carries the theme's temperature (Kamigawa's chrome
is blue-black, Amonkhet's is brown-black) but almost no chroma. It is ~30 of
the ~40 tokens and covers ~90% of pixels on screen.

The flavor layer is ~6 tokens — the accent and its hover/strong/shadow
variants, plus the focus ring — and is the only part permitted real chroma.

This is what makes "10% flavor" a rule rather than an aspiration: the flavor
tokens are enumerable, so their painted area is boundable.

### Chroma budgets

Taste judgements do not survive six themes and future contributors. The budget
is expressed in OKLCH chroma and checked in CI:

| Token family | Max chroma (C) |
|---|---|
| `--bg`, `--surface*`, `--elevated*` | 0.02 |
| `--border*` | 0.04 |
| `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--fg-locked` | 0.03 |
| Flavor tokens (accent family, focus ring) | unbounded |
| Semantic (`--success`, `--warning`, `--danger`) | unbounded |
| WUBRG pips | unbounded |

Unbounded still means contrast-bound — see Testing.

### Token contract

All six themes must define **exactly the same token key set**. A theme with a
missing key silently inherits another theme's value and produces a bug that
only appears on one plane; a theme with an extra key is dead weight. CI asserts
set equality across all themes.

Structurally:

```css
:root { /* theme: amonkhet — default */ }
[data-theme="kamigawa"] { ... }
[data-theme="innistrad"] { ... }
[data-theme="phyrexia"]  { ... }
[data-theme="duskmourn"] { ... }
[data-theme="kaldheim"]  { ... }
```

Amonkhet lives in `:root` rather than in its own attribute block so that a
missing or unrecognised `data-theme` degrades to a complete, correct theme
rather than to unstyled tokens.

The `@theme inline` block that maps tokens onto Tailwind `--color-*` utilities
is written once and is theme-agnostic — it references `var(--token)`, so it
resolves per-theme automatically.

## The six themes

| # | Theme | World | Accent | Hue | Display face |
|---|---|---|---|---|---|
| 01 | Amonkhet | Gilded stone, desert sun | `#CF8745` | 33° | Cinzel |
| 02 | Kamigawa: Neon Dynasty | Cyberpunk | `#FF4D9A` | 334° | Chakra Petch |
| 03 | Innistrad | Gothic horror, moonlight | `#9AA9A3` | achromatic | Spectral |
| 04 | New Phyrexia | Biomechanical, oil | `#518179` | 191° | Syncopate |
| 05 | Duskmourn | Analog horror, screen glow | `#49A9DC` | 201° | Big Shoulders Display |
| 06 | Kaldheim | Norse, rune and frost | `#5C86C9` | ~218° | Metamorphous |

Chrome ramps (bg / surface / border-strong / fg / fg-muted):

| Theme | bg | surface | border-strong | fg | fg-muted |
|---|---|---|---|---|---|
| Amonkhet | `#14110E` | `#1E1A15` | `#3A3229` | `#EDE6D8` | `#8E8269` |
| Kamigawa | `#0E0F14` | `#16181F` | `#262A35` | `#E6E8F0` | `#6E7488` |
| Innistrad | `#101314` | `#191D1E` | `#2B3133` | `#DDE3E1` | `#737D7B` |
| Phyrexia | `#0D0B0E` | `#151317` | `#262329` | `#E4E2E6` | `#78747E` |
| Duskmourn | `#100E15` | `#1A1822` | `#2F3A44` | `#D8DBE0` | `#606D86` |
| Kaldheim | `#121217` | `#1E1F26` | `#2E3340` | `#C6D2D3` | `#7C8A8C` |

The remaining chrome tokens (`--surface-raised`, `--surface-rail`,
`--surface-sunken`, `--surface-inset`, `--elevated`, `--elevated-hover`,
`--border`, `--border-dashed`, `--fg-body`, `--fg-faint`, `--fg-locked`) are
derived per theme by holding the existing Amonkhet ramp's lightness steps and
substituting the theme's hue and chroma. Implementation resolves them to
literal hexes in the stylesheet — no runtime colour maths.

### Why these six

Accent collision was the binding constraint, not popularity. Every theme's
accent had to be distinguishable from every other theme's accent, from the five
WUBRG pips, and from the three semantic colours. Most MTG planes sample
warm-earth: Lorwyn, Ixalan, Tarkir and Strixhaven all cluster in h15°–47°,
which Amonkhet already occupies.

The set is chosen for hue spread and saturation alternation. Innistrad is
near-achromatic and Phyrexia sits at saturation 23, so Duskmourn at 68 reads as
"the bright one" rather than as a third horror theme. Amonkhet is retained
specifically because it is the only warm theme — dropping it would make all six
cold, and range matters more here than the continuity argument.

Cut: Theros, Ravnica, Zendikar, Dominaria, New Capenna, Strixhaven, Lorwyn,
Ixalan, Tarkir. Duskmourn and Kaldheim were both kept over a sixth-slot
tiebreak; Phyrexia was retained on Hugh's preference for Syncopate and the
plane's recognisability.

### Per-theme WUBRG and semantics

Mana pips and `--success` / `--warning` / `--danger` cannot be global constants.
Duskmourn's `#49A9DC` sits close to the blue pip; Phyrexia's oil-teal sits
between green and blue. Both are resolved the same way — each theme declares
its own pip and semantic values, deepened or lightened until they clear the
separation floor.

Worked example: under Duskmourn the blue pip deepens from `#3A6AA5` to
`#3F6FB5` and the accent stays put, because the accent is the theme's signature
and the pip is the thing with slack.

## Typography

Only the **display face** varies per theme. Body stays IBM Plex Sans and mono
stays IBM Plex Mono in all six.

This is deliberate. Varying all three faces means 18 families, a CLS risk on
every paragraph in the app, and six separate readability regressions to chase.
Varying only display confines the swap to headings — 8 families total, and the
prior art supports it: VS Code keeps fonts outside the theme contract entirely,
and Obsidian's theme-bundled fonts are routinely overridden by plugins.

### Loading

`next/font/google` requires module-scope calls, so all six display faces are
declared in `src/app/layout.tsx`. That does **not** mean six downloads: a
`@font-face` is only fetched when a CSS rule uses the family, and only the
active theme's variable class is applied to `<html>`.

All six display faces therefore set `preload: false`. Plex Sans and Plex Mono
keep `preload: true` — they are used unconditionally. Without this, Next emits
six `<link rel="preload">` tags and fetches every family on every page.

## Persistence

The theme is stored in a **cookie**, read in the root layout (a server
component) and written to `<html data-theme="...">` during SSR.

The alternative — `localStorage`, matching the existing `use-local-flag`
pattern — cannot be read before hydration and produces a visible flash of the
default theme on every navigation. A blocking inline script avoids the flash
but adds render-blocking JS to every page.

No database table. There is no user-settings table today, and adding one buys
only cross-device sync for an app whose audience is Hugh and a handful of
friends. A cookie is the simplest thing that serves the real workflow. If sync
is ever wanted, the cookie becomes a cache in front of a column, and nothing
else changes.

Cookie: `the99_theme`, one year, `SameSite=Lax`, not `httpOnly` (the picker
writes it client-side for an instant swap, then the value is authoritative on
the next SSR). An unrecognised value falls through to the `:root` default.

## Character layer

Retire now, leave the slot.

`src/components/character/` (`crab.tsx`, `kaiju.tsx`, `loader-dots.tsx`)
surfaces in ~15 files: loading-screen, first-run, no-results, filtered-empty,
completion-reveal, builder-shell, resolution-expander, not-found, decks page,
guided-banner, and `src/lib/decks/celebration.ts`.

Each of those becomes a themeable empty/loading component that ships **no
illustration** — copy, spacing and a token-driven mark only. The character
components stay in git rather than being deleted, so a per-theme creature can
return later without re-plumbing every surface.

This lands **before** the tokenization sweep: the character SVGs carry brand
hexes of their own, and retiring them first shrinks the sweep.

## Testing

A Vitest suite parses `globals.css`, extracts every theme block, and asserts:

1. **Parse** — every token value is a valid colour.
2. **Contract** — all six themes declare an identical token key set.
3. **Chroma budget** — per the table above, computed in OKLCH.
4. **Contrast** —
   - `--fg` on `--bg` ≥ 7:1
   - `--fg-body`, `--fg-muted` on `--surface` ≥ 4.5:1
   - `--fg-faint`, `--fg-locked` on `--surface` ≥ 3:1
   - accent-button foreground on accent ≥ 4.5:1
   - focus ring on `--bg` ≥ 3:1
5. **Separation** — within a theme, each WUBRG pip and each semantic colour is
   ≥ 0.10 ΔE (OKLab) from the accent, and each pip is ≥ 0.10 from every other
   pip.
6. **No stray literals** — a lint rule fails the build on hex literals in
   `src/**/*.{ts,tsx}` outside an allowlist (the theme blocks themselves, and
   any Scryfall-sourced colour data).

Rules 5 and 6 are the ones that keep the system honest over time. Rule 6 in
particular is what prevents the 672-hex debt from re-accumulating.

The suite is table-driven over the theme list, so a seventh theme is one row.

## Phases

| # | Phase | Output |
|---|---|---|
| 0 | Retire the character layer | ~15 surfaces render illustration-free; components remain in git |
| 1 | Token contract + test harness | Full token key list; Vitest suite green against the single existing theme |
| 2 | Tokenization sweep | Every remaining literal resolves through tokens (708 before Phase 0 removes the character-layer share); `.guided-banner` moved into the token block; lint rule enabled |
| 3 | Six theme blocks | Five new `[data-theme]` blocks, per-theme pips and semantics, all tests green |
| 4 | Font layer | Six display faces wired with `preload: false`; `--font-display` resolves per theme |
| 5 | Picker + persistence | Theme picker UI, cookie write, SSR read in root layout |

Phase 2 is the largest and the least interesting; it is also the one that
cannot be skipped or parallelised ahead of Phase 1, because the sweep needs the
token contract to sweep *toward*.

## Risks

- **Phase 2 is a wide, mechanical diff across 67 files.** Mitigation: the
  existing 1303-test suite is the regression net, and the sweep is
  token-for-hex with no behavioural change. Split by directory so review stays
  tractable.
- **Six display faces mean six sets of metrics.** A heading that fits in Cinzel
  may wrap in Metamorphous. Mitigation: design review covers the longest
  heading in the app under all six faces, mobile and desktop.
- **Chroma budgets may prove too tight for a theme to feel like its plane.**
  Mitigation: the budget is a written number, so relaxing it is an explicit
  decision with a diff, not a drift.

## Open items

- Amonkhet's display face stays **Cinzel**. Cinzel is Roman rather than
  Egyptian; the mismatch is accepted, as no Egyptian-flavoured face tested
  legibly at UI sizes.
- Duskmourn's accent-to-blue-pip clearance is resolved by the deepened pip
  above, but the exact ΔE floor (0.10) is a first proposal and may need
  tightening once all six themes are rendered side by side.
