"use client";

// Reloads a tab whose code is a deployment behind the server (`lib/skew/skew.ts` holds the decisions).
// Skew Protection covers 12 hours and a navigation; this covers the tab left open longer, or never
// navigating, whose next Server Action or lazy chunk would fail. It draws nothing.
//
// When a tab becomes visible it asks `/api/health` which deployment answers. On a mismatch it holds a
// pending reload and fires it at the first moment that loses nothing: a route change, or a blur with no
// edited form on the page. A focused field holding typed text, or a changed form, keeps the tab where it is.
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

/** A form with a control whose value is not the one it loaded with. */
function anyDirtyForm(): boolean {
  for (const form of Array.from(document.forms)) {
    for (const el of Array.from(form.elements)) {
      if (el instanceof HTMLInputElement) {
        if (el.type === "hidden" || el.type === "submit" || el.type === "button") continue;
        if (el.type === "checkbox" || el.type === "radio" ? el.checked !== el.defaultChecked : el.value !== el.defaultValue) return true;
      } else if (el instanceof HTMLTextAreaElement) {
        if (el.value !== el.defaultValue) return true;
      } else if (el instanceof HTMLSelectElement) {
        if (Array.from(el.options).some((o) => o.selected !== o.defaultSelected)) return true;
      }
    }
  }
  return false;
}

function busy(): Busy {
  return { editing: isMidInput(document.activeElement), dirtyForm: anyDirtyForm() };
}

export function SkewGuard({ deploymentId }: { deploymentId: string | null }) {
  const pathname = usePathname();
  const pending = useRef(false);
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
    const settle = (trigger: "detected" | "blur") => {
      if (pending.current && mayReloadNow(busy(), trigger)) reloadForSkew();
    };
    const check = async () => {
      if (document.visibilityState !== "visible" || pending.current) return;
      const now = Date.now();
      if (now - lastCheck.current < SKEW_CHECK_GAP_MS) return;
      lastCheck.current = now;
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const body = (await res.json()) as { deploymentId?: string | null };
        if (deploymentsDiffer(deploymentId, body.deploymentId)) {
          pending.current = true;
          settle("detected");
        }
      } catch {
        // Offline or a failed read: no verdict, and the next visible tab asks again.
      }
    };
    const onFocusOut = () => {
      // After the browser has moved focus, so a jump between two fields is not a blur.
      setTimeout(() => settle("blur"), 0);
    };
    const onError = (e: ErrorEvent) => {
      if (isSkewError(e.error ?? e.message)) reloadForSkew();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isSkewError(e.reason)) reloadForSkew();
    };
    void check();
    document.addEventListener("visibilitychange", check);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [deploymentId]);

  return null;
}
