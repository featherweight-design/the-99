"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";

import { pendingRouteFor, type LoadingKey } from "../../lib/shell/pending-routes";
import { Report, targetOf, useReportPending, type PendingScope, type Reporter } from "./pending-report";
import { PendingOverlay } from "./pending-overlay";
import { ShellLoading } from "./shell-loading";
import { setRoutePath } from "../../lib/url/mirror";
import { noteDeckRoute } from "../../lib/decks/visit";
import { newNavigation, StallContext, watchFetches, watchStall, type StallConfig } from "./nav-stall";

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

export function NavigationPendingProvider({ children, stall = null }: { children: ReactNode; stall?: StallConfig }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement | null>(null);
  // A boundary a route tree installed via `usePendingContentScope` (collection tabs overlay
  // fix, #1222 follow-up): a run that never leaves it confines its screen to this element
  // instead of covering the whole `<main>`, so a shared head above it stays visible and
  // interactive. At most one is ever registered today; a second mount replaces the ref rather
  // than stacking, which is enough for the one nested boundary that exists.
  const contentScope = useRef<PendingScope | null>(null);
  const registerContentScope = useCallback((scope: PendingScope | null) => {
    contentScope.current = scope;
  }, []);
  // Which box the CURRENTLY SHOWN screen covers — decided once, when the run escalates, from
  // the scope registered at that moment, and held as the resolved ref itself rather than
  // re-derived at render: reading a ref's `current` during render is exactly the stale-read
  // hazard `react-hooks/refs` exists to catch, so the decision is made in the effect below and
  // only the already-decided state is read here.
  const [overlayBox, setOverlayBox] = useState<RefObject<HTMLElement | null> | null>(null);
  const boxFor = useCallback(
    (from: string, to: string) => {
      const scope = contentScope.current;
      return scope && scope.contains(from) && scope.contains(to) ? scope.ref : mainRef;
    },
    [],
  );
  // The router's committed path, for the URL mirrors (`lib/url/mirror`). A layout effect: Next
  // writes the address in an insertion effect at the same commit, before this runs, and every
  // page's mirror runs in a passive effect after it.
  useLayoutEffect(() => {
    setRoutePath(pathname);
    // The deck visit (`lib/decks/visit`): a Tuning tool's result stays for the visit to one deck.
    // Noted here and never cleared in the cleanup, which runs between EVERY two paths: clearing
    // there would end the visit on a move from `/decks/A` to `/decks/A/changes`.
    noteDeckRoute(pathname);
    return () => setRoutePath(null);
  }, [pathname]);
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
      if (due.current && route.kind === "overlay") {
        setShown(route.key);
        setOverlayBox(boxFor(pathname, last));
      }
      return;
    }
    running.current = true;
    // A new run owes nothing to the last one's screen, even one still fading out: it waits its
    // own 400ms, and a run into a kept route never shows one at all.
    setShown(null);
    setOverlayBox(null);
    setLeaving(false);
    timer.current = setTimeout(() => {
      timer.current = null;
      due.current = true;
      if (pending.current.size === 0) return;
      const to = [...pending.current.values()].at(-1)!;
      const route = pendingRouteFor(to);
      if (route.kind === "overlay") {
        setShown(route.key);
        setOverlayBox(boxFor(pathname, to));
      }
    }, OVERLAY_AFTER_MS);
  }, [reports, pathname, end, boxFor]);

  // Code-started navigations (`usePendingPush`) run in `CodePushes`, which this provider mounts,
  // rather than in the component that starts them: that component can unmount before the new page
  // commits (on Home's first run the import's own revalidation swaps the checklist holding the
  // replace flow for the dashboard), and a report it owned would end with it.
  const runPush = useRef<((href: string) => void) | null>(null);
  // A push asked for before `CodePushes` has registered (a click replayed as hydration finishes)
  // is held and run at registration rather than dropped: the page that asked has already closed
  // whatever started it, and a lost push would leave the reader nowhere.
  const queued = useRef<string | null>(null);
  const push = useCallback((href: string) => {
    if (runPush.current) runPush.current(href);
    else queued.current = href;
  }, []);
  const registerPush = useCallback((run: ((href: string) => void) | null) => {
    runPush.current = run;
    if (run && queued.current !== null) {
      const href = queued.current;
      queued.current = null;
      run(href);
    }
  }, []);
  const context = useMemo(
    () => ({ report, pathname, push, registerContentScope }),
    [report, pathname, push, registerContentScope],
  );

  const onLeft = useCallback(() => {
    setShown(null);
    setOverlayBox(null);
    setLeaving(false);
  }, []);

  // The words follow the last press while the screen is up, and hold once the run has ended.
  // The stuck-loader diagnostic: a navigation still pending `STALL_AFTER_MS` after it started sends
  // one report, and every new one lets the next hang report again.
  const leftFrom = useRef(pathname);
  useEffect(() => {
    if (!stall) return;
    watchFetches();
    // A browser Back or Forward is a navigation no press reports, so it starts one here: a page it
    // lands in a loading screen is then timed, matched and reported as its own.
    window.addEventListener("popstate", newNavigation);
    return () => window.removeEventListener("popstate", newNavigation);
  }, [stall]);
  useEffect(() => {
    if (target === null) return;
    newNavigation();
    if (!stall) return;
    return watchStall({ kind: "pending", from: leftFrom.current, to: target, config: stall });
  }, [target, stall]);
  useEffect(() => {
    leftFrom.current = pathname;
  }, [pathname]);

  const lastRoute = target ? pendingRouteFor(target) : null;
  const screen = shown && lastRoute?.kind === "overlay" ? lastRoute.key : shown;

  // `aria-busy` and `inert` on whichever element the screen actually covers — the shell's own
  // <main> normally (by ref: two set routes render a nested <main> of their own, and a selector
  // would find the wrong one, audit correction 2), or a registered content scope's own element
  // when the run is confined to it, so a shared head above that element stays interactive.
  // `inert` because the screen blocks only the pointer: without it a keyboard could still Tab
  // into the page it covers and press a link there. The rail and tab bar stay live either way,
  // as a press there moves the run to its own target.
  const busy = shown !== null && !leaving;
  // The element busy/inert currently lands on, kept so a RETARGET — a run still escalated when
  // its box moves from a registered scope to `mainRef` or back, which happens when the pressed
  // link moves from inside a scope to outside it (or the reverse) before the run ends — clears
  // the PREVIOUS element rather than abandoning it mid-busy. Without this the old element kept
  // `aria-busy`/`inert` forever once `overlayBox` changed out from under it: the effect only
  // ever cleared whatever it currently pointed to, never what it had just stopped pointing to.
  const busyElRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const prev = busyElRef.current;
    // Written to the plain ref immediately, and every mutation below reads it back from
    // there rather than from `overlayBox`/`mainRef` directly: those are hook-tracked values,
    // and `react-hooks/immutability` (rightly) refuses a direct property write on anything
    // read straight off one, even though what is actually being mutated is the DOM element a
    // ref merely points to.
    busyElRef.current = busy ? (overlayBox ?? mainRef).current : null;
    const next = busyElRef.current;
    if (prev && prev !== next) {
      prev.removeAttribute("aria-busy");
      prev.inert = false;
    }
    if (next) {
      next.setAttribute("aria-busy", "true");
      next.inert = true;
    }
  }, [busy, overlayBox]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <Report.Provider value={context}>
      <StallContext.Provider value={stall}>
      <CodePushes register={registerPush} />
      <MainRef.Provider value={mainRef}>
        {children}
        {screen ? (
          <PendingOverlay
            screen={screen}
            leaving={leaving}
            box={overlayBox ?? mainRef}
            onLeft={onLeft}
          />
        ) : null}
      </MainRef.Provider>
      </StallContext.Provider>
    </Report.Provider>
  );
}

/**
 * Runs the provider's code-started pushes. Each push is a transition, and this reports it the way a
 * link's reporter does; it is mounted by the provider, so it outlives whatever page started it.
 */
function CodePushes({ register }: { register: (run: ((href: string) => void) | null) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  useReportPending(target ?? "", pending && target !== null);
  // A layout effect, so the runner is in place before any replayed or effect-started push.
  useLayoutEffect(() => {
    register((href: string) => {
      setTarget(href);
      startTransition(() => router.push(href));
    });
    return () => register(null);
  }, [register, router]);
  return null;
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
