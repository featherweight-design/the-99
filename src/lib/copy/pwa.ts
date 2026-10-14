// The PWA chrome's copy, adapted from Concert Crawl's PWA cluster handoff (`OFFLINE_COPY`, Green
// READINESS) to The 99. Two claims there are not true here and are left out: The 99 keeps no
// pages or data on the device, so there is no "cached OK" and no "Saved on your phone" list.
export const pwaCopy = {
  offline: {
    pill: "Offline",
    pillAria: "You're offline. Pages load again when you're back.",
    /** The tab's title while the worker shows this page. */
    documentTitle: "Offline · The 99",
    page: {
      title: "Your decks need a connection.",
      eyebrow: "No signal",
      sub: "Nothing's saved on this device, so it'll all be here when you're back.",
      retry: "Try again",
    },
  },
} as const;
