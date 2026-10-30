import { PendingReporter } from "../shell/pending-reporter";
import Link from "next/link";
import { flyerAdminCopy } from "../../lib/copy/admin";
import type { FlyerRowView, FlyersView } from "../../lib/admin/flyers-rule";

// The Flyer codes section on the Invites tab (flyer trial PR 4a; handoff Admin-Desktop A1, Admin-Phone P1): a row per
// code (Store, Code, Sign-ups with its bar, Group, Made, Print), revoked rows dimmed with their date, and the launch
// list's count. One markup for both widths: a two-column card on the phone, the six-column row from `md`. New flyer
// code and Revoke are the next PR's, so neither is drawn here.

const copy = flyerAdminCopy;
const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const MONO_FAINT = "font-mono text-[11px] text-[color:var(--fg-faint)]";
const TEXT_BUTTON = "inline-flex min-h-[44px] items-center whitespace-nowrap px-[6px] text-[13px] font-medium text-[color:var(--accent-text)] no-underline md:min-h-[32px]";

function Row({ row }: { row: FlyerRowView }) {
  const off = row.state === "revoked";
  const full = row.state === "full";
  return (
    <li
      data-flyer={row.code}
      data-state={row.state}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[10px] gap-y-[6px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] py-[12px] text-[13.5px] text-[color:var(--fg-body)] first:border-t-0 md:grid-cols-[minmax(0,1.5fr)_92px_minmax(0,1.3fr)_minmax(0,1fr)_84px_130px] md:gap-[14px] md:py-0 md:pl-[16px] md:pr-[10px] md:min-h-[56px]"
    >
      <span className={`truncate font-mono text-[15px] ${off ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}>{row.store}</span>
      <span className="justify-self-end md:justify-self-start">
        <span
          className={`inline-flex h-[24px] items-center rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[8px] font-mono text-[12px] tracking-[0.06em] ${off ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}
        >
          {row.code}
        </span>
      </span>
      <span className="flex flex-col gap-[5px]">
        <b className={`font-mono text-[12.5px] font-medium ${full ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]"}`}>
          {row.figure} <small className="font-mono text-[11px] font-normal text-[color:var(--fg-faint)]">{row.of}</small>
        </b>
        <i aria-hidden className="block h-[3px] overflow-hidden rounded-[2px] bg-[color:var(--border-strong)]">
          <u className={`block h-full no-underline ${full ? "bg-[color:var(--warning)]" : "bg-[color:var(--accent)]"}`} style={{ width: `${row.percent}%` }} />
        </i>
      </span>
      <span className="justify-self-end md:justify-self-start">
        {row.group && (
          <span className="inline-flex h-[26px] items-center whitespace-nowrap rounded-[6px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[9px] font-mono text-[12px] text-[color:var(--fg-body)]">
            {row.group}
          </span>
        )}
      </span>
      {/* The phone's made line is a revoked row's date instead; from `md` the Made column keeps the day it was made and
          a revoked row's note takes its actions' place. */}
      <span className={`col-span-2 leading-[14px] md:col-span-1 md:leading-normal ${MONO_FAINT}`}>
        <span className="md:hidden">{off ? row.revoked : row.made}</span>
        <span className="hidden md:inline">{row.made}</span>
      </span>
      {off ? (
        <span className={`hidden justify-end md:flex ${MONO_FAINT}`}>{row.revoked}</span>
      ) : (
        <span className="col-span-2 -mt-[4px] -mb-[8px] -ml-[6px] flex justify-start gap-[8px] md:col-span-1 md:m-0 md:justify-end">
          <Link href={`/admin/invites/flyers/${row.code}`} prefetch={false} className={TEXT_BUTTON}>
            {copy.print}
            <PendingReporter href={`/admin/invites/flyers/${row.code}`} />
          </Link>
        </span>
      )}
    </li>
  );
}

export function FlyerCodes({ view }: { view: FlyersView }) {
  const cols = copy.cols;
  return (
    <section aria-label={copy.section} data-testid="flyer-codes" className="flex flex-col gap-[12px] px-[16px] pt-[16px] md:px-[28px] md:pt-[22px]">
      <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] pt-[10px]">
        <h2 className="m-0 text-[15px] font-semibold text-[color:var(--fg)]">{copy.section}</h2>
        <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{view.meta}</small>
      </div>
      {view.rows.length > 0 && (
        <div className={CARD}>
          <div
            aria-hidden
            className="hidden min-h-[36px] grid-cols-[minmax(0,1.5fr)_92px_minmax(0,1.3fr)_minmax(0,1fr)_84px_130px] items-center gap-[14px] bg-[color:var(--surface-rail)] pl-[16px] pr-[10px] font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] md:grid"
          >
            <span>{cols.store}</span>
            <span>{cols.code}</span>
            <span>{cols.signups}</span>
            <span>{cols.group}</span>
            <span>{cols.made}</span>
            <span />
          </div>
          <ul role="list" className="m-0 list-none p-0">
            {view.rows.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </ul>
        </div>
      )}
      <div className={`${CARD} flex min-h-[56px] flex-col justify-center gap-[3px] px-[14px] py-[10px] md:px-[16px]`} data-testid="launch-list-card">
        <b className="text-[14px] font-semibold text-[color:var(--fg)]">{view.launch.title}</b>
        <span className={MONO_FAINT}>{view.launch.meta}</span>
      </div>
    </section>
  );
}
