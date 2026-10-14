// The install slot's copy, adapted from Concert Crawl's PWA cluster handoff (`INSTALL_COPY`, Green
// READINESS) to The 99. Its dismiss note is left out: it sat under the how-to steps and said the
// prompt would stop, which is not true of a sheet the reader only opened.
export const pwaInstallCopy = {
  slotLabel: "Install",
  slotAria: "Install The 99",
  dismissAria: "Dismiss install prompt",
  sheet: {
    ariaLabel: "How to add The 99 to your home screen",
    eyebrow: "Safari on iPhone",
    title: "Put The 99 on your home screen",
    sub: "Safari won't do it for you. Here's the 10-second version.",
    steps: [
      { icon: "share", num: "1", label: "Tap Share", detail: "The square with an arrow, down in Safari's toolbar." },
      { icon: "plus", num: "2", label: "Scroll to “Add to Home Screen”", detail: "It's a few rows down, past AirDrop." },
      { icon: "home", num: "3", label: "Tap Add", detail: "Top right. Now it opens full screen, with no address bar." },
    ],
    done: "Got it",
  },
} as const;
