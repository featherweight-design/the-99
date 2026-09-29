"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { pendingRouteFor, type LoadingKey } from "../../lib/shell/pending-routes";
import { Report, targetOf, type Reporter } from "./pending-report";
import { PendingOverlay } from "./pending-overlay";
import { ShellLoading } from "./shell-loading";

/**
 * Navigation pending, and its escalation to the full screen (the navigation-pending handoff and its
 * escalation addendum). A press paints its own mark at 120ms (`PendingPip`, `PendingTrack`); if the
 * navigation is STILL pending at 400ms, the route's loading screen fades in over the page it is
 * leaving. At commit the screen fades out over the new page, which is already mounted.
 *
 * The provider holds one pending run. Every reporter inside a `<Link>` tells it whether its link is
 * pending and where it goes; the clock starts at the first report of a run and the words follow the
 * last press. A run ends when no reporter is pending any more, which `useLinkStatus` says happens
 * when history updates: the new page has committed. A link to the page already open never starts a
 * run, and neither does a link into a kept route, whose own `loading.tsx` commits at press.
 */
export const OVERLAY_AFTER_MS = 400;

const MainRef = createContext<React.RefObject<HTMLElement | null> | null>(null);

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement | null>(null);
  // Which reporters are pending, and where each goes. A Map so a press that moves from one link to
  // another (only the last link stays pending) ends the first without ending the run.
  const pending = useRef(new Map<string, string>());
  const running = useRef(false);
  // The run has been pending 400ms: from here any overlay route it points at shows at once.
  const due = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [shown, setShown] = useState<LoadingKey | null>(null);
  const [leaving, setLeaving] = useState(false);
  const shownRef = useRef<LoadingKey | null>(null);
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  const end = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    running.current = false;
    due.current = false;
    setTarget(null);
    // Shown: fade out over the committed page. Never shown: nothing to undo.
    if (shownRef.current) setLeaving(true);
  }, []);

  // Reports only record; the provider decides once per commit, in its own effect. A press that
  // moves from one link to another clears the first and sets the second in the same commit, and
  // deciding on each report would end the run on whichever reported first.
  const [reports, setReports] = useState(0);
  const report = useCallback<Reporter>(
    (id, href, isPending) => {
      const to = targetOf(href, pathname);
      if (isPending && to !== pathname) pending.current.set(id, to);
      else pending.current.delete(id);
      setReports((n) => n + 1);
    },
    [pathname],
  );

  useEffect(() => {
    if (pending.current.size === 0) {
      if (running.current) end();
      return;
    }
    const last = [...pending.current.values()].at(-1)!;
    setTarget(last);
    if (running.current) {
      // A run that began on a kept route and moved to an overlay route after 400ms shows now.
      const route = pendingRouteFor(last);
      if (due.current && route.kind === "overlay") setShown(route.key);
      return;
    }
    running.current = true;
    // A new run owes nothing to the last one's screen, even one still fading out: it waits its
    // own 400ms, and a run into a kept route never shows one at all.
    setShown(null);
    setLeaving(false);
    timer.current = setTimeout(() => {
      timer.current = null;
      due.current = true;
      if (pending.current.size === 0) return;
      const route = pendingRouteFor([...pending.current.values()].at(-1)!);
      if (route.kind === "overlay") setShown(route.key);
    }, OVERLAY_AFTER_MS);
  }, [reports, pathname, end]);

  const context = useMemo(() => ({ report, pathname }), [report, pathname]);

  const onLeft = useCallback(() => {
    setShown(null);
    setLeaving(false);
  }, []);

  // The words follow the last press while the screen is up, and hold once the run has ended.
  const lastRoute = target ? pendingRouteFor(target) : null;
  const screen = shown && lastRoute?.kind === "overlay" ? lastRoute.key : shown;

  // `aria-busy` and `inert` on the shell's own <main>, by ref: two set routes render a nested
  // <main> of their own, and a selector would find the wrong one (audit correction 2). `inert`
  // because the screen blocks only the pointer: without it a keyboard could still Tab into the
  // page it covers and press a link there. The rail and tab bar stay live, as a press there moves
  // the run to its own target.
  const busy = shown !== null && !leaving;
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (busy) {
      main.setAttribute("aria-busy", "true");
      main.inert = true;
    } else {
      main.removeAttribute("aria-busy");
      main.inert = false;
    }
  }, [busy]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <Report.Provider value={context}>
      <MainRef.Provider value={mainRef}>
        {children}
        {screen ? (
          <PendingOverlay
            screen={screen}
            leaving={leaving}
            main={mainRef}
            onLeft={onLeft}
          />
        ) : null}
      </MainRef.Provider>
    </Report.Provider>
  );
}

/**
 * The shell's <main>. It holds the ref the overlay sets `aria-busy` on, and wraps the page in the
 * page-load fallback (audit correction 1): on a direct load or a refresh the page streams in behind
 * the route's loading screen; on a client navigation this boundary has already resolved, so the old
 * page stays up and the pip, the track and the overlay carry the wait. The boundary is NOT keyed on
 * the pathname, since re-keying it would remount it and show the fallback on every navigation.
 */
export function ShellMain({ className, children }: { className: string; children: ReactNode }) {
  const ref = useContext(MainRef);
  return (
    <main ref={ref} className={className}>
      <Suspense fallback={<ShellLoading />}>{children}</Suspense>
    </main>
  );
}
