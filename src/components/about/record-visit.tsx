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
 * It also tells Home's banner, in this document, that About's line is answered (`acknowledgeAbout`, with `drawn`,
 * every entry the page drew, by the form it drew: `displayedId`, as the banner's line names them): Back to Home restores the payload the router holds, About's line included, and that
 * re-mount must not draw it. A behind reader's visit acknowledges once its write LANDS, a current reader's at once;
 * nothing is ever taken back, so overlapping visits and re-run effects cannot leave a false acknowledgement behind.
 * Back pressed while the write is still in flight draws the line once more, the cheaper failure.
 *
 * The banner checks the pages' unit keys (`decks/your-deck/lock`), not the legacy ids this page draws and writes
 * (`locked-cards`), so the acknowledgement carries `answered` too: the unit keys the write covers, decided on the server
 * from the state it leaves (`answeredKeys`). `endsFirstRun` says the write takes the reader past their first run, so a
 * restored first-run line is not drawn either (`endAboutFirstRun`).
 */
export function RecordVisit({
  behind,
  shown,
  drawn = [],
  answered = [],
  endsFirstRun = false,
}: {
  behind: boolean;
  shown: readonly string[];
  drawn?: readonly string[];
  answered?: readonly string[];
  endsFirstRun?: boolean;
}) {
  const sent = useRef(false);
  useEffect(() => {
    // A current reader's visit answers the line in this document too: another tab or device may have marked About
    // seen after this tab's Home was rendered, and Back restores that Home's payload with the line in it.
    const acknowledge = () => {
      acknowledgeAbout([...drawn, ...answered]);
      if (endsFirstRun) endAboutFirstRun();
    };
    if (!behind) {
      acknowledge();
      return;
    }
    if (sent.current) return;
    sent.current = true;
    // The ids the page showed: the visit acknowledges these, so an entry switched on after it
    // rendered is not marked seen unread.
    recordAboutVisit(shown).then(
      acknowledge,
      () => {
        // A failed write leaves the reader behind, which puts About's line in front
        // of them once more on a later Home load. That is the cheaper failure.
        sent.current = false;
      },
    );
  }, [behind, shown, drawn, answered, endsFirstRun]);
  return null;
}
