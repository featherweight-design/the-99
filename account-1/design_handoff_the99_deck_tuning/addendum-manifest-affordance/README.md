# Handoff: Suggested changes manifest restyle (deck tuning addendum)

Lands in `design/design_handoff_the99_deck_tuning/addendum-manifest-affordance/`.
Brief: `docs/superpowers/design-briefs/2026-09-28-tuning-manifest-affordance.md` (branch `docs/tuning-manifest-brief`).

## Overview
On the Analysis tab's **Suggested changes** panel, the four manifest rows looked like checkboxes, and Hugh pressed them on desktop and on the phone. They are a read-only disclosure of what a run sends the model. This restyle has one job: nothing in the manifest may look pressable. There is no feature change. The copy, the counts, the states (`STATES-tuning-panel.md` rows 2–4) and the collapsed `read from …` line all stay as they are.

## About the design files
`The 99 - Deck Tuning · Manifest Addendum.dc.html` is a design reference built in HTML and opens directly in a browser, next to `support.js`. Don't ship it. Recreate it in `src/components/decks/manifest-rows.tsx` using the codebase's Tailwind and CSS-variable patterns.

## Fidelity
The frames are high fidelity: exact tokens, sizes and copy. They are drawn at 1300 (the `md` and up rules) and 390 (the base rules).

## Frames
- **M1**: before and after, one done row and one pending row.
- **D1 / P1**: Ready, unread, nine games.
- **D2 / P2**: Ready, unread, no games logged. This is the dashed row with *Log a game →*, the list's only control.
- **D3 / P3**: Generating, ticking, `2 of 4 read`.
- **D4 / P4**: Results, collapsed to the mono line. This state is unchanged and is drawn only for context.

## Spec: `manifest-rows.tsx`

### List
- `<ul className="mt-[14px] flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>`
- `gap` goes from 6px to 0. The rows are separated by rules, not by space.
- When there are no games, the dashed row sits **above** the ruled list with an 8px gap. It is not inside the ruled list. One way to do this: render the dashed row, then a separate ruled `<ul>`, inside a wrapper with `flex flex-col gap-[8px]`.

### Read row (`kind: "read"`)
| Property | Phone (base) | Desktop (`md`) |
|---|---|---|
| min-height | 36px | 32px |
| padding | `py-[8px] px-[2px]` | `py-0 px-[2px]` |
| gap | 10px | 10px |
| border | `border-bottom: 1px solid var(--border)` only | same |
| radius / background | **none**. The `--surface` / `--elevated` fills go | same |
| label | 12.5px / 1.35. `--fg-body` pending, `--fg` done | 13px |
| count | IBM Plex Mono 10px, `--fg-faint`, `flex-none`. Absent while pending during a run (unchanged) | 11px |
| cursor / hover | `cursor-default`, no hover state | same |

The label is `min-w-0 flex-1` and wraps instead of clipping.

### Status mark (replaces `Box`)
The mark sits in a 14px-wide slot (`w-[14px] flex-none flex justify-center`) with **no border, no radius and no size box**. It keeps `aria-hidden`.
- **Pending** (both Ready and a read that hasn't landed): a 5px circle, `background: var(--fg-locked)`, `rounded-full`.
- **Read**: `✓`, 12px, weight 600, `color: var(--accent)`.
- **Empty-games row** (never read): `–`, IBM Plex Mono 12px, `--fg-locked`.

Not colour alone: the shape changes from dot to ✓, and the label steps from `--fg-body` to `--fg`.

Accessibility: after the label, add sr-only text reading `read` when done and `not read yet` when pending. Don't add a live-region message per row; the rule in STATES stands.

### Empty-games row (`kind: "noGames"`)
- Keep `1px dashed var(--border-dashed)` and `rounded-[8px]`.
- Padding becomes `pl-[12px] pr-0`, so the button runs flush to the row's right edge.
- Min-height: 46px on the phone, 40px on desktop. That is the button's height plus the border, and the row grows from 38 to 40px at `md`.
- Mark: `–`, as above.
- Label `Your games` is 12.5px on the phone and 13px on desktop, `--fg-faint`. `none logged` is mono 10 / 11px, `--fg-faint`. On the phone they stack; at `md` they sit on one row, as today.
- **`Log a game →` button**: `flex-none flex items-center h-[44px] md:h-[38px] px-[12px] text-[12.5px] font-semibold text-[color:var(--accent)] hover:underline`. Remove `py-[12px]`, which gave a height of about 43px. **The button gets no border or outline of its own**: the dashed row is the only border there. Keep a visible focus ring for keyboard users.

### Unchanged
`tuning-panel.tsx`, `manifestRows`, `readSteps`, the copy in `deck-tuning.ts`, `3 of 4 read`, the panel's accent border while reading, and `ReadFrom`.

## Tokens used (Amonkhet default; Kamigawa values in the DC)
- `--border` `#2B241B`
- `--border-dashed` `#494037`
- `--fg` `#EDE6D8`
- `--fg-body` `#C0B8A6`
- `--fg-faint` `#8B8270`
- `--fg-locked` `#6E6654`
- `--accent` `#CF8745`

Fonts: IBM Plex Sans (labels), IBM Plex Mono (counts, the dash).

## Files
- `The 99 - Deck Tuning · Manifest Addendum.dc.html`: the frames. The Tweaks panel has a theme switch.
- `support.js`: the runtime the DC needs to open locally.
