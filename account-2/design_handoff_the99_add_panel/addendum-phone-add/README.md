# Add panel addendum: a visible Add on phone search results (R1)

Account 2, 2026-11-14. An addendum to `design_handoff_the99_add_panel` (Result row, README §Component notes) and to
small items 2 item 6b (the two-cell grid row). Mobile only; desktop is unchanged.

**Brief (Hugh, from testing on a phone):** tapping the first quick-add result opened its card details. It added the card
only with a tap right on the `↵`. On a touchscreen the `↵` doesn't read as a button, so the most likely card was the
hardest one to add.

**Shipped today** (`src/components/decks/quick-add-bar.tsx`, the row's `trailing` cell): the active row (always row 1
while typing) draws a mono caption, `↵` alone below md and `↵ add` from md. Other rows draw a ghost `Add`. The name
cell (thumbnail and name, `flex-1`, full row height) opens card details, so on a phone most of the active row opens
details and the only add target is a bare glyph.

Boards: `Main` (calls, shipped vs P1 at 390), `States` (S1 to S4 at 390), `Long-Name` (375), `Desktop` (1300,
unchanged). Every frame is the shipped quick-add bar rendered with the shipped CSS (Amonkhet theme) over the shipped
About capture of the deck page, with `scratch-gen/pa.diff` applied. Canvas: https://claude.ai/artifact/HjdgWQqF4xrrnHXYVzbJPT

## The change

On a phone, every result row draws the ghost `Add`, the active row included. The `↵ add` caption stays only where a
keyboard is likely: md and up with a fine pointer.

| Where | Active row's trailing cell | Other rows | Keyboard hint under the list |
|---|---|---|---|
| Phone (below md) | ghost `Add` (was a bare `↵`) | ghost `Add` (as shipped) | hidden on a coarse pointer (was shown) |
| md and up, fine pointer (desktop) | `↵ add` caption (as shipped) | ghost `Add` (as shipped) | shown (as shipped) |
| md and up, coarse pointer (touch tablet) | ghost `Add` (was `↵ add`) | ghost `Add` (as shipped) | hidden |

Class conditions as drawn: the caption is `hidden [@media(pointer:fine)]:md:inline`; the active row's ghost adds
`[@media(pointer:fine)]:md:hidden`; the hint `<p>` adds `[@media(pointer:coarse)]:hidden`. The repo already uses
`[@media(pointer:fine)]:md:` on the field's text size, and `useKeyboardLikely()` in `search-desktop.tsx` is the same
idea in JS if engineering prefers it (it says no on the server's first render, so CSS avoids a flash).

## States

| State | Trigger | Trailing cell (phone) |
|---|---|---|
| **Default** | any result row that isn't active and isn't in the deck | ghost `Add`: 56 × 44, transparent, `1px --border-strong`, radius 7, `--accent-text` 13/600 (shipped) |
| **Active** (S1) | row 1 while typing; ↑↓ with a keyboard | the same ghost `Add`. The row's own `1px --accent` border marks it, as shipped; the button doesn't change |
| **Pressed** (S2, S3) | finger down on the Add cell (`:active`) | `--elevated` fill, `--accent` border. Tokens only: the segmented switch's `pressFill` and the ghost's hover border |
| **Pending** (S4) | selecting Add; the add is saving | `✓ In deck` at once (the optimistic `applied` from `useDeckMutation`), held until the server answers; the thumbnail greys as in-deck rows do |
| **Refused** | the server declines the add | back to the ghost `Add`, with the shipped `MutationError` line under the row (unchanged) |
| **In deck** | the card is in the deck | `✓ In deck` in `--success`, `aria-disabled` (shipped, unchanged) |

Pending has no separate look. The shipped `opacity: 0.5` on `isPending` can't show: `applied` turns true in the same
transition and its branch wins. No state is drawn without a trigger.

The two targets stay as 6b shipped them: the name cell opens card details, the Add cell (56 × 44) adds, and a tap
anywhere else on the row still adds.

**Long name at 375** (`Long-Name`): `Avabruck Caretaker // Hollowhenge Huntmaster` with `Creature — Human Werewolf ·
×1 owned` truncates exactly as it does today. The active row's trailing cell was already `min-w-[56px] min-h-[44px]`,
so the button fits where the glyph sat. Row height (56), the meta line and the thumbnail are unchanged.

## Copy

No new strings, and no changed ones (`src/lib/copy/decks-builder.ts`, `addPanelCopy.quickAdd`):

| Key | String | Where it shows now |
|---|---|---|
| `rowAdd` | `Add` | every phone row; non-active desktop rows |
| `rowAddActive` | `↵ add` | the active row, md and up with a fine pointer only |
| `rowInDeck` | `✓ In deck` | in-deck and pending rows (unchanged) |
| `keyboardHint` / `keyboardHintMove` … `keyboardHintDismiss` | `↑↓ to move · ↵ to add · Esc to dismiss` and the A-variant runs | under the list, not on a coarse pointer |

Spoken labels are unchanged: the Add cell is still `aria-label="Add"` (or `✓ In deck`) with the row's summary as its
description; the visible button stays `aria-hidden`, as the ghost on other rows already is.

## Does ↵ still appear anywhere on phones?

**No, in the quick-add bar.** Two places drew it on a phone: the active row's bare `↵` (now `Add`) and the keyboard
hint under the results, which phones showed whenever the list was short enough to scroll to it (two results show it
at once; see `Long-Name`, shipped). That hint now hides on a coarse pointer. The phone keyboard's return key still
adds the top match, as shipped; it just isn't advertised, because the Add on that row says it.

**Elsewhere, not in scope:** the deck import's unresolved-card list (`resolution-expander.tsx`, around line 512)
draws the same bare `↵` on a phone's active option. Same problem; its own round if wanted.

## Seen while drawing (not changed)

- Desktop's `✓ In deck` wraps to two lines in its `w-[56px]` column (visible on `Desktop`). Shipped, left as is.

## Generator

`scratch-gen/` (reference only, never shipped code): copy main into a scratch folder, drop the `@fwd-stack` devDeps,
remove the tsconfig `extends` (add `jsx: react-jsx`), `pnpm install --ignore-scripts`, apply `pa.diff` (the P1 branch
plus a scratch-only `fx` prop that feeds fixed results), then `tsx gen/render.tsx`, `node gen/css.mjs`,
`node gen/wrap.mjs`, `node gen/shoot.cjs` (phones, touch emulated) and `node gen/shootd.cjs` (desktop), and
`python3 pa.py <folder>` for the boards (`blob` for the canvas's uploaded images). Card images are the repo's own
art from earlier handoffs.
