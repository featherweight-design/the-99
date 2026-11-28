// A lookup on the page's own chrome: the copy editor's door.

/** Hand the focus back to the door. The desktop pill is unmounted while the mode is on, so look it up once it is back. */
export function focusDoor(): void {
  requestAnimationFrame(() => {
    const doors = [...document.querySelectorAll<HTMLElement>("[data-copy-door]")];
    doors.find((d) => d.getClientRects().length > 0)?.focus();
  });
}
/** Bottom of the phone header as it is on screen now (it scrolls away and slides back), so the bar and the notice pin under it. */
export function headerBottom(): number {
  const header = document.querySelector("header[data-shell-nav]");
  return header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
}

