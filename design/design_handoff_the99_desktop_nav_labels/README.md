# Desktop nav: say what each icon is

## R2 (current): the rail depends on the input
- **Pointer (`hover: hover`)**: the rail stays 62px with today's slots. A drawn label (28px tag, 12.5px Plex Sans 500, `--surface-raised`, 8px off the rail's edge, centred on the slot, aria-hidden) opens on hover after 400ms, then follows the pointer instantly from slot to slot (0ms while one is open or for 300ms after one closes). It closes 100ms after the pointer leaves, on pointerdown, Escape, scroll or resize. Keyboard focus opens it at once. `title` goes and `aria-label` stays.
- **Touch (`hover: none`)**: R1's 88px labelled rail, below.
- **First run**: locked slots get no label. Their note already names them. Home gets the label.
- `--rail-w` is 62px, or 88px under `(hover: none)`. Pointer content widths are unchanged; touch loses 26px.
- Canvas: H2 (label spec), T2 (timing), F3 (1300) and F4 (768) each show pointer beside touch, and E2 is the code delta. R1's sections now describe the touch rail.

## R1 (kept as the touch rail)

Canvas: `The 99 - Desktop Nav Labels.dc.html`. D1 compares the three shapes (1c chosen), S1 shows every slot in every state it already has, plus the locked well (2×), F1 is 1300 and F2 is 768 (each beside today), W1 is the content-column arithmetic, L1 is the first-run note in place, K1 covers keyboard, touch and AT, and E1 lists the code changes.
Frames: `ShellFrame.dc.html`, the signed-in Home from `components/home/dashboard.tsx` with its real breakpoints (two columns at 1180, row inset at 1000). Art in `art/` is reference only.
Brief: `docs/superpowers/design-briefs/2026-10-02-desktop-nav-labels.md` (branch `docs/brief-desktop-nav-labels`).

## The call: a third shape
**The labelled rail.** The rail takes the phone tab bar's slot as it is: the 19px icon over a 9px mono label (0.06em), 3px gap, in a **72 × 52** slot with radius 12. The rail goes from 62 to **88px**. Nothing is hidden, so nothing is revealed: there's no hover label, focus label, delay, toggle or remembered state. `title` goes.

Why this and not the brief's two:
- **Expanded (208px)** takes 146px from every page (Home at 768 would be 560px). It needs a collapse toggle to survive md, and collapsed it's today's unlabelled rail again.
- **Hover/focus label (62px)** costs no width, but you still have to point to learn what a slot is. A touch tablet at md gets nothing, keyboard readers tab through five slots to read five words, and in first run the label collides with the lock note at the same anchor.
- **Labelled (88px)** costs 26px and changes no layout. Mouse, keyboard and touch all get the same thing, and it matches the phone because it's the same slot.

The record ("a 62px rail with labels is not a third option") holds. This isn't 62px. It gives the labels the room the record said they needed, and keeps the icons.

## Measurements
- "Commanders" and "Collection" are 59.4px at 9px / 0.06em, which leaves 6.3px either side in 72. The rail is 72 + 2 × 7.5 + the 1px hairline = 88.
- States are unchanged: rest `--fg-faint`, no fill. Hover `--elevated-hover`. Active `--elevated` + `--fg`. Pending `--elevated-hover` + `--fg` + the pip, centred at `bottom: 1px` (the tab slot's value). Focus is the global 2px `--accent` ring at 2px offset. The label always takes the slot's colour.
- Locked (`RailLock`): the well goes from 48 to 80px wide, radius 12 → 14, padding 4/3/9. Slots are 72 × 52, `--fg-locked` icon and label, never a fill. The padlock and LOCKED foot are unchanged, and so is the note and its placement (`railPlace` measures the rail).

## Content column
`main` is `flex-1` beside the rail, so it loses exactly 26px at every width: 1300 goes from 1238 to 1212, and 768 from 706 to 680. The viewport breakpoints (1180, 1000) don't move. Add `--rail-w: 88px` to `globals.css` next to `--tabbar-h`, and point the rail and the per-page column arithmetic (commanders, decks, deck page) at it. One thing to check: an md page with a fixed side column (the 262px filter column) loses the 26px from its list.

## Out of scope
The phone tab bar, the account menu, the order of destinations, and the pip's centring bug (H5, drawn centred here).
