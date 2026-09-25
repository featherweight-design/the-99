"use client";

import { useEffect, useRef } from "react";
import { recordAboutVisit } from "../../app/about/actions";

/**
 * Records the visit once the page is open in a browser (About R6 §O4, audit E2).
 * Renders nothing. An effect is the point: it runs after a real mount and never
 * during a server render, which is all a prefetch produces.
 *
 * The ref keeps StrictMode's double effect from writing twice. The write is
 * idempotent, but a second request is still a second request.
 */
export function RecordVisit({ behind }: { behind: boolean }) {
  const sent = useRef(false);
  useEffect(() => {
    if (!behind || sent.current) return;
    sent.current = true;
    void recordAboutVisit().catch(() => {
      // A failed write leaves the reader behind, which puts the sheet in front
      // of them once more on a later load. That is the cheaper failure.
      sent.current = false;
    });
  }, [behind]);
  return null;
}
