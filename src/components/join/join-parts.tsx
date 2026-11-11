// The newcomer's shared pieces: the presses, links, field, lines and six code boxes that `/join` (boards N1 to N12) and the
// in-app sign-in (Small items 11 A2, boards P1 to P8) both draw, so the two pages are one visual system and not two copies.

import { useEffect, type ChangeEvent, type RefObject } from "react";
import { CODE_LENGTH } from "../../lib/invites/rules";

// The boards' presses are 100% x 48px at every width (`.b1`, `.b2`): the friend landing's own button is 44px from `md`.
// `top` is the press's own top margin, kept in place in the class string so every press reads the same as before.
const pressAt = (top: string) =>
  `box-border ${top} inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] font-sans text-[15px] no-underline disabled:cursor-default`;
export const PRESS = pressAt("mt-[14px]");
export const press = (state: "ready" | "busy" = "ready") =>
  `${PRESS} border-0 font-semibold text-[color:var(--bg)] ${state === "busy" ? "bg-[color:var(--accent-strong)]" : "bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] disabled:opacity-60 disabled:hover:bg-[color:var(--accent)]"}`;
/** The outline press (`.b2`, `.jbtn.q`), 8px under what it follows unless a board gives it another `top`. */
export const quietPress = (top = "mt-[8px]") =>
  `${pressAt(top)} bg-transparent font-medium text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] disabled:opacity-60`;
/** N5: the boxes are empty, so Confirm steps back to the outline (`.b2`). */
export const PRESS_QUIET = quietPress();
export const link = (cooling: boolean) =>
  `inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[8px] font-sans text-[13.5px] font-medium no-underline disabled:cursor-default ${cooling ? "text-[color:var(--fg-locked)]" : "text-[color:var(--accent-text)] hover:text-[color:var(--accent-hover)] disabled:opacity-60"}`;
/** The row of links under a press (`.jlinks`). */
export const LINKS = "mt-[6px] flex flex-wrap items-center justify-center gap-[4px]";
// N11, N12: the sign-in link inside the quiet mono line.
export const QUIET_LINK = "cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] text-[color:var(--accent-text)] no-underline hover:text-[color:var(--accent-hover)]";
export const QUIET = "m-0 mt-[22px] text-center font-mono text-[11px] leading-[1.55] text-[color:var(--fg-faint)]";
export const ERR = "m-0 mt-[10px] text-center text-[12.5px] leading-[1.45] text-[color:var(--danger)]";
/**
 * `locked` is /join's read-only field, in the muted ink; `"held"` is the sign-up's Q5 while Clerk answers (`.jfld` without
 * `.on`), in the locked ink. `danger` is S3's edge on a field whose line refused it (the sign-in's P3 and K5).
 */
export const field = (typed: boolean, locked: boolean | "held", danger = false) =>
  `box-border h-[48px] w-full rounded-[8px] bg-[color:var(--surface-sunken)] px-[12px] font-sans text-[16px] outline-none placeholder:text-[color:var(--fg-placeholder)] focus:[border-color:var(--accent)] ${locked === "held" ? "text-[color:var(--fg-locked)]" : locked ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"} ${danger ? "[border:1px_solid_var(--danger)]" : typed ? "[border:1px_solid_var(--accent)]" : "[border:1px_solid_var(--border-strong)]"}`;

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The resend countdown ticks only while it counts. */
export function useTicking(waiting: boolean, tick: () => void) {
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // `tick` is a fresh closure each render; the interval only needs starting and stopping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);
}

/** S2's six boxes over one transparent field: the boxes draw what the field holds. Only a wrong code is drawn in danger. */
export function CodeBoxes({
  digits,
  label,
  wrong,
  busy,
  describedBy,
  inputRef,
  onChange,
}: {
  digits: string;
  label: string;
  wrong: boolean;
  busy: boolean;
  /** The line's id while one shows. */
  describedBy?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div role="group" aria-label={label} className="group relative">
      <div aria-hidden className="flex justify-center gap-[8px]">
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`box-border flex h-[54px] w-[44px] items-center justify-center rounded-[8px] bg-[color:var(--surface-sunken)] font-mono text-[22px] font-semibold ${digits[i] ? "text-[color:var(--fg)]" : "text-[color:var(--fg-disabled)]"} ${wrong ? "[border:1px_solid_var(--danger)]" : digits[i] ? "[border:1px_solid_var(--accent)]" : "[border:1px_solid_var(--border-strong)]"} ${i === Math.min(digits.length, CODE_LENGTH - 1) ? "group-focus-within:shadow-[0_0_0_2px_var(--accent)]" : ""}`}
          >
            {digits[i] ?? "·"}
          </span>
        ))}
      </div>
      <input
        ref={inputRef} value={digits} readOnly={busy} inputMode="numeric" autoComplete="one-time-code"
        aria-label={label} aria-invalid={describedBy ? true : undefined} aria-describedby={describedBy}
        className="absolute inset-0 h-full w-full cursor-text border-0 bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        onChange={onChange}
      />
    </div>
  );
}
