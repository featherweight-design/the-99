# Readiness — text inks addendum R1

**Verdict: 🟢 Green.** Every value is specified, every figure reproduces with the repo's own functions, and the
existing theme gates all hold with the proposed values applied. Nothing is left for Design.

Audited 2026-10-21 against `origin/main` at the time of the audit, by lane 9b.

## Against the prompt (prompt 4, `boards/design-prompts-2026-10-18.md`)

| Asked | Answered |
|---|---|
| `--accent` as text: lift each theme's value, or rule a separate text accent if a lift costs the hue | **Closed.** Kaldheim lifts in place; Phyrexia gets `--accent-text`, with board 2 showing why (an in-place lift fails the 0.10 ΔE floor against `--success`; a hue turn that clears it costs 9.6° and doubles the chroma). |
| `--accent-hover` fails once (Kaldheim on `--elevated`, 4.46) | **Closed.** Lifted to `#7CA6EA`, 5.47. Phyrexia's hover is lifted too, to keep its step over the new text ink. |
| `--fg-faint`: read (4.5:1) or decorative (3:1, read text moves to `--fg-muted`)? | **Closed: read.** Lifted to 4.5:1 on all six grounds in all six themes; no site moves. |
| Floor 4.5:1 for text on all six solid grounds | **Closed.** The weakest ground is `--elevated` for every value; the lowest proposed figure is 4.55 (Low Sun `--fg-faint`). |
| Keep each theme's hue and its distance from `--warning` and the mana colors | **Closed.** No value moves more than 1.1° of hue. See the measurements below. |
| Revised `TOKEN-TABLE.md` and `tokens.json` in the themes handoff | **Not delivered, not blocking.** The ledger in `README.md` is the record of every changed value, and the build pins them in `globals.css` and `contract.test.ts`. |

## Re-measured with the repo's functions

`contrast()`, `deltaEOk()`, `hueOk()` and `oklab()` from `src/lib/theme/color.ts`, on the theme blocks
`parseThemeBlocks()` reads out of `src/app/globals.css`.

- **Every shipped value in the ledger matches `globals.css`.** All ten rows.
- **Every proposed figure on all six grounds reproduces to two decimals.** All 60 pairs.
- **The two grounds the six do not name also clear.** On `--elevated-hover` and `--surface-inset` the ten changed inks
  read 4.89 (Phyrexia's `--fg-faint` on `--elevated-hover`) to 6.95 (Kaldheim's `--accent-hover` on `--surface-inset`).
- **ΔE from `--warning`** for each proposed value: 0.151 (Canopy `--fg-faint`) to 0.251 (Kaldheim `--accent`).
- **Kaldheim's `--accent` from `--u`:** 0.101 shipped, 0.155 proposed, as the ledger says.
- **Phyrexia's `--accent-text` from `--success`:** 0.088, under the 0.10 floor the contract asks of `--accent`. This is the
  board 2 ruling, not an oversight: the text ink is never a fill and sits 40° of hue from `--success`. The build must keep
  `--accent-text` out of the ΔE gate that `--accent` is held to, and say why where it does.

## The existing gates with the values applied

The nine changed hexes written into a scratch copy of `globals.css` (no `--accent-text` yet), then
`pnpm vitest run src/lib/theme src/app/globals.test.ts`: **3,487 passed, 0 failed.** That covers the contract (chroma
caps, every contrast floor including `--bg` on the accent button and the focus ring, the pip and semantic ΔE gates),
the credit chip and the bracket marks.

## Tokens

One new token, `--accent-text`. Nine changed values. No new surface, component, layout or copy.

## Accessibility

This addendum is the accessibility fix: the accent text sites (343 today) and the faint text sites (611 at the audit) move from under 4.5:1 to over it
in the themes that failed.

## About entry

None owed. A token value change is cosmetic, not a feature.

## Build plan

1. **Tokens.** In `globals.css`: the nine values, and `--accent-text` in all six blocks (`#5D8E85` in Phyrexia,
   `var(--accent)` in the other five). In `contract.test.ts`: `--accent-text` in the key list and in `ALIASES` for the
   five themes that alias it, and floors of 4.5:1 on all six grounds for `--accent-text`, `--accent-hover` and
   `--fg-faint` in every theme. `pnpm check:tokens` passes.
2. **Sites**, as independent sweep PRs of about 20 files each (not stacked: `--accent-text` is `--accent` in five
   themes, so any order is safe). On `origin/main` on 2026-10-21 there are 343 accent text sites in 204 files: 273
   `text-[color:var(--accent)]` classes, 48 inline `color: "var(--accent)"` styles and 22 `text-accent` utilities, which
   move to `text-[color:var(--accent-text)]`, `color: "var(--accent-text)"` and `text-accent-text`. Fills, borders,
   rings, underline and caret colors, the fit bar and marks stay on `--accent`. PR 1 adds the guard as a ratchet: a
   per-file allowance of today's sites, so a NEW site fails at once, and each sweep deletes its files' entries. The last
   sweep leaves the allowance empty, which makes the guard absolute.

   | Sweep | Files (under `src/`) |
   |---|---|
   | S1 | `components/decks/`, sorted paths `all-brackets-sheet` to `change-commander-review` (17) |
   | S2 | `components/decks/`, `clear-auto` to `games-panel` (17) |
   | S3 | `components/decks/`, `got-it-receipt` to `precons/precon-door` (17) |
   | S4 | `components/decks/`, `precons/precon-pick-view` to `strip-rationale` (17) |
   | S5 | `components/decks/`, `suggestion-card` to `version-history` (17) |
   | S6 | `components/collection/` (20) |
   | S7 | `components/admin/`, `public/`, `legal/`, `help/` (20) |
   | S8 | `components/commanders/`, `cards/` (20) |
   | S9 | `components/social/`, `intake/` (20) |
   | S10 | `components/rule-zero/`, `ui/`, `about/`, `credits/` (20) |
   | S11 | everything else: `components/shell/`, `sets/`, `home/`, `wishlist/`, `join/`, `card-search/`, `scan-lab/`, `discovery/`, and `app/` (19) |
