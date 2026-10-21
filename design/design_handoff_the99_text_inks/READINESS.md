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
- **The two grounds the six do not name also clear.** On `--elevated-hover` and `--surface-inset` the proposed inks read
  4.89 to 8.80 (Phyrexia's `--fg-faint` on `--elevated-hover` is the lowest).
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

This addendum is the accessibility fix: 308 accent text sites and 611 faint text sites move from under 4.5:1 to over it
in the themes that failed.

## About entry

None owed. A token value change is cosmetic, not a feature.

## Build plan

1. **Tokens.** In `globals.css`: the nine values, and `--accent-text` in all six blocks (`#5D8E85` in Phyrexia,
   `var(--accent)` in the other five). In `contract.test.ts`: `--accent-text` in the key list and in `ALIASES` for the
   five themes that alias it, and floors of 4.5:1 on all six grounds for `--accent-text`, `--accent-hover` and
   `--fg-faint` in every theme. `pnpm check:tokens` passes.
2. **Sites.** The `--accent` text sites move to `--accent-text` (on `origin/main` today: 271
   `text-[color:var(--accent)]` classes in 171 files and 48 inline `color: "var(--accent)"` styles in 32 files), with a
   guard that fails on a new one. Fills, borders, rings, the fit bar and marks stay on `--accent`.
