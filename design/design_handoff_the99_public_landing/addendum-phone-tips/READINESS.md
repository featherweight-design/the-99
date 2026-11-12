# Readiness · A4 R1 (self-assessed): Green · approved by Hugh 2026-11-12

One small PR, in `src/components/landing/credit-tips.tsx` with tests in `credit-tips.test.tsx`. No data, flag, copy or token change.

- **Classes.** Row: add `max-md:flex-wrap`. Tip: `anim-menu-in max-md:basis-full max-md:mt-[2px] max-md:mb-[3px]`, with today's float behind `md:` (`md:absolute md:left-[-8px] md:top-[calc(100%-2px)] md:z-30 md:w-[330px] md:shadow-[0_14px_34px_rgba(0,0,0,0.5)]`) and today's hover-only `pointer-events-none` kept. Proof: 768 and 1300 render pixel-identical to shipped.
- **Outside press.** The `pointerdown` listener that closes the tip runs only from 768 (`matchMedia("(min-width: 768px)")`). Escape stays at every width.
- **Anchor.** Before changing the open id, read the pressed ⓘ's `getBoundingClientRect().top`; in a layout effect after, `scrollBy` the difference (phone only).
- **Into view.** In the same effect, if the tip's bottom is past `innerHeight - 16`, scroll so it ends there, or put its top at 16 when it's taller than the screen. `behavior: "smooth"`, or `"auto"` under reduced motion.
- **Semantics.** Below 768: `aria-controls` on the ⓘ, no `role="tooltip"` and no `aria-describedby` on the tip. From 768: as shipped.
- **Tests.** Phone: open pushes the next row (the tip is in the list's flow, no `absolute`), a press outside leaves it open, the same ⓘ closes it, one open at a time. Desktop: unchanged suite passes.
