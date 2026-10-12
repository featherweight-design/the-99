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
// The router is read from its context rather than `useRouter`, which throws outside an app router:
// the About page draws deck tiles as specimens, and tests render them bare. With no router there is
// nothing to prefetch into, and the link is a plain link.
import Link from "next/link";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useEffect, useRef, type ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & { href: string; eager?: boolean };
type PrefetchOptions = NonNullable<Parameters<AppRouterInstance["prefetch"]>[1]>;

/** Whether focus arrived from the keyboard rather than with a press. */
function keyboardFocus(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** The full prefetch: the page's dynamic data too, not only its loading boundary. */
const FULL = { kind: "full" } as unknown as PrefetchOptions;

export function IntentPrefetchLink({ eager = false, href, onPointerEnter, onFocus, ...props }: Props) {
  const router = useContext(AppRouterContext);
  const done = useRef(false);
  const prefetch = () => {
    if (done.current || !router) return;
    done.current = true;
    router.prefetch(href, FULL);
  };
  useEffect(() => {
    if (eager) prefetch();
    // Once per mount: `prefetch` is idempotent through `done`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eager, href]);
  return (
    <Link
      {...props}
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
