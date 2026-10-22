"use client";

import { useEffect, useRef } from "react";
import { discoverPath } from "../../lib/commanders/place-paths";

/**
 * The other lane, as a URL.
 *
 * The two lanes were one list under a `?scope=` parameter until the two-lane
 * split made them routes, so crossing between them is a navigation and every
 * crossing is a link — middle-clickable, and openable in a new tab. The search
 * travels with the reader: they typed a name to find one commander, and the
 * lane they are being sent to is where that commander is.
 */
export function laneHref(lane: "owned" | "discover", query: string, place: boolean): string {
  const path = lane === "owned" ? "/commanders" : discoverPath(place);
  const trimmed = query.trim();
  // A bare `?` is a URL the reader would see in their address bar and could
  // paste back in. With no search there is nothing to carry, so the path goes
  // on its own.
  return trimmed ? `${path}?q=${encodeURIComponent(trimmed)}` : path;
}

/**
 * The detail link for a row, carrying the pool the list ranked against.
 *
 * The detail page scores the one commander it draws, so without this it scored
 * against everything owned no matter which list the reader clicked — the same
 * commander showing one fit in the list and another on its own page. The
 * default is serialised as an absence, exactly as every other list parameter is.
 */
export function commanderDetailHref(slug: string, avail: "all" | "free"): string {
  return avail === "free" ? `/commanders/${slug}?avail=free` : `/commanders/${slug}`;
}

/**
 * Announce a re-rank once the server's new ordering has landed. The list stays
 * mounted across a sort or availability flip, so this is driven off the prop
 * changing rather than off the arrival itself.
 */
export function useRerankAnnouncement<T>(
  value: T,
  message: (value: T) => string,
  announce: (message: string) => void,
) {
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    announce(message(value));
  }, [value, message, announce]);
}

