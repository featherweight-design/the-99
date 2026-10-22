"use client";

import { usePendingContentScope } from "../shell/pending-report";
import { placeFromPathname } from "./collection-place-head";
import { commandersPlaceFromPathname } from "../commanders/commanders-place-head";

/**
 * Confines the navigation-pending overlay to this wrapper when a tab press stays within the
 * three routes `CollectionPlaceHead` mounts on (collection tabs overlay fix, #1222 follow-up):
 * without it, a slow switch between Cards, Sets and Proxies paints the escalation screen over
 * the whole shell `<main>`, head and tabs included, which reads as a full-page reload even
 * though no document navigation ever happened. A press that leaves the group (Replace, a set's
 * own page, or anywhere else) still escalates over the full `<main>` as before.
 */
export function CollectionContentScope({
  children,
  place = "collection",
}: {
  children: React.ReactNode;
  /** Whose routes the scope confines the overlay to. A name rather than a predicate: a server layout cannot pass a function. */
  place?: "collection" | "commanders";
}) {
  const ref = usePendingContentScope((pathname) =>
    (place === "commanders" ? commandersPlaceFromPathname(pathname) : placeFromPathname(pathname)) !== null,
  );
  return <div ref={ref as React.Ref<HTMLDivElement>}>{children}</div>;
}
