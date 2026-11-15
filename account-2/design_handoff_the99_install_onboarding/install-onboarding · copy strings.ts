// Install onboarding R1 · new words, DRAFT for /copy-review. Lands as `pwaInstallCopy.row` in src/lib/copy/pwa-install.ts.
// Only Safari's line names alerts: push from a Chrome or Firefox install is unconfirmed (brief §3).
export const installRowCopy = {
  title: "Install The 99",
  line: {
    safari: "Full screen and one tap away, and it can send the alerts you choose.",
    chrome: "Full screen and one tap away. It takes about 10 seconds.",
    firefox: "Full screen and one tap away. It takes about 10 seconds.",
    android: "Full screen and one tap away. Your phone asks once.",
  },
  dismissAria: "Don’t show this again",
} as const;
// Kept as shipped: pwaInstallCopy.sheet (title, browsers, steps, done), slotLabel, slotAria, dismissAria.
