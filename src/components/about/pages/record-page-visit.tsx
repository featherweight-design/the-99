"use client";

import { useEffect, useRef } from "react";
import { recordAboutPageVisit } from "../../../app/about/actions";
import { acknowledgeHeld } from "../../home/arrivals-seen";

/**
 * Records a visit to one of About's pages once it is open in a browser (About visual PR 6b): an effect, so a prefetch
 * or a server render writes nothing. Renders nothing.
 *
 * `owed` is the server's verdict that the visit writes something (a key of this page the reader does not hold, or a
 * first-run baseline), and `claimed` is exactly what it rendered for the visit to write: the action writes only those
 * of them it still draws, so a unit switched on after this render is not marked seen unread. When it does, the write's own answer, the keys it wrote, is acknowledged in this document once
 * it LANDS, so Back to Home drops those launches from the banner it restores. When nothing is owed, `keys` (this page's
 * keys, which the reader already holds) are acknowledged at once. Either way a non-empty set of held keys ends the
 * reader's first run in this document (`acknowledgeHeld`): a reader holding any key is past it, even when a unit
 * switched off since Home rendered left one of the first-run line's ids unwritten. A failed write acknowledges nothing: the banner shows
 * the line again on a later load, the cheaper failure. The ref keeps StrictMode's double effect from writing twice.
 */
export function RecordPageVisit({
  area, owed, keys, claimed,
}: {
  area: string;
  owed: boolean;
  keys: readonly string[];
  claimed: readonly string[];
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (!owed) {
      acknowledgeHeld(keys);
      return;
    }
    if (sent.current) return;
    sent.current = true;
    recordAboutPageVisit(area, claimed).then(acknowledgeHeld, () => {
      sent.current = false;
    });
  }, [area, owed, keys, claimed]);
  return null;
}
