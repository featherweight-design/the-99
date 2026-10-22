// `/friends`' Waiting on you (menu and Home PR 7; board `Friends`, 2a to 2c): the first section under the head, the
// feed's friend items as rows. Today a trade match ("Colin has a spare Ghalta") with a link to that friend's Spares
// tab; a spare request's Yes and No arrive with G5. Empty, the section is absent (the board's caption). The head counts
// every row the section shows; the bar's Friends badge counts only the unseen ones (product call 2), so the two differ
// once a /friends visit has seen a row. The time and a seen row's kind are in `--fg-faint` where the board draws
// `--fg-locked`, which reads about 3.1:1 on `--surface-inset` (PR 7b review): the diamond alone marks what is new.
import Link from "next/link";
import type { WaitingRow } from "../../lib/social/waiting";
import { elapsed } from "../../lib/decks/touched";
import { refreshCopy } from "../../lib/copy/refresh";
import { socialCopy } from "../../lib/copy/social";
import { FadingImg } from "../ui/hydrated-art";
import { PendingReporter } from "../shell/pending-reporter";
import { faceInitials } from "./face";

const w = socialCopy.waiting;

function ago(at: Date, now: Date): string {
  const e = elapsed(at, now);
  const c = refreshCopy.home.elapsed;
  return e.unit === "yesterday" ? c.yesterday
    : e.unit === "hours" ? c.hours(e.value)
    : e.unit === "days" ? c.days(e.value)
    : e.unit === "weeks" ? c.weeks(e.value)
    : c.months(e.value);
}

export function WaitingOnYou({ rows, now }: { rows: readonly WaitingRow[]; now: Date }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="waiting-on-you" data-testid="waiting-on-you" className="mt-[26px] md:mt-[34px]">
      <h2
        id="waiting-on-you"
        className="m-0 flex min-h-[44px] items-center font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--accent-text)] [border-bottom:1px_solid_var(--border)] md:min-h-[32px] md:pb-[8px]"
      >
        {w.head(rows.length)}
      </h2>
      <ul className="m-0 mt-[12px] flex list-none flex-col overflow-hidden rounded-[14px] bg-[color:var(--surface-inset)] p-0 [border:1px_solid_var(--border)]">
        {rows.map((r) => (
          <li
            key={r.key}
            data-testid="waiting-row"
            data-unseen={r.unseen ? "" : undefined}
            className="grid grid-cols-[46px_minmax(0,1fr)] gap-[12px] px-[14px] py-[12px] [&+&]:[border-top:1px_solid_var(--border)] md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-[14px] md:px-[16px]"
          >
            <span aria-hidden className="relative h-[64px] w-[46px]">
              {r.card.imageUri ? (
                <FadingImg src={r.card.imageUri} alt="" className="block h-[64px] w-[46px] rounded-[3px] object-cover shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
              ) : (
                <span className="block h-[64px] w-[46px] rounded-[3px] bg-[color:var(--surface-sunken)]" />
              )}
              <span className="absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1.5px_solid_var(--surface-inset)]">
                {r.friend.commander?.artCropUri
                  ? <FadingImg src={r.friend.commander.artCropUri} alt="" className="block h-full w-full object-cover" />
                  : faceInitials(r.friend.displayName)}
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-[3px]">
              <p className="m-0 flex min-w-0 items-center gap-[7px]">
                {r.unseen && (
                  <>
                    <span aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" />
                    <span className="sr-only">{w.unseen}</span>
                  </>
                )}
                <span className={`truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em] text-[color:var(--fg-faint)]`}>
                  {w.kind[r.kind]}
                </span>
                <small className="ml-auto flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">{ago(r.createdAt, now)}</small>
              </p>
              <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]">
                {w.tradeTitle(r.friend.displayName, r.card.name)}
              </p>
              <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">
                {w.tradeDetail(r.friend.displayName, r.pods)}
              </p>
              <WaitingLink row={r} className="mt-[6px] md:hidden" />
            </div>
            <WaitingLink row={r} className="hidden md:flex md:justify-end" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The board's `.lnk`: in the text column on a phone, the row's third column from desktop. */
function WaitingLink({ row, className }: { row: WaitingRow; className: string }) {
  return (
    <span className={className}>
      <Link
        href={`/friends/${row.friend.publicId}`}
        className="flex min-h-[32px] items-center gap-[4px] whitespace-nowrap text-[13px] font-medium text-[color:var(--accent-text)] no-underline"
      >
        {w.seeSpares(row.friend.displayName)}
        <span aria-hidden>›</span>
        <PendingReporter href={`/friends/${row.friend.publicId}`} />
      </Link>
    </span>
  );
}
