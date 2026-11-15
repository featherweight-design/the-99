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

/** Which browser an iOS user agent is. `webview` is a page inside another app (no Share to Home Screen there). */
export type IosBrowser = "safari" | "chrome" | "firefox" | "webview" | "other";

// Apps that open links in their own web view. Most carry no `Safari/` token (caught below), a few do.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|Twitter|Line\/|MicroMessenger|Pinterest|LinkedInApp|GSA\//;
// Browsers whose Add to Home Screen steps are not sourced yet: Edge, Opera, DuckDuckGo.
const UNSOURCED = /EdgiOS|OPiOS|OPT\/|DuckDuckGo/;

/**
 * The browser behind an iPhone, iPod or iPad user agent, or null off iOS (an iPad asking for the desktop
 * site reads as a Mac, so it is null too). Brave on iOS sends Safari's agent and cannot be told apart.
 */
export function iosBrowser(ua: string = navigator.userAgent): IosBrowser | null {
  if (!/iPhone|iPod|iPad/.test(ua)) return null;
  if (IN_APP.test(ua) || !/Safari\//.test(ua)) return "webview";
  if (/CriOS\//.test(ua)) return "chrome";
  if (/FxiOS\//.test(ua)) return "firefox";
  return UNSOURCED.test(ua) ? "other" : "safari";
}

/** The browsers the install slot can tell how to add The 99: those whose steps are sourced (see `pwa-install.ts`). */
export type InstallBrowser = "safari" | "chrome" | "firefox";

/**
 * The install slot's browser: Safari, Chrome or Firefox on an iPhone. The how-to sheet's directions are the
 * iPhone's (Share sits in the bottom toolbar; on an iPad it sits at the top), so an iPad is not counted.
 * Edge, other browsers and in-app web views get no slot rather than steps that may be wrong for them.
 */
export function iphoneInstallBrowser(ua: string = navigator.userAgent): InstallBrowser | null {
  if (!/iPhone|iPod/.test(ua)) return null;
  const browser = iosBrowser(ua);
  return browser === "safari" || browser === "chrome" || browser === "firefox" ? browser : null;
}

/** Already running as the installed app. */
export function isStandalone(): boolean {
  const nav: Navigator & { standalone?: boolean } = window.navigator;
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
