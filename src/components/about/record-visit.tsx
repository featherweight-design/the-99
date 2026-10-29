"use client";

import { useEffect, useRef } from "react";
import { recordAboutVisit } from "../../app/about/actions";
import { acknowledgeAbout, endAboutFirstRun } from "../home/arrivals-seen";

/**
 * Records the visit once the page is open in a browser (About R6 §O4, audit E2).
 * Renders nothing. An effect is the point: it runs after a real mount and never
 * during a server render, which is all a prefetch produces.
 *
 * The ref keeps StrictMode's double effect from writing twice. The write is
 * idempotent, but a second request is still a second request.
 *
 * It also tells Home's banner, in this document, that About's line is answered: Back to Home restores the payload the
 * router holds, About's line included, and that re-mount must not draw it. The banner checks the pages' unit keys
 * (`decks/your-deck/lock`), not the legacy ids this page draws and writes (`locked-cards`). A behind reader's visit
 * acknowledges what its write CONFIRMED once it LANDS (the action's answer: the ids written and the unit keys the
 * state it leaves covers), and ends their first run (`endAboutFirstRun`: the write raises the floor). A current
 * reader's, which writes nothing, acknowledges at once what the page drew (`drawn`) and the unit keys their state
 * covers (`answered`, the server's `answeredKeys`). Nothing is ever taken back, so overlapping visits and re-run
 * effects cannot leave a false acknowledgement behind. Back pressed while the write is still in flight draws the line
 * once more, the cheaper failure.
 */
export function RecordVisit({
  behind,
  shown,
  drawn = [],
  answered = [],
}: {
  behind: boolean;
  shown: readonly string[];
  drawn?: readonly string[];
  answered?: readonly string[];
}) {
  const sent = useRef(false);
  useEffect(() => {
    // A current reader's visit answers the line in this document too: another tab or device may have marked About
    // seen after this tab's Home was rendered, and Back restores that Home's payload with the line in it.
    if (!behind) {
      acknowledgeAbout([...drawn, ...answered]);
      return;
    }
    if (sent.current) return;
    sent.current = true;
    // The ids the page showed: the visit acknowledges these, so an entry switched on after it
    // rendered is not marked seen unread.
    // What the write CONFIRMED, not this render's forecast: the server's answer. The write raises the floor, so the
    // reader is past their first run once it lands.
    recordAboutVisit(shown).then(
      (confirmed) => {
        acknowledgeAbout(confirmed ?? []);
        endAboutFirstRun();
      },
      () => {
        // A failed write leaves the reader behind, which puts About's line in front
        // of them once more on a later Home load. That is the cheaper failure.
        sent.current = false;
      },
    );
  }, [behind, shown, drawn, answered]);
  return null;
}
