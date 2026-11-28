// A lookup on the page's own chrome that the door and the overlay share.

/** Hand the focus back to the door. The desktop pill is unmounted while the mode is on, so look it up once it is back. */
export function focusDoor(): void {
  requestAnimationFrame(() => {
    const doors = [...document.querySelectorAll<HTMLElement>("[data-copy-door]")];
    doors.find((d) => d.getClientRects().length > 0)?.focus();
  });
}
