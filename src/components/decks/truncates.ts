import type { CSSProperties } from "react";

/**
 * Decision 18's shrinking half. Both names take it; the partner additionally
 * raises `flexShrink` so it is the half that gives first. `minWidth: 0` is what
 * makes the ellipsis reachable at all — a flex child's default `min-width:auto`
 * floors it at its content width, so without this the group overflows rather
 * than truncating.
 */
export const TRUNCATES: CSSProperties = {
  flex: "0 1 auto",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
