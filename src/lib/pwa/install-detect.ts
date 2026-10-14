// Ported from Concert Crawl's `beforeinstallprompt.ts`. The event is not in the DOM library, so it is
// declared here by interface merging rather than by a cast.
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt: () => Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/** Safari on an iPhone or iPad: the one browser that installs only through its Share menu. */
export function isIosSafari(ua: string = navigator.userAgent, touchPoints: number = navigator.maxTouchPoints): boolean {
  // iPadOS reports a Mac's user agent, and unlike a Mac it has more than one touch point.
  const ipadOs = ua.includes("Macintosh") && touchPoints > 1;
  const ios = /iPad|iPhone|iPod/.test(ua) || ipadOs;
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

/** Already running as the installed app. */
export function isStandalone(): boolean {
  const nav: Navigator & { standalone?: boolean } = window.navigator;
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
