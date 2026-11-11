// The in-app sign-in's and sign-up's shared pieces (Small items 11 A2): Google's press and mark, the rule under it, the
// labelled field, the hint and refusal lines, and how a Clerk refusal is read. `/sign-in` (P1 to P8) and
// `/sign-up` (Q1 to Q6, R2, R3) draw them, so the two pages are one system and not two copies.

import { useEffect, type InputHTMLAttributes } from "react";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { HOME } from "../../lib/auth/return-to";
import { taskPath } from "../../lib/auth/session-tasks";
import { signInCopy } from "../../lib/copy/join";
import { field, quietPress } from "../join/join-parts";

export const MIN_PASSWORD = 8;
export { SSO_CALLBACK, SSO_CALLBACK_INVITE, SSO_FROM_INVITE } from "./sso-paths";

/** K1's Google press: the outline press (`.gbtn`) with Google's mark. */
export const GOOGLE = `${quietPress("mt-[22px]")} gap-[10px]`;
/** The rule between Google and the email (`.or9`). */
export const OR = "mt-[18px] flex w-full items-center gap-[12px] font-mono text-[11px] text-[color:var(--fg-faint)] before:h-px before:flex-1 before:bg-[color:var(--border)] before:content-[''] after:h-px after:flex-1 after:bg-[color:var(--border)] after:content-['']";
const LABEL = "flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]";
/** K5's hint under the new password (`.s7hint`). */
export const HINT = "m-0 mt-[6px] text-left text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]";
export const LINE_ID = "sign-in-line";
/** The sign-in's refusal line (`.s7err`, `.gerr`): 8px under what it refuses, 13px, left-aligned. /join keeps its own `ERR`. */
export const SIGN_ERR = "m-0 mt-[8px] text-left text-[13px] leading-[1.45] text-[color:var(--danger)]";
/**
 * The code screens' refusal line (P4, P5, the reset code and N2): `SIGN_ERR` centred under the six boxes and no wider than
 * them (6 x 44px boxes and 5 x 8px gaps). Hugh's call (2026-11-11) over the board's left-aligned `.s7err` (Sign-In.dc.html).
 */
export const CODE_ERR = "m-0 mx-auto mt-[8px] w-full max-w-[304px] text-center text-[13px] leading-[1.45] text-[color:var(--danger)]";

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** A labelled field (`.jform label` over `.jfld`). `line` is whether a line shows under it; `danger` draws S3's edge. */
export function Field({ label, value, line, danger = false, locked, top = "", look, ...input }: {
  label: string;
  value: string;
  line: boolean;
  danger?: boolean;
  locked: boolean;
  /** The label's own top margin, where the board gives one. */
  top?: string;
  /** A page's own field classes, where its board draws the field otherwise (the sign-up's Q5 and R2). Defaults to `field`. */
  look?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "className">) {
  return (
    <label className={`${LABEL} ${top}`}>
      <span className="mb-[6px]">{label}</span>
      <input
        {...input} value={value} readOnly={locked} className={look ?? field(value.length > 0, locked, danger)}
        aria-invalid={line ? true : undefined} aria-describedby={line ? LINE_ID : undefined}
      />
    </label>
  );
}

/** Clerk's codes for a refusal: none for a 429 (the failed line, never a refusal) and anything that is not Clerk's answer. */
export function codesOf(error: unknown): string[] {
  if (!error || !isClerkAPIResponseError(error) || error.status === 429) return [];
  return error.errors.map((e) => e.code);
}
/** The first of `codesOf`, or `null`. */
export const codeOf = (error: unknown): string | null => codesOf(error)[0] ?? null;

/**
 * Q2 to Q4 (and K5's new password): the line for a password Clerk will not take, or `null` for any other refusal. A breached
 * password can come with the weak code too, so the breach is read first, from any of the answer's errors.
 */
export function passwordLine(error: unknown): string | null {
  const codes = codesOf(error);
  if (codes.includes("form_password_pwned")) return signInCopy.breached;
  if (codes.includes("form_password_not_strong_enough")) return signInCopy.tooWeak;
  if (codes.includes("form_password_length_too_short")) return signInCopy.tooShort;
  return null;
}

const fullLoad = (url: string) => {
  window.location.href = url;
};

/**
 * Clerk's `finalize` navigation to `to` (a destination `returnTo` already made safe), Home by default: a decorated URL that
 * leaves the app is a full load, the rest a router move. A session Clerk left pending on a session task goes to
 * `/sign-in/tasks/<key>` instead (`lib/auth/session-tasks.ts`), by a full load since it leaves for Clerk's hosted page: every
 * page behind `to` would read the pending session as signed out and send it back to sign in. The key is in our path only;
 * the hosted page works out the task from the session.
 */
export const toLanding = (go: (url: string) => void, to = HOME, load = fullLoad) => ({ session, decorateUrl }: {
  session?: { currentTask?: { key: string } | null } | null;
  decorateUrl: (url: string) => string;
}) => {
  const task = session?.currentTask;
  if (task) {
    load(decorateUrl(taskPath(task.key, new URL(to, window.location.origin).href)));
    return;
  }
  const url = decorateUrl(to);
  if (url.startsWith("http")) load(url);
  else go(url);
};

/** Coming back from Google through the back/forward cache restores the page as it was left, its press busy: `restored` frees it. */
export function useCacheRestore(restored: () => void) {
  useEffect(() => {
    const shown = (e: PageTransitionEvent) => {
      if (e.persisted) restored();
    };
    window.addEventListener("pageshow", shown);
    return () => window.removeEventListener("pageshow", shown);
    // `restored` is a fresh closure each render; the listener only needs adding once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
