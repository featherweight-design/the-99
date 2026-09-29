// The choose route's header: the way back, the title and its two subs. Shared by the page and its
// loading screen, so the screen a reader waits on is the one the page then fills.
import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";

/**
 * The results column: §4's 1080 content (1160 less its 40px sides), CENTERED under the form's 680
 * column rather than pinned left (Hugh, 2026-09-27; ruling Q2b (a), keeping §4's width and its row
 * grid). The page and its loading screen both draw it, so the loader holds the page's position. It lives here,
 * in a module with no `'use client'`, because the page is a Server Component: a value imported from a
 * client module crosses as a client reference, not as the string.
 */
export const RESULTS_COLUMN =
  "flex flex-col gap-[14px] md:gap-[18px] w-full max-w-[1160px] mx-auto p-[16px_18px_24px] md:p-[0_40px_48px]";

export function ChooseHeader({
  back,
  title,
  sub,
  subPhone,
  centered = false,
}: {
  back: { href: string; label: string };
  title: string;
  sub: string;
  subPhone: string;
  centered?: boolean;
}) {
  return (
    <header
      className={[
        "flex flex-col gap-[3px] md:gap-[6px] p-[20px_18px_14px] border-0 border-b border-solid border-[color:var(--border)] md:border-b-0",
        centered
          ? "md:w-[680px] md:max-w-full md:mx-auto md:p-[34px_0_26px]"
          : // The results header shares `RESULTS_COLUMN`'s box, so it centers with the results.
            "md:w-full md:max-w-[1160px] md:mx-auto md:p-[34px_40px_26px]",
      ].join(" ")}
    >
      <Link href={back.href} className="self-start font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
        {back.label}
        <PendingReporter href={back.href} />
      </Link>
      <h1 className="m-0 font-display font-bold text-[20px] md:text-[28px] text-[color:var(--fg)]">{title}</h1>
      <p className="m-0 md:hidden font-mono text-[10px] text-[color:var(--fg-faint)]">{subPhone}</p>
      <p className="m-0 hidden md:block max-w-[640px] text-[14px] text-[color:var(--fg-muted)]">{sub}</p>
    </header>
  );
}
