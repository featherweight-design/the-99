// Live password strength (Small items 11 addendum R1c): the panel under a new password, on Q1 (`/sign-up`) and K5 (choose a
// new password on `/sign-in`). A three-segment meter with its word, the hint's slot for a line, three guides shown from the
// empty field, and the one polite line screen readers hear. The guides are guidance; only the estimator moves the meter
// (`use-password-strength.ts`), and Clerk's answer on the press still wins: a refusal (Q2 to Q4) takes the slot under the
// meter, which empties, and the guides stay under it.

import type { Strength, StrengthReading } from "../../lib/auth/password";
import { strengthCopy } from "../../lib/copy/strength";
import { SEGMENT } from "../ui/segment";
import { HINT, LINE_ID, SIGN_ERR } from "./auth-parts";

/** The guides list's id: the password field's `aria-describedby` names it (G2). */
export const STRENGTH_ID = "password-strength";

const LIT: Record<Strength, number> = { short: 0, weak: 1, good: 2, strong: 3 };
/** The landing demo's segment (`SEGMENT`) over `--border-strong`; weak is quiet ink before any press (call 4), Good and Strong the accent. */
const INK: Record<Strength, string> = {
  short: "bg-[color:var(--border-strong)]",
  weak: "bg-[color:var(--fg-muted)]",
  good: "bg-[color:var(--accent)]",
  strong: "bg-[color:var(--accent)]",
};
const KEYS = ["length", "numberOrSymbol", "common"] as const;
const WORDS = { length: strengthCopy.guides.length, numberOrSymbol: strengthCopy.guides.mix, common: strengthCopy.guides.common };

/** A 14px round mark: a ring in `--fg-faint` until met, then `--accent` with the checkbox's `✓` in `--bg`. Round, so it never reads as a box to press. */
function Mark({ met }: { met: boolean }) {
  return (
    <span
      aria-hidden
      data-mark={met ? "met" : "open"}
      className={`flex h-[14px] w-[14px] flex-none items-center justify-center rounded-full text-[9px] font-bold leading-none text-[color:var(--bg)] ${met ? "bg-[color:var(--accent)]" : "[border:1.5px_solid_var(--fg-faint)]"}`}
    >
      {met ? "✓" : ""}
    </span>
  );
}

export function StrengthPanel({ reading, line, verdict, live }: {
  reading: StrengthReading;
  /** The line in the hint's slot: Clerk's refusal (Q2 to Q4), or on K5 the failed line. */
  line: string | null;
  /** The line is Clerk's verdict on the password: the meter empties. K5's failed line is not, so the meter keeps its reading. */
  verdict: boolean;
  /** The polite screen-reader line (`usePasswordStrength`). */
  live: string;
}) {
  const strength: Strength = line && verdict ? "short" : reading.strength;
  const lit = LIT[strength];
  const word = strength === "short" ? "" : strengthCopy.word[strength];
  const allMet = KEYS.every((k) => reading.guides[k]);
  return (
    <>
      <div className="mt-[8px] flex items-center gap-[10px]">
        <div aria-hidden data-strength={strength} className="flex flex-1 gap-[4px]">
          {[0, 1, 2].map((i) => (
            <span key={i} data-on={i < lit || undefined} className={`${SEGMENT} ${i < lit ? INK[strength] : INK.short}`} />
          ))}
        </div>
        <span
          aria-hidden
          className={`w-[44px] text-right text-[12.5px] font-semibold leading-none ${strength === "weak" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--accent-text)]"}`}
        >
          {word}
        </span>
      </div>
      {line && <p id={LINE_ID} role="alert" className={SIGN_ERR}>{line}</p>}
      {/* `role="list"`: Safari drops a list's semantics once its bullets are styled away. */}
      <ul id={STRENGTH_ID} role="list" className="m-0 mt-[8px] flex list-none flex-col gap-[6px] p-0">
        {KEYS.map((k) => (
          <li
            key={k}
            data-guide={k}
            data-met={reading.guides[k] || undefined}
            className={`flex items-center gap-[8px] text-left text-[12.5px] leading-[1.45] ${reading.guides[k] ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-muted)]"}`}
          >
            <Mark met={reading.guides[k]} />
            {WORDS[k]}
            <span className="sr-only">{reading.guides[k] ? strengthCopy.guideDone : strengthCopy.guideNotYet}</span>
          </li>
        ))}
      </ul>
      {/* Call 5: all ticked and still weak, the one case the guides cannot explain. */}
      {!line && allMet && reading.strength === "weak" && <p className={HINT}>{strengthCopy.stillWeak}</p>}
      <p className="sr-only" aria-live="polite" data-strength-live="">{live}</p>
    </>
  );
}
