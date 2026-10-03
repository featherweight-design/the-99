"use client";

import { usePendingContentScope } from "../shell/pending-report";
import { placeFromPathname } from "./collection-place-head";

/**
 * Confines the navigation-pending overlay to this wrapper when a tab press stays within the
 * three routes `CollectionPlaceHead` mounts on (collection tabs overlay fix, #1222 follow-up):
 * without it, a slow switch between Cards, Sets and Proxies paints the escalation screen over
 * the whole shell `<main>`, head and tabs included, which reads as a full-page reload even
 * though no document navigation ever happened. A press that leaves the group (Replace, a set's
 * own page, or anywhere else) still escalates over the full `<main>` as before.
 */
export function CollectionContentScope({ children }: { children: React.ReactNode }) {
  const ref = usePendingContentScope((pathname) => placeFromPathname(pathname) !== null);
  return <div ref={ref as React.Ref<HTMLDivElement>}>{children}</div>;
}
