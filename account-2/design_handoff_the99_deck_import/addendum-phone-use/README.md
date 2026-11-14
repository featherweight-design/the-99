# Deck import addendum: a visible Use on phone search results (R1)

Account 2, 2026-11-14. An addendum to `design_handoff_the99_deck_import` (state 16, the resolution expander, and state 17,
"Nothing found"; design table §15/§16). It applies the Add panel's phone fix
(`design/design_handoff_the99_add_panel/addendum-phone-add/`, PR #2919) so the two searches behave the same. Phone
layout only, plus the touch-tablet case the Add panel ruling covers.

**Brief (Hugh):** when an import line can't be matched, its row opens a search. On a phone the active result (always row
1) shows only a bare `↵`. On a touchscreen that doesn't read as a button, so the most likely match is the hardest to pick.

**Shipped today** (`src/components/decks/resolution-expander.tsx`, `ResultRow`, the `trailing` cell around line 503):
the active row draws a mono caption, `↵` alone below md and `↵ use this` from md. Other rows draw a ghost `Use this`
(phone) / `Use this card` (md). The whole row is one `role="option"` and acts on click (`onClick={onUse}` on the `li`).

Boards: `Main` (calls, shipped vs P1 at 390), `States` (S1 to S4 and state 17 at 390), `Long-Name` (375), `Desktop`
(1100 fine pointer and 1024 touch tablet, main vs P1). Every frame is the shipped `UnresolvedGroup` with its
`ResolutionExpander`, rendered with the shipped CSS (Amonkhet theme) under the shipped deck page capture
(`public/about/pages/amonkhet/phone/p-deck-your-deck.webp`), with `scratch-gen/pu.diff` applied. Canvas:
https://claude.ai/artifact/DcUuBNXXrZnhkCikhwbwCf

## The change

On a phone, every result row draws the shipped ghost Use, the active row included. The `↵ use this` caption stays only
where a keyboard is likely: md and up with a fine pointer.

| Where | Active row's trailing cell | Other rows | Keyboard hint beside the result count |
|---|---|---|---|
| Phone (below md) | ghost `Use this` (was a bare `↵`) | ghost `Use this` (as shipped) | screen-reader only (as shipped) |
| md and up, fine pointer (desktop) | `↵ use this` caption (as shipped) | ghost `Use this card` (as shipped) | shown (as shipped) |
| md and up, coarse pointer (touch tablet) | ghost `Use this card` (was `↵ use this`) | ghost `Use this card` (as shipped) | screen-reader only (was shown) |

Class conditions as drawn (`scratch-gen/pu.diff`, the `v === "p1"` branch):

- The `li` gains `group`.
- The active row's caption becomes `hidden [@media(pointer:fine)]:md:inline … w-[96px]`, text `copy.activeRowHint` only
  (its phone `↵` span goes).
- Every row, the active one included, draws the ghost. The active row's ghost adds `[@media(pointer:fine)]:md:hidden`.
- The ghost's border, background and colour move from inline `style` to classes (`border bg-transparent
  border-[color:var(--border-strong)] text-[color:var(--accent-text)]`), so the pressed classes can override them:
  `group-active:bg-[color:var(--elevated)] group-active:border-[color:var(--accent)]`. Only `opacity` stays inline.
- The hint span (`id={hintId}`, around line 272) goes from `sr-only md:not-sr-only` to
  `sr-only [@media(pointer:fine)]:md:not-sr-only`. It stays in the tree as the field's `aria-describedby` everywhere.

The repo already uses `[@media(pointer:fine)]:md:` on this file's search field. Use the CSS, not `useKeyboardLikely()`,
for the reason the Add panel READINESS gives (its query is an OR, and it says no on the first server render).

## Own target, or a picture of the option's press?

**A picture of the press.** The ghost stays `aria-hidden` and is not a button.

- The whole result is one listbox option and already acts when selected: a tap anywhere on the row uses that card. That
  differs from the Add panel, whose row has two targets (the name opens card details, the Add cell adds). Here nothing
  in the row opens details, so there is no second target to keep apart, and the tap target is the full row: 63 tall at
  390 and 375, 60 at md. Both clear the 44 phone floor and the 36 tablet floor.
- A real button inside `role="option"` would be a nested interactive control, which a listbox doesn't allow, and a
  screen reader would stop on it as a second item. The shipped comment on the caption says the same.
- So the press shows on the ghost from anywhere on the row (`:active` on the option, `group-active` on the ghost).

**Screen readers: unchanged.** The field stays the combobox, `aria-activedescendant` points at the active option, each
option keeps its `aria-label` (name, type, colour availability, owned) and `aria-selected`. Selecting an option
(VoiceOver or TalkBack double-tap) fires the same `onClick` and uses that card. The keyboard hint is still the field's
description at every width.

## States

| State | Trigger | Trailing cell (phone) | Board |
|---|---|---|---|
| **Default** | any result row that isn't active | ghost `Use this`: 96 × 40, transparent, `1px --border-strong`, radius 7, `--accent-text` 13/600 (shipped) | States S1 |
| **Active** | row 1 while typing; ↑↓ with a keyboard | the same ghost `Use this`. The row's own `1px --accent` border marks it, as shipped; the ghost doesn't change | States S1 |
| **Pressed** | finger down anywhere on the row (`:active` on the `li`) | `--elevated` fill, `--accent` border. Tokens only: the Add panel addendum's pressed ghost | States S2 (active row), S3 (another row) |
| **Pending** | selecting Use; the resolve is saving | no look of its own. The shipped optimistic resolve drops the line in the same step (`useResolveOptimisticRow`), so the expander closes at once, the card joins the deck and the group's live note reads `That’s Aang, Swift Savior. 97 built now.` The shipped `opacity: 0.5` on pending never paints | States S4 |
| **Nothing found** (17) | no card matches the query | no results, so no action cell (shipped, unchanged) | States 17 |

No state is drawn without a trigger.

**Long name at 375** (`Long-Name`): line `Avabruck Caretaker / Hollowhenge Huntmaster` (one slash, so it didn't match), typed
`av`; the active row is `Avabruck Caretaker // Hollowhenge Huntmaster`. Today the bare `↵` takes almost no room, so the
active row shows more of its name and its `×1 owned`. With the ghost, the active row gives its name the same room
rows 2 to 4 already have: name and meta truncate with an ellipsis, as theirs do. Row height (63) is unchanged.

## Copy

No new strings, and no changed ones (`src/lib/copy/deck-import.ts`, `deckImportCopy.resolve`):

| Key | String | Where it shows now |
|---|---|---|
| `useShort` | `Use this` | every phone row, the active one included |
| `use` | `Use this card` | non-active rows at md; every row on a touch tablet |
| `activeRowHint` | `↵ use this` | the active row, md and up with a fine pointer only |
| `keyboardHint` | `↑↓ to move · ↵ to use the top match · Esc to collapse` | shown at md with a fine pointer; screen-reader only elsewhere |

## Does ↵ still appear on phones?

**No, in this list.** The active row's bare `↵` was the only one it drew on a phone (the hint was already screen-reader
only below md). The phone keyboard's return key still uses the top match, as shipped; the Use on that row now says it.

**Desktop is unchanged.** The 1100 fine-pointer render with the change applied is byte-identical to main (`Desktop`
board).

## Seen while drawing, not drawn

Read from the code, not reproduced in a browser: a refused resolve seems to bring the line back collapsed with no
message. The optimistic drop reverts, but the `MutationError` that would say why lives in the expander, which unmounted
with the line. This addendum doesn't change it; its own ticket if wanted.

## Generator

`scratch-gen/` (reference only, never shipped code), the Add panel addendum's method: copy main into a scratch folder,
drop the `@fwd-stack` devDeps, remove the tsconfig `extends` (add `jsx: react-jsx`), `pnpm install --ignore-scripts`,
`pnpm add -D postcss`, apply `pu.diff` with `git apply -p0` (the P1 branch plus scratch-only `globalThis.__fx`,
`__expand` and `__note` fixtures), copy the card art and `p-deck-your-deck.webp` (as `gen/bg.webp`) into `gen/`, then
`tsx gen/render.tsx`, `node gen/css.mjs`, and in `gen/`: `node wrap.mjs`, `node shoot.cjs` (phones, touch emulated;
desktop at 1100), `node shoott.cjs` (1024 touch tablet), `node shootd.cjs` (1100 crop), then `python3 pu.py <folder>` for
the boards (`blob` for the canvas's uploaded images). Card images are the repo's own art from earlier handoffs.
