"use client";

// A link to a DYNAMIC route that prefetches the whole page once a reader shows intent: a pointer
// resting on it, or keyboard focus (speed plan (b), 2026-10-12).
//
// NOT on a touch, though that was the first version (touchstart, and a touch's own pointerenter,
// which fires just before its pointerdown). Measured on deployed staging (#1557), a
// bare tap at 390 got SLOWER with it: 889 to 1,434ms and 866 to 1,384ms to the deck's content. The
// tap's own navigation follows the touchstart within milliseconds and does not reuse the prefetch
// still in flight, so the page is fetched twice at once. A phone gets its head start from `eager`
// instead (Home's latest deck: 865 to 139ms at 390), not from the tap.
//
// A dynamic route's default prefetch stops at its loading boundary, so the first visit to a deck
// waited on the full server render after the press. A full prefetch on intent starts that render
// before the click. It is not the default for every link in view because each one is a full deck
// render on the server; `eager` opts a single link in on sight, for the one a reader is most likely
// to open.
//
// THROUGH `router.prefetch`, not by flipping Link's `prefetch` prop, which is Next's documented
// hover pattern. The prop is a dependency of Link's ref callback, so flipping it unmounts the
// anchor (cancelling its prefetch) and schedules the full one only when the IntersectionObserver
// next reports, which a click that follows soon after can beat. `router.prefetch`
// schedules at once and leaves Link's own default prefetch and intent handling alone. Its `kind`
// option is typed (`PrefetchOptions`) but not in the public docs, so it is set in this one place.
//
// `eager="phone-in-view"` is the /decks grid's form of it: the grid draws every deck, and a full render
// for each would be dozens of deck renders per visit, so only the tiles a caller names opt in, and
// only on a phone (where a tap gives no hover to start one), only once the tile is on screen, and
// only at an idle moment, so the prefetch never competes with the page's own startup. Any eager form
// is skipped for a reader asking to save data (Save-Data, or a 2g connection): a prefetch is a guess,
// paid in their bytes.
//
// The router is read from its context rather than `useRouter`, which throws outside an app router:
// the About page draws deck tiles as specimens, and tests render them bare. With no router there is
// nothing to prefetch into, and the link is a plain link.
import Link from "next/link";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useCallback, useContext, useEffect, useRef, type ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & { href: string; eager?: boolean | "phone-in-view" };
type PrefetchOptions = NonNullable<Parameters<AppRouterInstance["prefetch"]>[1]>;

/** Whether focus arrived from the keyboard rather than with a press. */
function keyboardFocus(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** Below Tailwind's `sm`, the width the deck grid is one column at. */
const PHONE = "(width < 40rem)";

/** Whether the reader has asked to spend as few bytes as possible. */
function savesData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return c?.saveData === true || /(^|-)2g$/.test(c?.effectiveType ?? "");
}

/** Runs `fn` at the browser's next idle moment; returns the cancel. */
function onIdle(fn: () => void): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn);
    return () => w.cancelIdleCallback?.(id);
  }
  const t = setTimeout(fn, 200);
  return () => clearTimeout(t);
}

/** The full prefetch: the page's dynamic data too, not only its loading boundary. */
const FULL = { kind: "full" } as unknown as PrefetchOptions;

export function IntentPrefetchLink({ eager = false, href, onPointerEnter, onFocus, ref, ...props }: Props) {
  const router = useContext(AppRouterContext);
  const done = useRef(false);
  const anchor = useRef<HTMLAnchorElement | null>(null);
  // Stable across renders: Link re-runs its own ref callback, and its viewport prefetch, when this
  // identity changes.
  // A React 19 callback ref may return its own cleanup, which React then runs in place of calling
  // it with null. This one always returns a cleanup, so it does both on the caller's behalf.
  const setRef = useCallback(
    (el: HTMLAnchorElement) => {
      anchor.current = el;
      const cleanup = typeof ref === "function" ? ref(el) : ref ? ((ref.current = el), undefined) : undefined;
      return () => {
        anchor.current = null;
        if (typeof cleanup === "function") cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    },
    [ref],
  );
  const prefetch = () => {
    if (done.current || !router) return;
    done.current = true;
    router.prefetch(href, FULL);
  };
  useEffect(() => {
    if (!eager || !router || done.current || savesData()) return;
    if (eager === true) {
      prefetch();
      return;
    }
    const el = anchor.current;
    if (!el || !window.matchMedia?.(PHONE).matches || typeof IntersectionObserver === "undefined") return;
    let cancelIdle = () => {};
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      cancelIdle = onIdle(prefetch);
    });
    seen.observe(el);
    return () => {
      seen.disconnect();
      cancelIdle();
    };
    // Once per mount: `prefetch` is idempotent through `done`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eager, href]);
  return (
    <Link
      {...props}
      ref={setRef}
      href={href}
      onPointerEnter={(e) => {
        // A pointer that can rest: a mouse or a pen. A touch's pointerenter is the tap itself.
        if (e.pointerType !== "touch") prefetch();
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        // KEYBOARD focus only: a press focuses the link too (Chrome on mousedown, a tap as well),
        // and that focus is the press itself. `:focus-visible` tells them apart, the rule
        // `card-detail-provider.tsx` (`keyboardFocus`) settled on for the same reason.
        if (keyboardFocus(e.currentTarget)) prefetch();
        onFocus?.(e);
      }}
    />
  );
}
