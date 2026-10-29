"use client";

import { useEffect, useRef } from "react";
import { recordAboutPageVisit } from "../../../app/about/actions";
import { acknowledgeAbout, acknowledgeHeld, endAboutFirstRun } from "../../home/arrivals-seen";

/**
 * Records a visit to one of About's pages once it is open in a browser (About visual PR 6b): an effect, so a prefetch
 * or a server render writes nothing. Renders nothing.
 *
 * `owed` is the server's verdict that the visit writes something (a key of this page the reader does not hold, or a
 * first-run baseline), and `claimed` is exactly what it rendered for the visit to write: the action writes only those
 * of them it still draws, so a unit switched on after this render is not marked seen unread. When it does, the write's own answer, the keys it wrote, is acknowledged in this document once
 * it LANDS, so Back to Home drops those launches from the banner it restores. When nothing is owed, `keys` (this page's
 * keys, which the reader already holds) are acknowledged at once and the first run ends, since only a reader past it
 * owes nothing. Otherwise a non-empty set of written keys ends the reader's first run in this document (`acknowledgeHeld`): a reader holding any key is past it, even when a unit
 * switched off since Home rendered left one of the first-run line's ids unwritten. A failed write acknowledges nothing: the banner shows
 * the line again on a later load, the cheaper failure. The ref keeps the same visit (page and claimed keys) from
 * writing twice; a new claim drawn in place writes.
 */
export function RecordPageVisit({
  area, owed, keys, claimed,
}: {
  area: string;
  owed: boolean;
  keys: readonly string[];
  claimed: readonly string[];
}) {
  // The visit last sent, by page and claimed key set: a re-render of the same claim (StrictMode's double effect, a new
  // array of the same keys) writes nothing more, while a refresh that draws new keys in place (a switch turned on, then
  // `ThemeRefresh` or any `router.refresh()`) records them.
  const sent = useRef<string | null>(null);
  useEffect(() => {
    // Nothing owed means the reader is past their first run (a first-run visit always raises the version), even on a page
    // that draws no key for them (review round 5).
    if (!owed) {
      acknowledgeAbout(keys);
      endAboutFirstRun();
      return;
    }
    const visit = `${area}\n${[...new Set(claimed)].sort().join("\n")}`;
    if (sent.current === visit) return;
    sent.current = visit;
    recordAboutPageVisit(area, claimed).then(acknowledgeHeld, () => {
      if (sent.current === visit) sent.current = null;
    });
  }, [area, owed, keys, claimed]);
  return null;
}
