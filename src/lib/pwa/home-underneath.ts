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

type HistoryLike = Pick<History, "length" | "state" | "replaceState" | "pushState">;
type Env = {
  standalone: boolean;
  path: string;
  entries: number | null;
  historyLength: number;
};

/** True when the page is the first and only entry of an installed run and is not Home. */
export function needsHomeUnderneath({ standalone, path, entries, historyLength }: Env): boolean {
  if (!standalone || path === "/") return false;
  return (entries ?? historyLength) === 1;
}

/**
 * Replace the one entry with Home and push the page back on top of it. The page's own history state goes on both: it carries
 * the router's marks, so Next reads both writes as its own and neither navigates (Home is not drawn, the page stays).
 */
export function standHomeUnderneath(history: HistoryLike, here: string): void {
  const state = history.state;
  history.replaceState(state, "", "/");
  history.pushState(state, "", here);
}

/** Reads the live window; null-safe off the client. */
export function homeUnderneathNeeded(): boolean {
  if (typeof window === "undefined") return false;
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
