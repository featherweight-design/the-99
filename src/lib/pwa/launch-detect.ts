/**
 * The app loader's cold-start decision (design/design_handoff_the99_app_loader, Hugh's rulings 2026-11-11).
 *
 * The loader plays on the first document load of an installed app's session, on a phone, for a signed-in reader, and
 * never with reduced motion. Two parties share the decision and neither can do the other's part:
 *
 * - The head script (`LAUNCH_DETECT`) runs while the document parses, before the first paint, and marks `<html>` with
 *   `data-launch`. Only an inline script is early enough: the overlay has to be on screen in the very first frame or
 *   Home flashes under the splash. It reads, it never writes: a signed-out document has no overlay to play, and a flag
 *   written there would use up the reader's next cold start.
 * - The overlay (`launch-loader.tsx`) exists only in the signed-in shell, so it alone writes the flag
 *   (`LAUNCH_SEEN_KEY`). Later loads in the same session find it and stay quiet.
 *
 * `sessionStorage` is the right lifetime for "cold start": the installed app's window gets a fresh one on every launch
 * and keeps it across reloads and navigations inside that run.
 *
 * "Phone" is the layout that draws the mobile header, the loader's landing spot: a coarse pointer under the `md`
 * breakpoint (768px). A desktop standalone window and a tablet get nothing.
 *
 * A plain string rather than a function's `toString()`, because the build may rewrite a function's source; it is the
 * one copy of the logic and `launch-detect.test.ts` runs it against stubbed windows.
 */
export const LAUNCH_ATTR = "data-launch";
export const LAUNCH_SEEN_KEY = "the99.launch.seen";

export const LAUNCH_DETECT =
  '(function(){try{var w=window,m=w.matchMedia.bind(w);' +
  'if(!(m("(display-mode: standalone)").matches||w.navigator.standalone===true))return;' +
  'if(!m("(pointer: coarse) and (max-width: 767px)").matches)return;' +
  'if(m("(prefers-reduced-motion: reduce)").matches)return;' +
  `if(w.sessionStorage.getItem("${LAUNCH_SEEN_KEY}"))return;` +
  `document.documentElement.setAttribute("${LAUNCH_ATTR}","1")` +
  "}catch(e){}})();";

/** Called once by the signed-in overlay: this session has had its loader (or had no need of one). */
export function markLaunchSeen(): void {
  try {
    window.sessionStorage.setItem(LAUNCH_SEEN_KEY, "1");
  } catch {
    // Storage blocked: the loader may play again on a reload. Harmless.
  }
}
