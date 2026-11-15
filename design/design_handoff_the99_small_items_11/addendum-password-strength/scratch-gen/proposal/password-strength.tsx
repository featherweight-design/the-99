// Live password strength (design R1c, 2026-11-15, DRAFT, reference only). Under a new password (Q1 on /sign-up, K5 on
// /sign-in): a three-segment meter with its word, then three guides shown from the empty field that tick as the player
// types. Ticks are guidance; the meter's step comes from the estimator (agreeing with Clerk's level 2), and Clerk's answer on
// the press still wins: a refusal (Q2 to Q4) shows under the meter, which empties, and the guides stay under it.
import { MIN_PASSWORD, SIGN_ERR, LINE_ID, HINT } from "./auth-parts";
import { strengthCopy } from "../../lib/copy/strength";

export type Strength = "short" | "weak" | "good" | "strong";
export type Guides = { length: boolean; mix: boolean; common: boolean };
export const STRENGTH_ID = "password-strength";

const LIT: Record<Strength, number> = { short: 0, weak: 1, good: 2, strong: 3 };
const INK: Record<Strength, string> = { short: "var(--border-strong)", weak: "var(--fg-muted)", good: "var(--accent)", strong: "var(--accent)" };

/** `length` and `mix` are read from the characters; `common` only once there are 8 and the estimator matched no dictionary
 * word, name, date, run or repeat. */
export const guidesOf = (password: string, patterns: readonly string[] | null): Guides => ({
  length: password.length >= MIN_PASSWORD,
  mix: /[^A-Za-z\s]/.test(password),
  common: password.length >= MIN_PASSWORD && !!patterns && patterns.length === 0,
});

/** A 14px round mark: a ring until met, then `--accent` with the checkbox's `✓` in `--bg`. Round, so it never reads as a box to press. */
function Mark({ met }: { met: boolean }) {
  return (
    <span aria-hidden className={`flex h-[14px] w-[14px] flex-none items-center justify-center rounded-full text-[9px] font-bold leading-none text-[color:var(--bg)] ${met ? "bg-[color:var(--accent)]" : "[border:1.5px_solid_var(--fg-faint)]"}`}>
      {met ? "✓" : ""}
    </span>
  );
}

export function StrengthPanel({ strength, guides, refusal, hidden = false }: { strength: Strength; guides: Guides; refusal: string | null; hidden?: boolean }) {
  if (hidden) return null;
  const lit = refusal ? 0 : LIT[strength];
  const word = refusal || strength === "short" ? "" : strengthCopy.word[strength];
  const keys = ["length", "mix", "common"] as const;
  const allMet = keys.every((k) => guides[k]);
  return (
    <>
      {/* The landing demo's segment (`demo.tsx`), and the word at its end in the hint's ink. */}
      <div className="mt-[8px] flex items-center gap-[10px]">
        <div aria-hidden className="flex flex-1 gap-[4px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-[4px] flex-1 rounded-[2px]" style={{ background: i < lit ? INK[strength] : "var(--border-strong)" }} />
          ))}
        </div>
        <span aria-hidden className="w-[44px] text-right text-[12.5px] font-semibold leading-none" style={{ color: strength === "weak" ? "var(--fg-muted)" : "var(--accent-text)" }}>{word}</span>
      </div>
      {/* Q2 to Q4: Clerk's line under the meter, in the same slot as today; the guides stay under it, so what to change stays in view. */}
      {refusal && <p id={LINE_ID} role="alert" className={SIGN_ERR}>{refusal}</p>}
      {(
        <>
          <ul id={STRENGTH_ID} className="m-0 mt-[8px] flex list-none flex-col gap-[6px] p-0">
            {keys.map((k) => (
              <li key={k} className={`flex items-center gap-[8px] text-left text-[12.5px] leading-[1.45] ${guides[k] ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-muted)]"}`}>
                <Mark met={guides[k]} />
                {strengthCopy.guides[k]}
                <span className="sr-only">{guides[k] ? ", done" : ", not yet"}</span>
              </li>
            ))}
          </ul>
          {!refusal && allMet && strength === "weak" && <p className={HINT}>{strengthCopy.stillWeak}</p>}
        </>
      )}
    </>
  );
}
