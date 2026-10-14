# The 99 — Card details as a carousel (design handoff, R1, H23)

**Source of truth:** `docs/superpowers/design-briefs/2026-10-02-card-details-carousel.md` (main).
Read with it: `src/components/cards/card-modal.tsx` (phone header :1492–1590, desktop art column
:1592, footer :1908–1944, live region :1954, zoom :1960+), `card-detail-provider.tsx` (paging
:944–951, stacked :898 / :994, provider live region :873), `globals.css` (`anim-card-turn` :742),
`design_handoff_the99_card_detail/README.md` decision 2, and `design_handoff_the99_card_surfaces/` (front-face reset).

Files: `The 99 - Card Carousel.dc.html` (canvas; Tweaks switch the theme), `PhoneHero.dc.html` (R2 phone),
`PhoneSheet.dc.html` (R1 phone, superseded), `DesktopModal.dc.html`, `STATES-card-carousel.md`,
`card-carousel · copy strings.ts`, `READINESS.md`, `brand/`.

**Status: LGTM (Hugh, 2026-10-03).** Phone = R2. Desktop = R1. The phone zoom retirement is confirmed.

**One line:** *the details view pages at both widths with its neighbors in view; the zoom stays a look.*

## R2: phone, card first (Hugh, 2026-10-03)

Canvas frames H1–H6 (`PhoneHero.dc.html`). These supersede R1's phone frames P1–P7. **Desktop R1 stands.**

| | Ruled |
|---|---|
| Layout | Card 320×447 at y 64, centred. Neighbors 236×330 at .5, 12px gap, 23px showing. A bottom sheet in `--surface-rail` with a radius-18 top and a grabber. The counter and ✕ plates are unchanged. |
| States | **Teaser** (sheet top 532, 280 tall, filled to the 34px home inset; on every open and every page) and **full** (sheet top 64). Two snaps, nothing between. Release snaps to the nearer state or follows the flick. |
| Teaser | Name, type, cost, price tag, set · number, copies owned, three lines of oracle text with a fade, and an `All details` button pinned above the 34px home inset; a short text leaves its slack above the button (44px; the keyboard and screen-reader route). |
| Full | The shipped details column in a scrolling sheet. The printing picker lives here, so **the 180px header and the compact 72px header both retire**. |
| Gestures | Horizontal on the card band (y 0–532) pages. Vertical on the band or the sheet moves the sheet. R1's 10px / 1.5× lock. **In the full state paging is withheld**; the counter stays as the locator. |
| Escape | Full → teaser → close. The zoom keeps the first rung while it's open. |
| Zoom | **Retired on the phone**, along with its `Tap to zoom` hint: the 320 card is already the zoom's 318. A tap on the card does nothing in the teaser and returns to the teaser from full. Two-faced cards keep the shipped turn plate on the card's bottom-right corner. Desktop zoom unchanged; decision 2 stands. |
| Teaser price | The shipped plate (`$1.55 from $0.26`) moves from under the art into the teaser, beside the availability line (`×5 · ◆ short`). |
| Sizing | Card width = `min(320px, (100dvh − 85px − 280px) × 0.7159)` (85 = 64 above the card + 21 below). The teaser is a fixed 280. Stacked sheets use their own height. |
| Motion | Sheet snaps take 240ms `cubic-bezier(.2,.7,.2,1)`; paging keeps R1's glide. Reduced motion: swaps, but drags still track the finger. |
| Reopens | The full-card handoff's decision 3 (262→180), **on the phone only**. |

R1 calls that R2 replaces on the phone: 2 (peek size), 2b (compact header), and 3 (the swipe zone is now the card band, not a 350px header). The rest carry over unchanged: ends, one/two, screen reader, stacked, About.

## The calls

| # | Open item | Called |
|---|---|---|
| 1 | Where | **Details view, both widths.** The zoom does not page. **Decision 2 is not reopened.** Hugh offered the zoom as a fallback, and the details view doesn't need one. "A look, not a browser" stays whole: no swipe, no arrow keys, no neighbors in the zoom. It opens on the current card. |
| 2 | Neighbor | **The whole card, scaled down.** Phone: 128×178 at opacity .5, 14px from the 180px card, cut by the screen edge (91px shows). Desktop: 168×235 at .55 on the backdrop, 24px off the modal, with the name under it in 12.5px `--fg-muted`. |
| 2b | Compact 72px | **Peeks and swipe withheld; the counter stays, off its plate.** It becomes a mono 11px `--fg-body` line under the type line. The top-left plate (y 22–54) would cover the thumb (y 44+), and moving the thumb would change shipped geometry. `compactArt` exists only while the picker is open past the overflow threshold. Paging resets the region and its query (provider :903), so a swipe there would throw away work. Closing the picker brings the peeks back. |
| 3 | Swipe | **The art header only.** The strip moves; the sheet does not. Lock at 10px. Horizontal if \|dx\| > 1.5·\|dy\|: pages, and cancels the press under it. Otherwise native vertical scroll. Commit at 25% of the header width (98px) or a flick ≥ 0.5px/ms with dx ≥ 24. Taps keep their jobs: centre card → zoom, peek → page, turn control → turn. Drags that start within 16px of the screen edge go to the system. |
| 4 | Desktop | **Footer kept as shipped** (`‹ Prev · N of M · Next ›`). The neighbors are a view and a shortcut. They need 1252px of viewport (820 + 2×(168+24+24)) and drop below it. **← → page** while focus is anywhere in the dialog except the printing search input, the printing radiogroup, or the zoom. |
| 5 | Ends | **Stop.** Wrapping a sorted list jumps Z→A without a word. The missing side draws nothing. Phone drag past an end: 0.3×, max 40px, springs back. Desktop controls stay drawn at .4 and are `aria-disabled` (not `disabled`), so focus survives reaching the end. |
| 6 | One / two | **One: no carousel.** No peeks, no counter, no drag. The desktop footer drops `1 of 1` and both dead controls, so the link stands alone. **Two:** one peek, `1 of 2`, stops both ways. |
| 7 | Motion | **Slides, shorter than the flip.** A 240ms glide on the flip's `cubic-bezier(.2,.7,.2,1)`. 320 is right for an object turning, but paging is pressed in runs. Desktop: the art enters 24px from its side over 200ms. A press mid-glide finishes the glide and starts the next; it never queues. **Reduced motion: a swap.** The drag still tracks the finger, because direct manipulation isn't animation. |
| 8 | Screen reader | **Name, then position:** `Rhystic Study, 12 of 48`. It goes in the **provider's** live region (:873), because the modal is keyed on oracle id and its region remounts empty on every page. Focus stays on the control that paged. First open announces nothing new; the visible counter covers it. An arrow key at an end says `First card in this list` / `Last card in this list`. |
| 9 | Stacked | **Both confirmed.** The top card pages its own list, with peeks in its own header (P7). The held card draws nothing (`onPrev={null}`), and arrow keys reach only the top layer (`covered` is inert). |
| 10 | About | **Not drawn.** I'd fold it into the existing card details entry. Hugh decides. |

## What changes from shipped

- Phone: a counter plate (top-left, the ✕ plate's twin), two peeks, and the swipe. Before this, the phone could not page at all.
- Desktop: neighbors on the backdrop at ≥ 1252px, and arrow keys. A list of one loses `1 of 1`. The end controls become `aria-disabled`.
- Nothing about the zoom changes.

## Notes for engineering

1. **Motion must live above the keyed modal.** `CardModal` remounts per card, so the strip and the
   desktop art slide-in belong to a wrapper in the provider. That wrapper is also where the
   arrival announcement goes.
2. **Peeks need art.** The provider holds ids. Openers that already ship images (Collection, set
   grid, decklist) pass `{oracleId, imageUri, colorIdentity}`. Where only an id arrives, the peek
   draws `identityGradient`; where even identity is unknown, an `--elevated` plate at 63/88, no text.
   Prefetch the two neighbors' detail on arrival. Today nothing reads ahead.
3. **Focus across the remount.** Restore focus to the same role: Next, Prev, peek, or whatever held
   it for a key press. Otherwise the remount drops it to the ✕.
4. **Backdrop vs neighbor.** The backdrop's click-to-close stays everywhere but the neighbor buttons.
5. **`?card=`** on `/collection` follows paging through `replaceState`, as shipped. No history entry.
6. Copy: `Previous card` / `Next card` move from inline strings to keys (see the copy file).

## Ledger

1. **Peek contrast.** A .5 card on the wash is decorative, and its name lives in the accessible
   name. Desktop names are `--fg-muted` on the dimmed backdrop. Measure it in build.
2. **1252px threshold** is arithmetic on the 820 modal. If the modal width moves, so does this.
3. Swipe constants (10px lock, 1.5 ratio, 25%, 0.5px/ms) are starting values. Tune them on a device.
