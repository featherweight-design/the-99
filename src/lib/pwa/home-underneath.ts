/**
 * Back from the first page of an installed app's run: a launch from a push or a link opens the app on a page deeper than Home with
 * nothing under it, so the Android back gesture leaves the app. Standing Home underneath makes Back land on Home first, the way
 * the page's own up-link would.
 *
 * Installed (standalone) only: in a browser tab the entry under the first page is the reader's previous site, and Back there is
 * theirs. Decided from what the document can see on a cold start: one entry in the session history, on a path other than `/`.
 * The Navigation API counts entries exactly; `history.length` is the fallback where there is none (Firefox) and is only
 * trusted when it reads 1.
 */

const DONE_KEY = "the99.home.under";

type HistoryLike = Pick<History, "length" | "state" | "replaceState" | "pushState">;
type Env = {
  standalone: boolean;
  path: string;
  entries: number | null;
  historyLength: number;
};

/**
 * Pages Back should not be given a Home under: the sign-in and sign-up pages and Google's way back (a signed-out reader there
 * has no Home to go to, and `/` would bounce them back), and the offline page.
 */
const NOT_UNDER_HOME = /^\/(sign-in|sign-up|sso-callback|offline)(\/|$)/;

/** True when the page is the first and only entry of an installed run and is not Home. */
export function needsHomeUnderneath({ standalone, path, entries, historyLength }: Env): boolean {
  if (!standalone || path === "/" || NOT_UNDER_HOME.test(path)) return false;
  return (entries ?? historyLength) === 1;
}

/**
 * Replace the one entry with Home and push the page back on top of it. Next's patched history writes read a state carrying `__NA`
 * or `_N` as the router's own and neither adopt the URL nor navigate, so the page stays drawn for both writes. The Home entry
 * carries `_N` ONLY, never the page's router tree: a Back onto it then finds no `__NA`, and Next answers a state it did not
 * write with a full reload of `/`, which draws Home. Given the page's own state (tree included) it drew the page at `/`
 * (measured, Chromium, next 16). The page goes back on top with its own state, so its own entry is the router's as before.
 */
export function standHomeUnderneath(history: HistoryLike, here: string): void {
  try {
    window.sessionStorage.setItem(DONE_KEY, "1");
  } catch {
    // Harmless: see `homeUnderneathNeeded`.
  }
  const state = history.state;
  history.replaceState({ _N: true }, "", "/");
  history.pushState(state, "", here);
}

/** Reads the live window; null-safe off the client. */
export function homeUnderneathNeeded(): boolean {
  if (typeof window === "undefined") return false;
  // Once per run (sessionStorage lives as long as the installed window's run): a reload of the same page never stacks a second.
  try {
    if (window.sessionStorage.getItem(DONE_KEY)) return false;
  } catch {
    // Storage blocked: the entry count alone decides.
  }
  const nav = (window as unknown as { navigation?: { entries(): unknown[] } }).navigation;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true;
  return needsHomeUnderneath({
    standalone,
    path: window.location.pathname,
    entries: nav ? nav.entries().length : null,
    historyLength: window.history.length,
  });
}
