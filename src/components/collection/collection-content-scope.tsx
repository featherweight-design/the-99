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
  // `flex flex-1 flex-col` continues the shell main's stretch chain (`shell.tsx`: main is at least a screen tall and a flex
  // column), so a tab's loading screen (`flex-1`) fills the view instead of stopping at its own min-height.
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className="flex min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}
