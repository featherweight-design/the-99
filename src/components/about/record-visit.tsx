"use client";

import { useEffect, useRef } from "react";
import { recordAboutVisit } from "../../app/about/actions";
import { acknowledgeAbout, unacknowledgeAbout } from "../home/arrivals-seen";

/**
 * Records the visit once the page is open in a browser (About R6 §O4, audit E2).
 * Renders nothing. An effect is the point: it runs after a real mount and never
 * during a server render, which is all a prefetch produces.
 *
 * The ref keeps StrictMode's double effect from writing twice. The write is
 * idempotent, but a second request is still a second request.
 *
 * It also tells Home's banner, in this document, that About's line is answered (`acknowledgeAbout`, with `drawn`,
 * every entry the page drew): Back to Home restores the payload the router holds, About's line included, and that
 * re-mount must not draw it. A failed write takes the acknowledgement back.
 */
export function RecordVisit({
  behind,
  shown,
  drawn = [],
}: {
  behind: boolean;
  shown: readonly string[];
  drawn?: readonly string[];
}) {
  const sent = useRef(false);
  useEffect(() => {
    // Every visit answers the line in this document, a current reader's included: another tab or device may have
    // marked About seen after this tab's Home was rendered, and Back restores that Home's payload with the line in it.
    const attempt = acknowledgeAbout(drawn);
    if (!behind || sent.current) return;
    sent.current = true;
    // The ids the page showed: the visit acknowledges these, so an entry switched on after it
    // rendered is not marked seen unread.
    void recordAboutVisit(shown).catch(() => {
      unacknowledgeAbout(attempt);
      // A failed write leaves the reader behind, which puts About's line in front
      // of them once more on a later Home load. That is the cheaper failure.
      sent.current = false;
    });
  }, [behind, shown, drawn]);
  return null;
}
