// The newcomer's column (invites R1 PR 5; boards `R1 - Newcomer` N1 to N12 and `R1 - Invite-Only` I1, I2): one
// centred column under a 150×210 card; the invite-only page's column is left-aligned beside its fan from `md` (I1). `/join` and `/sign-up` draw it; the friend landing keeps its
// own `LandingColumn`. `variant` picks the type scale: the join steps are one scale at every width, the invite-only
// page steps up at `md`.

import type { ReactNode } from "react";
import type { Parts } from "../../lib/copy/join";
import { Emphasis } from "./emphasis";

/** The page frame both pages share: top-aligned, padding 44/24/24/24, the accent wash at 50% 18%. */
export const NEWCOMER_MAIN =
  "flex min-h-dvh flex-col items-center bg-[color:var(--bg)] bg-[radial-gradient(600px_360px_at_50%_18%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_70%)] px-[24px] pb-[24px] pt-[44px] text-center";

/** The invite-only page's frame (I1, I2): 56px under the top on a phone, the fan beside the column from `md`, under
 * the desktop frame's own wash (1000×520 at 50% 8%, the accent at 10%; pr5 table, Shared ground). */
export const INVITE_MAIN =
  NEWCOMER_MAIN.replace("pt-[44px]", "pt-[56px]") +
  " md:flex-row md:justify-center md:gap-[64px] md:bg-[radial-gradient(1000px_520px_at_50%_8%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_70%)]";

/** The form wrapper (`.form`): full width, left-aligned, 22px under the body. */
export const FORM = "mt-[22px] flex w-full flex-col text-left";

const H1 = {
  join: "mt-[28px] text-[22px] leading-[1.25]",
  invite: "mt-[6px] text-[24px] leading-[1.2] md:mt-0 md:text-[30px]",
} as const;
/** The column itself: centred, and for the invite-only page left-aligned from `md`, as I1's `.col` draws it. */
const COLUMN = {
  join: "items-center text-center",
  invite: "items-center text-center md:items-stretch md:text-left",
} as const;
const BODY = {
  join: "mt-[8px] text-[14px] leading-[1.55]",
  invite: "mt-[8px] text-[14px] leading-[1.6] md:mt-[10px] md:text-[15px]",
} as const;
const FINE = {
  join: "mt-[14px] text-[11px] leading-[1.55]",
  invite: "mt-[16px] text-[11px] leading-[1.6] md:mt-[16px]",
} as const;

export function NewcomerColumn({
  variant,
  kicker,
  title,
  body,
  actions,
  fine,
  landing,
}: {
  variant: "join" | "invite";
  /** Shown from `md` up only (the invite-only page); the join steps draw none. */
  kicker?: string;
  title: string;
  body?: string | Parts;
  actions: ReactNode;
  fine?: string;
  landing?: "wait" | "go";
}) {
  // Everything under the card lands with it: the heading, the body, the actions and the fine print.
  const land = landing === "go" ? "friend-land-in" : landing === "wait" ? "friend-land-wait" : "";
  return (
    <section
      aria-labelledby="friend-landing-title"
      className={`flex w-full min-w-0 max-w-[380px] flex-col ${COLUMN[variant]} [overflow-wrap:anywhere]`}
    >
      {kicker && (
        <p className="m-0 mb-[10px] font-mono text-[11px] font-medium leading-[normal] uppercase tracking-[.2em] text-[color:var(--accent)] max-md:hidden">{kicker}</p>
      )}
      <h1 id="friend-landing-title" tabIndex={-1} className={`m-0 font-display font-bold text-[color:var(--fg)] outline-none ${H1[variant]} ${land}`}>
        {title}
      </h1>
      {body && (
        <p className={`m-0 font-sans text-[color:var(--fg-body)] ${BODY[variant]} ${land}`}>
          <Emphasis parts={body} />
        </p>
      )}
      <div className={`flex w-full flex-col ${land}`}>{actions}</div>
      {fine && <p className={`m-0 font-mono text-[color:var(--fg-faint)] ${FINE[variant]} ${land}`}>{fine}</p>}
    </section>
  );
}
