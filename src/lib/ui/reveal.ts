/**
 * Bring an element into view the way the app moves a reader to something they asked for: a smooth
 * scroll, or a jump under `prefers-reduced-motion: reduce` (Hugh, 2026-10-11: picking a tool jumped).
 * One definition, so the Tuning hub's tool opening and Improve my mana's result move alike.
 */
export function reveal(el: Element | null | undefined, block: ScrollLogicalPosition = "start"): void {
  if (!el) return;
  const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  el.scrollIntoView({ block, behavior: still ? "auto" : "smooth" });
}
