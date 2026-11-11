"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { loadMore, markRead } from "../../app/admin/feedback/actions";
import type { FeedbackRead } from "../../lib/admin/feedback";
import {
  relativeTime,
  summaryOf,
  type CheckInAnswers,
  type FeedbackFilter,
  type FeedbackRow,
  type ProblemAnswers,
} from "../../lib/admin/feedback-rule";
import { feedbackAdminCopy as copy } from "../../lib/copy/admin";
import { usePublishedHeight } from "./admin-head";

// The Feedback tab (flyer trial, board 11; `Admin-Feedback.dc.html` F1 desktop, F2 phone). One component at both widths.
// The shell scrolls the document, so the pill row and summary are pinned under the head at `--admin-head-h`, as on
// Accounts.
//
// PRIVACY (the owner assumes abuse): every free-text answer and every name is rendered as a plain React text child (no
// markup, no markdown, no links) under `ph-no-capture`, so PostHog's autocapture never reads it. No email and no account
// id reaches this component: a row carries the masked name and its own uuid, which is also its key.

const PIN_HEIGHT_VAR = "--admin-pin-h";
const NO_CAPTURE = "ph-no-capture";
const PILLS: { filter: FeedbackFilter; label: string; count: keyof FeedbackRead["counts"] }[] = [
  { filter: "all", label: copy.pills.all, count: "all" },
  { filter: "problem", label: copy.pills.problems, count: "problem" },
  { filter: "check_in", label: copy.pills.checkIns, count: "check_in" },
];

const ICON = { width: 16, height: 16, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function ago(nowMs: number, iso: string): string {
  const t = relativeTime(nowMs, Date.parse(iso));
  switch (t.kind) {
    case "minutes":
      return copy.ago.minutes(t.n);
    case "hours":
      return copy.ago.hours(t.n);
    case "yesterday":
      return copy.ago.yesterday;
    case "date":
      return copy.ago.date(t.month, t.day);
  }
}

/** A line of a row's definition list; an empty answer draws the faint stand-in. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[10.5px] uppercase leading-[20px] tracking-[0.06em] text-[color:var(--fg-faint)]">{label}</dt>
      <dd className={`${NO_CAPTURE} m-0 mb-[6px] text-[color:var(--fg-body)] [overflow-wrap:anywhere] md:mb-0`}>{children}</dd>
    </>
  );
}
const Faint = ({ children }: { children: ReactNode }) => <span className="text-[color:var(--fg-faint)]">{children}</span>;

function Problem({ a }: { a: ProblemAnswers }) {
  return (
    <>
      <Field label={copy.fields.what}>{a.what || <Faint>{copy.notGiven}</Faint>}</Field>
      <Field label={copy.fields.doing}>{a.doing || <Faint>{copy.notGiven}</Faint>}</Field>
    </>
  );
}

function CheckIn({ a }: { a: CheckInAnswers }) {
  return (
    <>
      <Field label={copy.fields.rating}>
        {a.rating === null ? (
          copy.noAnswer
        ) : (
          <>
            <b className="font-medium text-[color:var(--fg)]">{a.rating}</b> {copy.ratingOf}
          </>
        )}
      </Field>
      <Field label={copy.fields.uses}>{a.uses.length ? a.uses.join(", ") : copy.noAnswer}</Field>
      <Field label={copy.fields.pod}>{a.pod || copy.noAnswer}</Field>
      <Field label={copy.fields.more}>{a.note || copy.noAnswer}</Field>
    </>
  );
}

/** Problems only, in the board's order: page path, error code, device, where it was filed from. */
function contextChips(row: FeedbackRow): string[] {
  const from = row.source === "error" ? copy.contextSource.error : row.source === "about" ? copy.contextSource.about : null;
  return [row.page, row.digest ? copy.errorDigest(row.digest) : null, row.device, from].filter((c): c is string => !!c);
}

function Row({ row, unread, nowMs, onOpen }: { row: FeedbackRow; unread: boolean; nowMs: number; onOpen: () => void }) {
  const problem = row.kind === "problem";
  const chips = problem ? contextChips(row) : [];
  return (
    <li
      data-feedback={row.id}
      data-unread={unread ? "" : undefined}
      onClick={unread ? onOpen : undefined}
      className="flex gap-[12px] border-0 border-solid border-[color:var(--border)] px-[16px] py-[14px] [border-top-width:1px] first:[border-top-width:0]"
    >
      <span
        className={`relative inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] border border-solid ${
          problem
            ? "border-[color:color-mix(in_srgb,var(--warning)_45%,var(--border-strong))] text-[color:var(--warning)]"
            : "border-[color:color-mix(in_srgb,var(--fact)_45%,var(--border-strong))] text-[color:var(--fact)]"
        }`}
      >
        {problem ? (
          <svg {...ICON}>
            <path d="M10 2.8 17.4 16H2.6z" />
            <path d="M10 8v3.6" />
            <path d="M10 13.6v.2" />
          </svg>
        ) : (
          <svg {...ICON}>
            <path d="M3.5 4.5h13v9h-7l-3.6 2.8v-2.8H3.5z" />
          </svg>
        )}
        {unread && (
          // The unread dot is the press target for a keyboard or a screen reader; a press anywhere on the row also opens it.
          <button
            type="button"
            aria-label={copy.markReadLabel}
            className="absolute right-[-3px] top-[-3px] m-0 h-[8px] w-[8px] cursor-pointer rounded-full border-0 bg-[color:var(--accent)] p-0 shadow-[0_0_0_2px_var(--surface)] before:absolute before:inset-[-18px] before:content-['']"
          />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <div className="flex flex-wrap items-baseline gap-[8px]">
          <b className={`${NO_CAPTURE} text-[14px] font-semibold text-[color:var(--fg)] [overflow-wrap:anywhere]`}>{row.name ?? copy.signedOut}</b>
          <small className="font-mono text-[11px] text-[color:var(--fg-faint)]">{problem ? copy.kinds.problem : copy.kinds.checkIn}</small>
          {row.name !== null && row.group && (
            <span className={`${NO_CAPTURE} inline-flex h-[22px] items-center rounded-[6px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[9px] font-mono text-[11px] text-[color:var(--fg-body)]`}>
              {row.group}
            </span>
          )}
          <small className="ml-auto font-mono text-[11px] text-[color:var(--fg-faint)]">{ago(nowMs, row.at)}</small>
        </div>
        <dl className="m-0 grid grid-cols-1 gap-x-[14px] gap-y-[2px] text-[13.5px] leading-[1.5] md:grid-cols-[150px_minmax(0,1fr)] md:gap-y-[4px]">
          {problem ? <Problem a={row.answers as ProblemAnswers} /> : <CheckIn a={row.answers as CheckInAnswers} />}
        </dl>
        {chips.length > 0 && (
          <div data-feedback-chips="" className="flex flex-wrap gap-[6px]">
            {chips.map((c, i) => (
              <span
                key={i}
                className={`${NO_CAPTURE} inline-flex h-[22px] items-center rounded-[5px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[7px] font-mono text-[10.5px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]`}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export function FeedbackList({ filter, read, nowMs }: { filter: FeedbackFilter; read: FeedbackRead; nowMs: number }) {
  const [more, setMore] = useState<FeedbackRow[]>([]);
  const [hasMore, setHasMore] = useState(read.hasMore);
  const [moreFailed, setMoreFailed] = useState(false);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [loading, startLoading] = useTransition();
  // Ids an open is in flight for, so a press on the dot (which bubbles to the row) sends one write.
  const sent = useRef(new Set<string>());
  const pinRef = useRef<HTMLDivElement>(null);
  usePublishedHeight(pinRef, PIN_HEIGHT_VAR);

  const rows = [...read.rows, ...more.filter((m) => !read.rows.some((r) => r.id === m.id))];
  const unreadOf = (r: FeedbackRow) => r.unread && !opened.has(r.id);
  // The count falls by one per row this page opened; rows the server already counted read are never subtracted.
  const fresh = Math.max(0, read.fresh - rows.filter((r) => r.unread && opened.has(r.id)).length);
  const { avg } = summaryOf(fresh, read.avg);
  const summary = avg === null ? copy.summaryNoAverage(fresh) : copy.summary(fresh, avg.toFixed(1));

  const open = (id: string) => {
    if (sent.current.has(id)) return;
    sent.current.add(id);
    setOpened((prev) => new Set(prev).add(id));
    const revert = () => {
      sent.current.delete(id);
      setOpened((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };
    markRead(id).then((res) => (res.ok ? undefined : revert()), revert);
  };

  const next = () => {
    setMoreFailed(false);
    startLoading(async () => {
      let res: Awaited<ReturnType<typeof loadMore>>;
      try {
        res = await loadMore(filter, rows.length);
      } catch {
        res = { ok: false };
      }
      if (!res.ok) return setMoreFailed(true);
      setMore((prev) => {
          // A row filed since the first page shifts the window: keep each row once, against every page held.
          const held = new Set([...read.rows, ...prev].map((r) => r.id));
          return [...prev, ...res.rows.filter((r) => !held.has(r.id))];
        });
      setHasMore(res.hasMore);
    });
  };

  return (
    <>
      <div
        ref={pinRef}
        className="sticky top-[calc(var(--header-offset,0px)+var(--admin-head-h,0px))] z-[1] flex flex-none flex-wrap items-center gap-[8px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[16px] md:px-[28px] md:pt-[22px]"
      >
        <nav aria-label={copy.filterLabel} className="contents">
          {PILLS.map((p) => {
            const on = p.filter === filter;
            const href = p.filter === "all" ? "/admin/feedback" : `/admin/feedback?filter=${p.filter}`;
            return (
              <Link
                key={p.filter}
                href={href}
                aria-current={on ? "page" : undefined}
                scroll={false}
                className={`relative inline-flex h-[32px] items-center gap-[7px] rounded-full border border-solid px-[12px] text-[13px] no-underline before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-[''] md:before:hidden ${
                  on
                    ? "border-[color:var(--fg-faint)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
                    : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
                }`}
              >
                {p.label}
                <PendingReporter href={href} />
                <small className="font-mono text-[11px] text-[color:var(--fg-faint)]">{read.counts[p.count]}</small>
              </Link>
            );
          })}
        </nav>
        <span aria-live="polite" data-testid="feedback-summary" className="basis-full font-mono text-[11px] text-[color:var(--fg-faint)] md:ml-auto md:basis-auto">
          {summary}
        </span>
      </div>
      <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] md:px-[28px] md:pb-[40px]">
        {rows.length === 0 ? (
          <p className="m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-muted)]">{copy.empty}</p>
        ) : (
          <ul aria-label={copy.listLabel} className="m-0 list-none overflow-clip rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-0">
            {rows.map((r) => (
              <Row key={r.id} row={r} unread={unreadOf(r)} nowMs={nowMs} onOpen={() => open(r.id)} />
            ))}
          </ul>
        )}
        {moreFailed && <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--warning)]">{copy.loadFailed}</p>}
        {hasMore && (
          <button
            type="button"
            onClick={next}
            disabled={loading}
            aria-busy={loading || undefined}
            className="inline-flex h-[44px] cursor-pointer items-center justify-center self-start rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[13.5px] font-medium text-[color:var(--fg)] disabled:opacity-60 md:h-[38px]"
          >
            {copy.loadMore}
          </button>
        )}
      </div>
    </>
  );
}
