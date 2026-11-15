// The install slot's copy, adapted from Concert Crawl's PWA cluster handoff (`INSTALL_COPY`, Green
// READINESS) to The 99. Its dismiss note is left out: it sat under the how-to steps and said the
// prompt would stop, which is not true of a sheet the reader only opened.
export const pwaInstallCopy = {
  slotLabel: "Install",
  slotAria: "Install The 99",
  dismissAria: "Dismiss install prompt",
  sheet: {
    ariaLabel: "How to add The 99 to your home screen",
    title: "Put The 99 on your home screen",
    /**
     * Step 1 and the lines around it differ by browser. Each browser's Share location is from its own users' guides and
     * the WebKit post that lets iPhone browsers add to the Home Screen from their Share menus (webkit.org/blog/13878);
     * Edge is left out until its steps are sourced. Nothing here promises push: that is unconfirmed outside Safari.
     */
    browsers: {
      safari: {
        eyebrow: "Safari on iPhone",
        sub: "Safari won’t do it for you. Here’s the 10-second version.",
        share: { label: "Tap Share", detail: "The square with an arrow, down in Safari’s toolbar." },
      },
      chrome: {
        eyebrow: "Chrome on iPhone",
        sub: "Chrome won’t do it for you. Here’s the 10-second version.",
        share: { label: "Tap Share", detail: "The square with an arrow, in Chrome’s address bar." },
      },
      firefox: {
        eyebrow: "Firefox on iPhone",
        sub: "Firefox won’t do it for you. Here’s the 10-second version.",
        share: { label: "Open the menu, then tap Share", detail: "The ⋯ in Firefox’s bottom bar." },
      },
    },
    steps: [
      { icon: "plus", num: "2", label: "Scroll to “Add to Home Screen”", detail: "It’s a few rows down, past AirDrop." },
      { icon: "home", num: "3", label: "Tap Add", detail: "Top right. Now it opens full screen, with no address bar." },
    ],
    done: "Got it",
  },
} as const;
