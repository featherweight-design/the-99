# Addendum (2026-11-24): more commander art in the shelf (phone)

Hugh: "The life tracker on mobile should show more of the commander image in the shelf when possible."
Approved by Hugh 2026-11-24: **B, art fills the card**.

Canvas: https://claude.ai/artifact/Q7CZ4x9U7KCws3PrPGsVtq (Main, Phone).

## Change

On a phone, `DamageTab` (`src/components/tracker/sheet.tsx`) drew each commander damage card with a 56 px art strip; on a
sideways seat the card is tall and the rest of it was empty felt. The phone card now matches the tablet's `DamageArt`:

- `ArtStrip` covers the whole card (`absolute inset-0`); the card has `min-h-[176px]`.
- A fade over the art: `linear-gradient(180deg, rgba(0,0,0,.55) 0%, transparent 24%, transparent 36%, rgba(0,0,0,.88) 100%)`.
- The player name sits over the head (`px-2.5 pt-2`, 13.5 px semibold, text shadow).
- Each commander's name (12 px, `--fg`, text shadow) and stepper sit over the foot (`mt-auto`, `pt-12`).
- A partner deck keeps one stepper per commander, split by a `color-mix(--fg 18%)` line.

iPad and desktop (`DamageArt`) are unchanged. No copy changes. The other tabs are unchanged.

`scratch-gen/proposal.diff` is the working draft that rendered the boards (reference, not shipped code).
Option A (a 104 px strip) was drawn and not chosen; its shots stay on the Main board for comparison.

## Boards

| Board | What |
|---|---|
| Main | The screenshot's sideways seat and an upright seat: shipped, A, B; recommendation and Q1 (settled B) |
| Phone | 6 upright, 6 sideways, 3 sideways end, 2 upright: shipped, A, B |
