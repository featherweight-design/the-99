"use client";

// `StripAddedParam` spends the one-time `?added=` claim on the deck page once it has been seen: the arrival band says
// the cards were added and links History, and a reload must not repeat it.

import { useEffect } from "react";
import { PRECON_ADDED_PARAM } from "../../../lib/decks/arrival";
import { mirrorUrl } from "../../../lib/url/mirror";

/** Takes `?added=` off the address: a one-time claim is spent once the page has seen it, whether or not it drew anything. */
export function useStripAddedParam(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PRECON_ADDED_PARAM)) return;
    url.searchParams.delete(PRECON_ADDED_PARAM);
    mirrorUrl(url);
  }, [on]);
}

/** Mounted when `?added=` was supplied and no receipt could be drawn for it (a stale, foreign or failed claim): it only spends the claim. */
export function StripAddedParam() {
  useStripAddedParam(true);
  return null;
}
