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

/**
 * Safari on an iPhone. The how-to sheet's directions are the iPhone's (Share sits in the bottom
 * toolbar; on an iPad it sits at the top), so an iPad is not counted. Chrome, Firefox and Edge on
 * iOS can also add to the home screen from their own Share menus, but their steps differ, so they
 * get no slot either rather than steps that are wrong for them.
 */
export function isIphoneSafari(ua: string = navigator.userAgent): boolean {
  return /iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** Already running as the installed app. */
export function isStandalone(): boolean {
  const nav: Navigator & { standalone?: boolean } = window.navigator;
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
