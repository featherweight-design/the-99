// Install onboarding R1b · new words, DRAFT for /copy-review. Lands as `tourCopy.steps.install` (+ `tourCopy.lit.install`)
// in src/lib/copy/discovery.ts. Only Safari's body names alerts: push from a Chrome or Firefox install is unconfirmed (brief §3).
// R1's checklist row strings are withdrawn.
export const tourInstallCopy = {
  place: "Install",
  title: "Play it from your home screen",
  body: {
    safari: "Install puts The 99 on your home screen: full screen, one tap away, and it can send the alerts you choose.",
    chrome: "Install puts The 99 on your home screen: full screen and one tap away. It takes about 10 seconds.",
    firefox: "Install puts The 99 on your home screen: full screen and one tap away. It takes about 10 seconds.",
    android: "Install puts The 99 on your home screen: full screen and one tap away. Your phone asks once.",
  },
  foot: "Select the button up top now, or any time. Its ✕ hides it.",
  lit: "the Install button",
} as const;
// Kept as shipped: pwaInstallCopy (slot, sheet), tourCopy kicker/back/finish/skip.
