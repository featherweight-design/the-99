import type { RoleName } from "../../lib/recs/score";

/**
 * The in-page anchor a Role Coverage panel answers to.
 *
 * Scoped by width because the detail page mounts the whole body twice, once per
 * breakpoint, and only one is visible. A bare `#ramp` would be a duplicate id and
 * would always resolve to the mobile copy, so a desktop reader clicking the link
 * would jump to a hidden element.
 */
export function roleAnchorId(width: "desktop" | "phone", role: RoleName): string {
  return `role-${width}-${role}`;
}

/** Clears the sticky page chrome when the browser jumps to a panel. */
export const ROLE_ANCHOR_SCROLL_MARGIN = 24;
