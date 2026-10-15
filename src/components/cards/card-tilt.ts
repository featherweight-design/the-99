/**
 * The tilt on every card in details and the zoom (foil handoff R2, STATES 1b to 1d). The stylesheet draws it all; these
 * only write the TARGET values on the `data-tilt` host: `--tilt-x` / `--tilt-y` (0 to 1, the pointer across the host),
 * `--tilt-lift` (1 while a pointer holds the card) and `data-tilting`. They are registered, so a transition eases them:
 * no rAF loop, nothing while idle. Inline values beat the stylesheet, so a turn TAKES THEM OFF (`dropTilt`, G4) for
 * `[data-tilt][data-turning]` to pin the centre, and a turning host is never written to.
 *
 * The transition is for the SETTLE only, on the way in and on the way out. A transition restarted by every pointer move
 * kept the card chasing the pointer, so once the lift has settled (`TILT_SETTLE_MS`) the host is marked
 * `data-tilt-follow`, the stylesheet drops the transition on `--tilt-x` / `--tilt-y`, and each move draws where the
 * pointer is on its own frame.
 */
import { prefersReducedMotion } from "../../lib/ui/motion";

/** How long a finger rests on the phone card, inside the swipe's slop, before the card lifts (README R2 "Phone"). */
export const TILT_HOLD_MS = 300;

/** The desktop's hover tilt answers a mouse or a pen (G12): touch at a desktop width fires `pointerenter` too. */
export function tiltsOnHover(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

/** The settle on the way in: the stylesheet's tilt transition while `data-tilting` (300ms), after which the card follows. */
export const TILT_SETTLE_MS = 300;

/** When each host lifted, so the move that comes after the settle can mark it to follow. */
const liftedAt = new WeakMap<HTMLElement, number>();

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

/**
 * Lifts the card toward a pointer at (`clientX`, `clientY`): the lift, then where it points. Nothing under reduced
 * motion (no tilt at all, STATES 15), and nothing while the card is turning (G4).
 */
export function liftTilt(host: HTMLElement, clientX: number, clientY: number): void {
  if (host.hasAttribute("data-turning") || prefersReducedMotion()) return;
  // Read on every move, so a card that moved or resized mid-tilt (a carousel entrance, a resize) maps the pointer to
  // where it is now. A tilted card's outline is skewed, but it turns about its centre, so the outline's centre is the
  // card's; the size is the untransformed layout box (jsdom has none, so the outline stands in there).
  const outline = host.getBoundingClientRect();
  const width = host.offsetWidth || outline.width;
  const height = host.offsetHeight || outline.height;
  const box = { left: outline.left + outline.width / 2 - width / 2, top: outline.top + outline.height / 2 - height / 2, width, height };
  const now = performance.now();
  const since = liftedAt.get(host);
  if (since === undefined || !host.hasAttribute("data-tilting")) liftedAt.set(host, now);
  else if (now - since >= TILT_SETTLE_MS) host.setAttribute("data-tilt-follow", "");
  host.setAttribute("data-tilting", "");
  host.style.setProperty("--tilt-lift", "1");
  host.style.setProperty("--tilt-x", String(box.width > 0 ? clamp01((clientX - box.left) / box.width) : 0.5));
  host.style.setProperty("--tilt-y", String(box.height > 0 ? clamp01((clientY - box.top) / box.height) : 0.5));
}

/** Lets the card settle flat: every inline value off, so the stylesheet's rest (or the turn's centre) wins. */
export function dropTilt(host: HTMLElement | null | undefined): void {
  if (!host) return;
  liftedAt.delete(host);
  host.removeAttribute("data-tilting");
  host.removeAttribute("data-tilt-follow");
  host.style.removeProperty("--tilt-x");
  host.style.removeProperty("--tilt-y");
  host.style.removeProperty("--tilt-lift");
}
