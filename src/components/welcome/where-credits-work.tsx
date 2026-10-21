"use client";
// `Where credits work` (welcome credits R2, board `R2-Sheet`): the list of what spends a welcome credit, in the shipped
// SocialModal at its 440 default (the board's 460 is a misread of the shipped widths; READINESS audit). Opened from Home's
// strip and from the /credits Welcome cell. The title, R4's L6 line (reused, identical to /credits), the grant line with
// its date (the free credit goes first), the five rows as name, where and cost, the lock or reason line once, and the
// teaser at the foot while `teaser` (absent, never disabled, otherwise; never from /credits, where the reader already is).

import Link from "next/link";
import type { RefObject } from "react";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { sheetDay, welcomeCreditsCopy, type LeadLine } from "../../lib/copy/welcome-credits";
import type { SheetRow, WelcomeFacts, WelcomeSheet } from "../../lib/payments/welcome-sheet";
import { PendingReporter } from "../shell/pending-reporter";
import { SocialModal } from "../social/social-modal";
import { useHydrated } from "../ui/hydrated-art";
import { Lock } from "../ui/lock";

/**
 * A lot's date in the reader's own day (G4), as the /credits Free cell draws its reset time: after hydration. Until then
 * `ready` is false and `text` is the UTC day, which the server and the hydrating render agree on, drawn `invisible` by
 * the caller so the line keeps its room and never shows a day that is not the reader's.
 */
export function useLocalDay(ms: number, format: (at: Date, timeZone?: string) => string): { text: string; ready: boolean } {
  const hydrated = useHydrated();
  return hydrated ? { text: format(new Date(ms)), ready: true } : { text: format(new Date(ms), "UTC"), ready: false };
}

const c = welcomeCreditsCopy.sheet;

/** The grant line's words for the lot's state. A used-up lot opens no sheet; it reads as what is left. */
export function grantLine(facts: WelcomeFacts, day: string): LeadLine {
  if (facts.lot === "expiring") return c.expiring(facts.left, facts.days, day, facts.free);
  if (facts.lot === "held") return c.held(facts.left, day, facts.free);
  return c.partly(facts.left, facts.units, day, facts.free);
}

function Row({ row }: { row: SheetRow }) {
  return (
    <li data-welcome-row={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[12px] gap-y-[3px] border-t border-t-[color:var(--border)] py-[10px]">
      <span className="self-center text-[14px] font-semibold text-[color:var(--fg)]">{row.name}</span>
      <span className="self-center whitespace-nowrap rounded-full border border-[color:var(--accent-dim)] px-[9px] py-[2px] font-mono text-[11px] text-[color:var(--accent-text)]">
        <span aria-hidden>{row.short}</span>
        <span className="sr-only">{row.cost}</span>
      </span>
      <span className="col-span-full flex items-center gap-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">
        <span>{row.where}</span>
        {row.tryHref ? (
          <Link
            href={row.tryHref}
            data-welcome-try={row.id}
            className="relative ml-auto inline-flex min-h-[24px] items-center gap-[4px] font-sans text-[12.5px] font-semibold text-[color:var(--accent-text)] after:absolute after:-inset-x-[8px] after:-inset-y-[10px] after:content-['']"
          >
            {c.tryIt}
            <span aria-hidden>›</span>
            <PendingReporter href={row.tryHref} />
          </Link>
        ) : null}
      </span>
    </li>
  );
}

const LIST = "m-0 flex list-none flex-col p-0";

export function WhereCreditsWork({
  facts,
  sheet,
  teaser,
  onClose,
  returnFocusRef,
}: {
  facts: WelcomeFacts;
  sheet: WelcomeSheet;
  /** Draw the teaser: the lot's `teaser` (payments on, nothing bought), and never on /credits. */
  teaser: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const day = useLocalDay(facts.expiresAtMs, sheetDay);
  const grant = grantLine(facts, day.text);
  const warn = facts.lot === "expiring";
  return (
    <SocialModal title={c.title} closeLabel={c.close} onClose={onClose} returnFocusRef={returnFocusRef}>
      <div data-where-credits-work={sheet.shape} className="flex flex-col gap-[12px] pt-[6px]">
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{creditsPageCopy.viewsFree}</p>
        <p
          data-welcome-grant={facts.lot}
          className={`m-0 text-[13.5px] leading-[1.55] [text-wrap:pretty] ${warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg-body)]"} ${day.ready ? "" : "invisible"}`}
        >
          {grant.before}
          <b className={`font-semibold ${warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]"}`}>{grant.lead}</b>
          {grant.rest}
        </p>
        <div>
          {sheet.lead.length > 0 ? (
            <ul role="list" className={LIST}>
              {sheet.lead.map((r) => <Row key={r.id} row={r} />)}
            </ul>
          ) : null}
          {sheet.line ? (
            <p data-welcome-line={sheet.line.kind} className="m-0 flex items-center gap-[8px] border-t border-t-[color:var(--border)] pb-[3px] pt-[9px] font-mono text-[11px] text-[color:var(--fg-muted)]">
              {sheet.line.kind === "lock" ? (
                <Lock size="md" ink="var(--fg-locked)" className="flex-none" />
              ) : (
                <i aria-hidden className="block h-[6px] w-[6px] flex-none rotate-45 border border-[color:var(--fg-faint)]" />
              )}
              {sheet.line.text}
            </p>
          ) : null}
          <ul role="list" className={LIST}>
            {sheet.rows.map((r) => <Row key={r.id} row={r} />)}
          </ul>
          {teaser ? (
            <div className="mt-[2px] border-t border-t-[color:var(--border)]">
              <Link
                href="/credits"
                data-welcome-teaser
                className="flex min-h-[44px] items-center justify-between text-[13.5px] font-semibold text-[color:var(--accent-text)]"
              >
                {c.teaser}
                <span aria-hidden>›</span>
                <PendingReporter href="/credits" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </SocialModal>
  );
}
