# Discovery R3 · property tables

Amonkhet values unless a theme is named. Every color is a theme token, so other themes follow (`r3/TourCard.dc.html`
holds Amonkhet, Kaldheim and Eldraine side by side). Copy is in `discovery-r3 · copy strings.ts`.

## The spotlight

| Property | Value |
|---|---|
| Scrim | `rgba(6,5,8,.66)` over the whole app: page, rail or tab bar, header |
| Cutout | The lit control's box, with room: 5px on a slot (rail or tab), 4px on the account button, 7–8px on a card or the banner |
| Cutout radius | 14 on a slot, 15 or round on the account button, 16 on the banner, 20 on a card |
| Ring | `0 0 0 2px accent/75%, 0 0 0 6px accent/20%` (R1's halo); the accent follows the theme |
| How it is drawn | One element at the cutout with `box-shadow: …ring…, 0 0 0 3000px <scrim>`; the lit control is drawn by the app, live |
| Under it | Inert: the app root takes `inert` while the tour runs; the card is outside it |
| Between steps | The cutout moves and resizes over 240ms on `--motion-ease-out`; the card crossfades over 160ms |
| Reduced motion | Both cut |
| Layer | Above every page layer and the toast's; below nothing |

## The tour card (`TourCard`)

| Property | 1280 | 390 |
|---|---|---|
| Width | 340 | 358 (16 a side) |
| Place | 16px beside the lit control, clamped 14px from the frame, never over the control | Docked 12px above the tab bar (bottom 100 with the locked bar) |
| Surface | `--surface-raised`, 1px `--border-strong`, radius 14, shadow `0 24 60` at 55% | the same |
| Padding | 14 16 14 18 | 14 16 16 |
| Kicker | IBM Plex Mono 10.5, `.14em`, caps, `--accent` | the same |
| Title | theme display face, 600, 19 / 1.2, `--fg` | 20 |
| Body | 13.5 / 1.55, `--fg-body` | 14 |
| Precon line (step 1) | as body, `Precons I own` in `--fg` 600 | the same |
| Footnote (step 1) | Mono 10.5, `--fg-faint` | the same |
| Picture (steps 2–4) | full width × 118, radius 9, 1px `--border-strong`, `object-fit: cover`; caption Mono 10, `--fg-faint` | × 128 |
| Theme grid (step 5) | 3 × 2, gap 8; cell padding 5, radius 9; miniature full width × 46 | 2 × 3, gap 6 / 8; cell min-height 48; miniature 52 × 38 beside the name |
| Selected miniature | `--elevated` behind, 1.5px `--accent` ring, 13px accent circle with ✓ at the top right | the same |
| Names | 10.5 / 500 `--fg`; plane Mono 8.5 `--fg-muted` | 12.5; plane 9 |
| Status (step 5) | Mono 10.5 `--fg-faint`, `role="status"`: `<name> applied.` | the same |
| Note block (step 6) | 1px `--border` top rule, 12 above; label Mono 10 caps `--fg-faint`; line 13 italic `--fg-muted`; `Read the note ›` 13 `--accent`, underlined at 55% | line 14; press 44 tall |
| Progress | Six diamonds, 6px (current 8px): current `--accent`, done accent/45%, to come `--border-strong` | the same |
| Next / Finish | Bone primary: `--fg` fill, `--bg` text, 12.5 / 600, 32 tall, radius 8 | 14, 44 tall, radius 10 |
| Back | Ghost: 1px `--border-strong`, `--fg`, 32 tall | 44 tall |
| ✕ | Bare, 32 × 32, `--fg-faint`, 13; focused: `--fg` with a 2px accent ring | 44 × 44, 15 |
| Role | `role="dialog"`, `aria-modal`, labelled by the title; focus starts on Next and is held in the card | the same |

## Step geometry, as drawn

| Step | 1280 cutout (x, y, w, h) | 1280 card | 390 cutout | 390 page scroll |
|---|---|---|---|---|
| 1 | step 1's card: 90, 186, 1162 × 304 | 912, 504 | 16, 14, 358 × 411 | 380 |
| 2 | Commanders slot: 12, 163, 38 × 38 | 74, 132 | Commanders tab: 158, 778, 75 × 52 | 0 |
| 3, 4 | Decks slot: 12, 247, 38 × 38 | 74, 214 | Decks tab: 307, 778, 75 × 52 | 0 |
| 5 | account button: 13, 750, 36 × 36 | 74, bottom 14 | 329, 23, 38 × 38 | 0 |
| 6 | banner: 90, 120, 1162 × 46 | 90, 184 | 16, 154, 358 × 104 | 0 |

These are the boards' numbers. The app places from the control's rect at run time, with the rules in the table above.

## First-run Home under the tour (as shipped, rebuilt)

| Element | 1280 | 390 |
|---|---|---|
| Locked nav | Rail: Home, Collection, then a dashed well (`--border-dashed`, radius 12) holding Commanders, Discover and Decks in `--fg-locked`, foot: a lock and `LOCKED` | Tab bar with the bracket `Open once your cards are in` over tabs 3–5 |
| Banner | Between the page line and the steps, 46 tall, `--surface-rail`, 1px `--border-strong`, radius 10, no ✕ (checklist) | 104 tall, the line wraps |
| Step 1 | `--surface-inset`, 1px `--accent`, radius 14; card fan, title, body, Upload (bone) and Paste (ghost), then the ways group | Stacked and centred; Upload and Paste full width at 44 |

## A nudge in a role cell (N1, N2)

| Property | 1280 | 390 |
|---|---|---|
| Slot | The caption row's right side, beside `rec N` (today a dash) | Under `rec N` |
| Text | Mono 10, `--accent` | Mono 9 |
| Words | `suggest swaps →` / `balance mana →` | `suggest →` / `balance →` |
| Cell | Becomes a `<button>`; border to `--border-strong` (the shipped interactive cell) | the same |
| Off, met, or under 99 | A dash, Mono 10 `--border-dashed` | Mono 9 `--border-strong` |
| Name | `Wipes, 1 of 2. Open Suggested changes.` | the same |

## The Money card's line (N3)

| Property | Value |
|---|---|
| Slot | The shipped `See the N in Shopping ⟶` press under the three figures |
| Text | Mono 11, `--warning`, 1px underline at 45%; the arrow 12 `--fg-muted` |
| Hit | 44 tall at 390, 28 at 1280 (shipped) |
| Words | `See the 15 in Shopping, 2 over $8` |
| Lands | Shopping view, scrolled to the first over row, its ⇄ haloed 2.4s (R2's `?tool=standins` landing) |

## An empty-state door (E1, E2)

| Property | /decks, Home (E1) | /commanders' banner (E2) |
|---|---|---|
| Place | Under the zero state's buttons and the buildable line, centred | At 1280, the end of the banner's line. At 390, its own line under the ribbon's text |
| Lead | 13.5 (14 at 390), `--fg-muted` | 14 (13 at 390), `--fg-muted` |
| Press | `--accent`, underlined at 55%, offset 3 | the same |
| Hit | 32 tall at 390 | 32 tall at 390 |
| Off | Absent | Absent |
