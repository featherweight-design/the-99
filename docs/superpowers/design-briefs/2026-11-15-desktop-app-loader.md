# Brief: Desktop app loader

**For:** Claude Design. **Approved:** Hugh, 2026-11-15.
**Existing handoff to extend:** `design/design_handoff_the99_app_loader/` (D3, READINESS Green). Where the shipped code and
the handoff disagree, the code wins.

## The problem, in Hugh's words

The installed app's launch animation plays on the phone. Hugh wants it on the installed desktop app too: opening The 99
from the dock or the Start menu should land the same way.

## What exists today

- **The loader**, shipped in PR #2871: `src/components/shell/launch-loader.tsx` (the overlay, mounted in the signed-in
  branch of `src/components/shell/shell.tsx`), its keyframes in `src/app/globals.css`, and the head script in
  `src/lib/pwa/launch-detect.ts` that marks `<html data-launch>` before first paint.
- **What shuts desktop out:** `launch-detect.ts` returns early unless `(pointer: coarse) and (max-width: 767px)`. A
  desktop standalone window and a tablet get nothing. The landing spot is the phone header's
  `Crowned99 variant="mobile-header"` at a fixed point (66.75, 24.75), measured from a 390 frame.
- **The desktop target:** at `md` and up the shell draws the rail, whose lockup is `Crowned99 variant="rail-62"`
  (`src/components/shell/nav.tsx`, sizes in `src/components/marks.tsx`). The handoff's READINESS already sketched flying to
  the rail's lockup on desktop; the build chose phone only.
- **Manifest:** `src/app/manifest.ts`, `display: "standalone"`, `background_color` `#14110E`.

## Locked facts

- Same gates as the phone: installed app only, first document load of a session, signed in, normal motion. Never in a
  browser tab, never on a reload or navigation inside a session, none with reduced motion.
- Same mark, card, flip and crown timeline as D3 (about 1.66 s). Low Sun always; Home arrives in the saved theme.
- Home renders underneath the whole time; the overlay never holds the app.
- No new switch, no copy, no About label.

## Open calls for Design

1. **Landing:** the mark lifts into the rail's `rail-62` lockup (top-left of a tall rail, not a header). Draw the path and
   the numeral's settle at that size.
2. **Window sizes:** a desktop window can be anything from about 768 wide to a large monitor. Does the card stay at
   260x363 centered, or scale with the window? Draw 1280x800 and one large size.
3. **The start:** desktop has no centered icon splash like the phone's (the window opens plain, at most filled with the manifest
   color). Does the loader start from the icon at 128 px, or from the card?
4. **Home fade-up:** on desktop Home rises beside the rail rather than under a header. Confirm the rise and when the rail
   appears.
5. **Tablet:** a coarse pointer at `md` and up draws the rail. Say whether it follows desktop.

## Out of scope

- Any change to the phone loader, the iPhone startup images, or `LoadingScreen`.
- Signed-out launches, browser tabs, and an in-app (navigation) loader.
