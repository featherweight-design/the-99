// Live password strength (design R1, 2026-11-15, DRAFT, reference only). The meter and the live line sit in the hint's
// slot under a new password (Q1 on /sign-up, K5 on /sign-in). Clerk's answer on the press still wins: a refusal (Q2 to Q4)
// takes the line's place and empties the meter, so nothing reads as good for a password Clerk refused.
import { HINT, MIN_PASSWORD, SIGN_ERR, LINE_ID } from "./auth-parts";
import { strengthCopy, type WeakReason } from "../../lib/copy/strength";

/** `short`: under MIN_PASSWORD (no estimate yet). The rest come from an estimator that agrees with Clerk's level 2. */
export type Strength = "short" | "weak" | "good" | "strong";
export const STRENGTH_ID = "password-strength";

/** How many of the three segments light, and in which ink. Weak is quiet ink, never `--danger`, before any press. */
const LIT: Record<Strength, number> = { short: 0, weak: 1, good: 2, strong: 3 };
const INK: Record<Strength, string> = { short: "var(--border-strong)", weak: "var(--fg-muted)", good: "var(--accent)", strong: "var(--accent)" };

export const strengthOf = (password: string, score: (p: string) => 0 | 1 | 2 | 3 | 4): Strength =>
  password.length < MIN_PASSWORD ? "short" : score(password) < 2 ? "weak" : score(password) < 4 ? "good" : "strong";

/** `refusal`: Clerk's line after a press (Q2 to Q4), shown in the live line's place until the next keystroke. */
/** `reason`: what the estimator found in a weak password (its match patterns), so the line names the fix for THIS password. */
export function StrengthLine({ strength, reason = "other", refusal, hidden = false }: { strength: Strength; reason?: WeakReason; refusal: string | null; hidden?: boolean }) {
  if (hidden) return null;
  const lit = refusal ? 0 : LIT[strength];
  return (
    <>
      {/* The landing demo's segment (`demo.tsx`): 4px, rounded 2px, `--border-strong` until lit. */}
      <div aria-hidden className="mt-[8px] flex gap-[4px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[4px] flex-1 rounded-[2px]" style={{ background: i < lit ? INK[strength] : "var(--border-strong)" }} />
        ))}
      </div>
      {refusal ? (
        <p id={LINE_ID} role="alert" className={SIGN_ERR.replace("mt-[8px]", "mt-[6px]")}>{refusal}</p>
      ) : (
        <p id={STRENGTH_ID} aria-live="polite" className={HINT}>{strength === "weak" ? strengthCopy.weak[reason] : strengthCopy[strength]}</p>
      )}
    </>
  );
}
