/**
 * Whether a control is drawn now. One under `hidden` (a panel mounted behind its loader) is not, and neither is one a
 * stylesheet hides: the desktop and phone copies of a control both mount, and only one is displayed at a width (the
 * rail's ? from `md`, the header's below it). Client-only.
 */
export function isDrawn(el: HTMLElement): boolean {
  if (el.closest("[hidden]") !== null) return false;
  // `checkVisibility` is false for `display: none` on the control or any ancestor. Where a browser lacks it, the same
  // question asked of the computed style, up the tree.
  if (typeof el.checkVisibility === "function") return el.checkVisibility();
  for (let n: Element | null = el; n !== null; n = n.parentElement) {
    if (getComputedStyle(n).display === "none") return false;
  }
  return true;
}
