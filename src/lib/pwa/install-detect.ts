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
  interface Window {
    __the99InstallPrompt?: BeforeInstallPromptEvent;
  }
}

/**
 * Inlined in the root layout's head, so it runs while the document parses. Chrome fires
 * `beforeinstallprompt` once per document load and can fire it before the app hydrates, when no
 * React listener exists yet; this keeps the event for the slot to take after mount.
 */
export const INSTALL_PROMPT_CAPTURE =
  'addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__the99InstallPrompt=e});' +
  'addEventListener("appinstalled",function(){window.__the99InstallPrompt=undefined});';

/** The event the head script kept, if one arrived before the slot mounted. Taken once. */
export function takeEarlyPrompt(): BeforeInstallPromptEvent | null {
  const early = window.__the99InstallPrompt ?? null;
  window.__the99InstallPrompt = undefined;
  return early;
}

export type IosDevice = "iphone" | "ipad";

/**
 * Safari on an iPhone or an iPad, which the how-to sheet answers with different steps (Share sits in
 * the bottom toolbar on an iPhone and at the top, beside the address bar, on an iPad). An iPad in its
 * desktop-class mode (the default since iPadOS 13) sends a Macintosh user agent, so it is told from a
 * Mac by its touch points: a Mac has none. Chrome, Firefox and Edge on iOS can also add to the home
 * screen from their own Share menus, but their steps differ, so they get no slot either rather than
 * steps that are wrong for them.
 */
export function iosSafariDevice(ua: string = navigator.userAgent, touchPoints: number = navigator.maxTouchPoints): IosDevice | null {
  if (!/Safari/.test(ua) || /CriOS|FxiOS|EdgiOS/.test(ua)) return null;
  if (/iPhone|iPod/.test(ua)) return "iphone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return "ipad";
  return null;
}

/** Already running as the installed app. */
export function isStandalone(): boolean {
  const nav: Navigator & { standalone?: boolean } = window.navigator;
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
