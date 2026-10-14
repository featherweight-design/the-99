# Small polish — states matrix (R1)

Five independent items. Fixtures: Kaldheim unless named; the token grid at a 6-token deck (the staging median).

## 1 · Lock

| # | State | Phone (390) | Desktop |
|---|---|---|---|
| L1 | Bracket, locked nav | `Lock sm` 9×11, `--fg-locked`, inline before `Open once your cards are in`. | (no bracket) |
| L2 | Rail well foot | (no rail) | `Lock lg` 12×14, `--fg-locked`, above `LOCKED`. |
| L3 | First-run locked step card | `Lock lg`, **`--fg-locked`** (was `--border-strong`), at the card's end. | Same. |
| L4 | First-run page line | (hidden below `md`) | `Lock lg`, `--fg-locked`, before the line. |
| L5 | Deck lock, closed at rest | `Lock md`, `--fg-body`. | Same. |
| L6 | Deck lock, open at rest | `Lock md open`, `--fg-faint`. | Same. |
| L7 | Lock cards mode | closed `--accent`, open `--fg-muted`. | Same. |
| L8 | Toolbar button | `Lock md` with `ink` (`--fg-muted` / `--accent` as Done). | Same. |

All `aria-hidden`. The keyhole (md, lg) is cut out and shows the ground.

## 2 · Placeholder

| # | State | Rule |
|---|---|---|
| P1 | Empty field | Placeholder in `--fg-placeholder`; ≥ 4.82:1 on `--surface-sunken`, ≥ 4.55:1 on `--surface`, every theme. |
| P2 | Typing | Entered text `--fg`, unchanged. |
| P3 | Focus | Unchanged (`AFFIX_FOCUS` accent border and ring). |
| P4 | Disabled field | Unchanged. |
| P5 | Leading magnifier | Stays `--fg-faint` (icon, 3:1). |

## 3 · Motion

The timing table in `README.md` §3 is the state list. Per class: entrance, exit (≈ ⅔), reduced motion.

| # | Rule |
|---|---|
| M1 | Answer: no wait, 200ms `--motion-ease`. |
| M2 | Arrival: 100ms wait, 320ms `--motion-ease`. |
| M3 | Kept: card turn, carousel, sheet snap on `--motion-ease-out`. |
| M4 | E7 tile hover: art `brightness(1.06)`, 200ms, `hover: hover` only. Focus-visible draws the shipped ring and no brighten. |
| M5 | E8 count-up: first paint from 0, change from the old figure; under 10 static; AT reads the final value only. |
| M6 | E9 Show more: `100 + 40 × min(n, 11)` ms, 200ms opacity, cap 12. |
| M7 | Reduced motion: as README §3, Reduced motion. |

## 4 · Precon skeleton

| # | State | Phone (390) | Desktop |
|---|---|---|---|
| K1 | Pending, tiles view | Real back link + title; count bar; still chassis; one year bar; 6 tiles, 2-up, gap 10. | Same, with the list's `minmax(178px,1fr)` grid; 2 rows. |
| K2 | Pending, rows view | As K1 with 6 row shapes (40×56 thumb, two bars). | Same. |
| K3 | Reduced motion | Skeleton still (no breathe), as every skeleton. | Same. |
| K4 | Loaded | The page replaces the skeleton; no layout jump in the header. | Same. |
| K5 | Screen reader | One `role="status"`: `Loading precons`. | Same. |

## 5 · Token tile

Every state is inside the bordered frame. State line / makers line heights: 44 / 44 at 390, 30 / 28 from `md`.

| # | State | State line | Makers line | Fold (open) |
|---|---|---|---|---|
| T1 | Unowned (not known or not owned) | `Add to Shopping` | `from X and N more ⌄` | `I have one`, then makers |
| T2 | Joined | `✓ In Shopping` (accent tint) | same | `I have one`, then makers |
| T3 | Owned by upload or precon | `in your collection` | same | makers only |
| T4 | Owned by hand mark | `✓ I have one` (accent, unmarks) | same | makers only |
| T5 | Pending press | Pressed control at 60%, `aria-busy`, label kept | same | same |
| T6 | Refused press | As before, plus `We couldn’t save that. The token is unchanged.` (`--fg-locked`) under it | same | same |
| T7 | Orphan (no maker) | `Add to Shopping` (or ✓ In Shopping) | `from no card in this deck`, static | none |
| T8 | Fold open | as its state | chevron up, `aria-expanded="true"` | drawn inside the frame |
| T9 | Rules text attached | — | — | Text sits under the caption, max 3 lines |
| T10 | Row with mixed heights | Tiles stretch; spacer above the foot; feet align | | |
