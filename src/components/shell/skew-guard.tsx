"use client";

// Reloads a tab whose code is a deployment behind the server (`lib/skew/skew.ts` holds the decisions).
// Skew Protection covers 12 hours and a navigation; this covers the tab left open longer, or never
// navigating, whose next Server Action or lazy chunk would fail. It draws nothing.
//
// When a tab becomes visible it asks `/api/live` (no database read) which deployment answers. On a mismatch it holds a
// pending reload and fires it at the first moment that loses nothing: a route change, or a blur with no
// field holding typed text. Typed text in any field on the page keeps the tab where it is.
import { captureClientError } from "../../lib/sentry/capture-client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  SKEW_CHECK_GAP_MS,
  SKEW_RELOAD_KEY,
  deploymentsDiffer,
  isSkewError,
  mayReload,
  mayReloadNow,
  type Busy,
} from "../../lib/skew/skew";

/** Reloads once under the loop guard; false when the guard refuses. */
export function reloadForSkew(): boolean {
  if (!mayReload(() => window.sessionStorage.getItem(SKEW_RELOAD_KEY), Date.now())) return false;
  try {
    window.sessionStorage.setItem(SKEW_RELOAD_KEY, String(Date.now()));
  } catch {
    // silent-catch: expected: refusal: session storage refused, so the loop guard cannot be kept.
    return false;
  }
  window.location.reload();
  return true;
}

/** A focused field holding something typed. An empty focused field (a sign-in page autofocuses one) loses nothing. */
function isMidInput(el: Element | null): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value !== "";
  if (el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLElement && el.isContentEditable && (el.textContent ?? "") !== "";
}

const NON_TEXT = new Set(["hidden", "submit", "button", "reset", "checkbox", "radio", "range", "color", "file", "image"]);

/**
 * Text sitting in any field on the page, in a form or not. Not a comparison with `defaultValue`: React keeps a
 * controlled field's `value` attribute in step with what was typed, so such a field always reads as unchanged.
 * A search box prefilled from the address holds a pending reload until the next route change, which is the cost
 * of never guessing whether typed text matters.
 */
function anyTypedText(): boolean {
  for (const el of Array.from(document.querySelectorAll("input, textarea"))) {
    if (el instanceof HTMLInputElement && NON_TEXT.has(el.type)) continue;
    if ((el as HTMLInputElement | HTMLTextAreaElement).value !== "") return true;
  }
  return false;
}

function busy(): Busy {
  return { editing: isMidInput(document.activeElement), dirtyForm: anyTypedText() };
}

export function SkewGuard({ deploymentId }: { deploymentId: string | null }) {
  const pathname = usePathname();
  const pending = useRef(false);
  // A freshly loaded document is current, so the first check waits out the gap rather than running on mount.
  const lastCheck = useRef(0);
  const firstPath = useRef(pathname);

  // A route change leaves the page anyway, so a pending reload may fire.
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (pending.current && mayReloadNow(busy(), "route")) reloadForSkew();
  }, [pathname]);

  useEffect(() => {
    if (!deploymentId) return;
    lastCheck.current = Date.now();
    const settle = (trigger: "detected" | "blur") => {
      if (!pending.current || !mayReloadNow(busy(), trigger)) return;
      // Refused by the loop guard: drop the verdict, so the next check re-reads the server instead of
      // reloading on every blur for a mismatch a reload did not clear.
      if (!reloadForSkew()) pending.current = false;
    };
    const check = async () => {
      if (document.visibilityState !== "visible" || pending.current) return;
      const now = Date.now();
      if (now - lastCheck.current < SKEW_CHECK_GAP_MS) return;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        const body = (await res.json()) as { deploymentId?: string | null };
        lastCheck.current = now;
        if (deploymentsDiffer(deploymentId, body.deploymentId)) {
          pending.current = true;
          settle("detected");
        }
      } catch (e) {
        captureClientError("shell.skew-live", e);
        // Offline or a failed read: no verdict and no stamp, so the next time the tab is visible it asks again.
      }
    };
    let blurTimer: ReturnType<typeof setTimeout> | undefined;
    const onFocusOut = () => {
      // After the browser has moved focus, so a jump between two fields is not a blur.
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => settle("blur"), 0);
    };
    // A failed chunk or action is skew only while online (offline it is the network), and it waits for typed text
    // the same way a version mismatch does.
    const onSkewError = (error: unknown) => {
      if (!navigator.onLine || !isSkewError(error)) return;
      pending.current = true;
      settle("detected");
    };
    const onError = (e: ErrorEvent) => onSkewError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => onSkewError(e.reason);
    document.addEventListener("visibilitychange", check);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [deploymentId]);

  return null;
}
