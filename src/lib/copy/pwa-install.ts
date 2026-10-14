// The install slot's copy, adapted from Concert Crawl's PWA cluster handoff (`INSTALL_COPY`, Green
// READINESS) to The 99: its name, and a dismiss note that points at Safari's Share menu, since The 99
// has no settings page that installs it.
export const pwaInstallCopy = {
  slotLabel: "Install",
  slotAria: "Install The 99",
  dismissAria: "Dismiss install prompt",
  sheet: {
    ariaLabel: "How to add The 99 to your home screen",
    eyebrow: "Add to Home Screen",
    title: "Put The 99 on your home screen",
    sub: "Safari won't do it for you on iPhone. Here's the 10-second version.",
    steps: [
      { icon: "share", num: "1", label: "Tap Share", detail: "The square with an arrow, down in Safari's toolbar." },
      { icon: "plus", num: "2", label: "Scroll to “Add to Home Screen”", detail: "It's a few rows down, past AirDrop." },
      { icon: "home", num: "3", label: "Tap Add", detail: "Top right. Now it opens full screen, with no address bar." },
    ],
    done: "Got it",
    dismissNote: "We'll stop asking. Safari's Share menu can still add it any time.",
  },
} as const;
