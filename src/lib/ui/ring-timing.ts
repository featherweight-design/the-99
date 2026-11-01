// The one timing for every "this changed" ring (small items 9, A6a; board Add-Card R1 to R5): a 2s hold, then a 400ms
// ease-out fade, so the eye catches the ring leaving. Reduced motion skips the fade: the ring cuts at 2s.
//
// The hold is the timer's (a ring's owner clears it after RING_HOLD_MS). The fade is the stylesheet's: the ringed
// element carries `.ring-fade` (globals.css), a box-shadow/outline-color transition of `--ring-fade-ms` that only
// exists under `prefers-reduced-motion: no-preference`. So clearing the ring at the hold is the whole mechanism.
// `RING_FADE_MS` mirrors that variable; ring-timing.test.ts pins the two together.

export const RING_HOLD_MS = 2_000;
export const RING_FADE_MS = 400;

/** Put on any element that rings, so the ring leaving fades over RING_FADE_MS (reduced motion: cuts). */
export const RING_FADE_CLASS = "ring-fade";
