# Alternate printings from search · R2: pick a printing in place

Account 2, 2026-11-22. Status: **R2 approved by Hugh, 2026-11-22 (LGTM).** Canvas (Design type, R2 row under R1):
https://claude.ai/artifact/KSnSLykQbb42zUq5XKXCHf (R2 · Main, R2 · Phone, R2 · Desktop).

Hugh: on a phone, seeing another printing takes five steps (scroll down, open Set ▾, pick, scroll back up, pull the sheet
down). The ask was for something like ManaBox: a main printing shows, and you pick another right there to see it. R2 does that
with the shipped card details and tile style.

## Calls
1. **Printings strip** in card details opened from search (`browsePrintings`), at 2+ catalog printings. 48×67 thumbs
   (63:88, radius 4), 8px gap, set code under each (mono 10px). Head: `{n} printings` / `{n} printings · you own {k}`
   (faint mono caps, the shipped group-head style). The printing on screen gets an accent ring (2px `--bg` + 2px `--accent`).
   Phone: in the teaser under the price line (`md:hidden`, not in the full sheet). Desktop: under the title.
2. **Select = view in place.** Uses R1's preview state (`previewId`): the art, price and set line follow, nothing is stored,
   and it's forgotten on close or paging. Add to collection and Edit copies open at the printing on screen (shipped).
3. **Owned card:** ◆ your pick first, then the rest you own (`SET ×N`, accent), a hairline, then `otherPrintings`.
   Selecting one of yours views it and doesn't change your pick.
4. **The Set field goes back to one job.** Unowned: a plain field naming what's showing. Owned: the shipped your-pick picker
   over owned printings only. R1's browse inside the Set field (`22 printings ▾`, In your collection / Other printings
   groups, browse intro strings) is retired.
5. **Teaser height:** +98px (the strip, measured like the stand-ins door strip: `useOwnHeight` into `useSheetSnap`'s
   `doorHeight`). The card band shrinks to fit.
6. **Desktop:** a `▸` paddle at the right end while it overflows (`More printings`). Arrow keys move along the strip
   (roving tabindex). On the phone it scrolls with a swipe, and that swipe doesn't page cards (it's inside the sheet, not the band).
7. One printing: no strip, plain Set field + `The only printing` (shipped).

## Strings (DRAFT, /copy-review)
`{n} printings` · `{n} printings · you own {k}` · group `Printings of {card}` · thumb `{set}, number {n}[, {k} in your
collection][, your pick]` · `More printings`.

## Files
`R2-*.dc.html`, `canvas.json` (R1 + R2), `art/r2-*.webp`. `scratch-gen-r2/`: `proposal-r2.diff` (new `printing-strip.tsx`
+ card-modal / card-modal-sheet wiring; scratch only, uses `globalThis` hooks for SSR), `patch2.py`, `render.tsx`, `gen2.py`,
`shoot.mjs`. Same recipe as R1's `scratch-gen` (copy of main, drop @fwd-stack, npm install --ignore-scripts,
DATABASE_URL dummy for tsx).
