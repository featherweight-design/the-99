"use client";
// `/friends`' Waiting on you (menu and Home PR 7; board `Friends`, 2a to 2c): the first section under the head, the
// rows that wait on the reader. A spare request (spare requests PR 3d; board `Friend-Side`, call 8) with Yes, No and
// the days left, first; then a trade match ("Colin has a spare Ghalta") with a link to that friend's Spares tab. Empty,
// the section is absent (the board's caption). The head counts every row still waiting; the bar's Friends badge counts
// only the unseen ones (product call 2), so the two differ once a /friends visit has seen a trade match. The time and a
// seen row's kind are in `--fg-faint` where the board draws `--fg-locked`, which reads about 3.1:1 on
// `--surface-inset` (PR 7b review): the diamond alone marks what is new.
//
// An answer turns its row into a receipt FOR THE VISIT: the action revalidates `/friends`, so the answered ask leaves
// the server's rows at once, and the receipt is held here (`receipts`) in the place the row had, never stored.
import Link from "next/link";
import { useRef, useState } from "react";
import type { SpareRequestRow, TradeMatchRow, WaitingRow } from "../../lib/social/waiting";
import { feedAge } from "../../lib/feed/age";
import { feedCopy } from "../../lib/copy/feed";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { refreshCopy } from "../../lib/copy/refresh";
import { shortName } from "../../lib/cards/short-name";
import { FadingImg } from "../ui/hydrated-art";
import { PendingReporter } from "../shell/pending-reporter";
import { faceInitials } from "./face";
import { AnswerPresses, receiptText, useLandFocus, useSpareAnswer, type Answer } from "./spare-answer";

const w = socialCopy.waiting;
const r = spareCopy.request;

const ago = (at: Date, now: Date): string => feedAge(at.toISOString(), now.toISOString());

/** An answered ask, held for the visit where its row stood (`index`, in the list as it was drawn at the press). */
export type Receipt = { row: SpareRequestRow; answer: Answer; index: number };

/** The rows still waiting, with each receipt put back at its place. Pure, so a test can hold the order. */
export function placeReceipts(
  waiting: readonly WaitingRow[], receipts: ReadonlyMap<string, Receipt>,
): ({ kind: "row"; row: WaitingRow } | { kind: "receipt"; receipt: Receipt })[] {
  const out: ({ kind: "row"; row: WaitingRow } | { kind: "receipt"; receipt: Receipt })[] = waiting.map((row) => ({ kind: "row", row }));
  for (const receipt of [...receipts.values()].sort((a, b) => a.index - b.index)) {
    out.splice(Math.min(receipt.index, out.length), 0, { kind: "receipt", receipt });
  }
  return out;
}

const ROW = "[&+&]:[border-top:1px_solid_var(--border)]";
/** A spare request's row and its receipt: the picture spans the text and the presses on a phone, which sit in the
 *  text column (`.fi .ac`, 6px under the detail); from desktop the presses are the row's third column. */
const ASK_ROW = `grid grid-cols-[46px_minmax(0,1fr)] gap-x-[12px] px-[14px] py-[12px] md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-x-[14px] md:px-[16px] ${ROW}`;
const KIND = "truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em]";
const TIME = "ml-auto flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]";
const TITLE = "m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]";
const DETAIL = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]";

export function WaitingOnYou({ rows, now }: { rows: readonly WaitingRow[]; now: Date }) {
  const [receipts, setReceipts] = useState<ReadonlyMap<string, Receipt>>(() => new Map());
  const listRef = useRef<HTMLUListElement | null>(null);
  const land = useLandFocus(listRef);
  const { busy, answer, toast } = useSpareAnswer();
  // An answered ask stays out even before the action's redraw drops it from the server's rows.
  const waiting = rows.filter((row) => !receipts.has(row.key));
  if (waiting.length === 0 && receipts.size === 0) return null;
  const shown = placeReceipts(waiting, receipts);
  async function press(row: SpareRequestRow, a: Answer, index: number, from: Element) {
    if (!(await answer(row.ask.id, a))) return;
    setReceipts((prev) => new Map(prev).set(row.key, { row, answer: a, index }));
    land(`[data-receipt="${row.key}"] [data-testid="spare-receipt-status"]`, from);
  }
  return (
    <section aria-labelledby="waiting-on-you" data-testid="waiting-on-you" className="mt-[26px] md:mt-[34px]">
      <h2
        id="waiting-on-you"
        className="m-0 flex min-h-[44px] items-center font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--accent-text)] [border-bottom:1px_solid_var(--border)] md:min-h-[32px] md:pb-[8px]"
      >
        {w.head(waiting.length)}
      </h2>
      <ul ref={listRef} className="m-0 mt-[12px] flex list-none flex-col overflow-hidden rounded-[14px] bg-[color:var(--surface-inset)] p-0 [border:1px_solid_var(--border)]">
        {shown.map((item, index) =>
          item.kind === "receipt" ? (
            <ReceiptRow key={item.receipt.row.key} receipt={item.receipt} />
          ) : item.row.kind === "spare-request" ? (
            <AskRow key={item.row.key} row={item.row} now={now}
              busy={busy?.id === item.row.ask.id ? busy.answer : null} locked={busy !== null}
              onAnswer={(a, from) => void press(item.row as SpareRequestRow, a, index, from)} />
          ) : (
            <TradeRow key={item.row.key} row={item.row} now={now} />
          ),
        )}
      </ul>
      {toast}
    </section>
  );
}

/** The card at card shape, 46x64, with the friend's face on its corner. */
function Picture({ imageUri, friend, className = "" }: {
  imageUri: string | null; friend: { displayName: string; commander: { artCropUri: string | null } | null }; className?: string;
}) {
  return (
    <span aria-hidden className={`relative h-[64px] w-[46px] ${className}`}>
      {imageUri ? (
        <FadingImg src={imageUri} alt="" className="block h-[64px] w-[46px] rounded-[3px] object-cover shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
      ) : (
        <span className="block h-[64px] w-[46px] rounded-[3px] bg-[color:var(--surface-sunken)]" />
      )}
      <span className="absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1.5px_solid_var(--surface-inset)]">
        {friend.commander?.artCropUri
          ? <FadingImg src={friend.commander.artCropUri} alt="" className="block h-full w-full object-cover" />
          : faceInitials(friend.displayName)}
      </span>
    </span>
  );
}

function Unseen() {
  return (
    <>
      <span aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" />
      <span className="sr-only">{w.unseen}</span>
    </>
  );
}

/** A spare request: "Peter asks for your spare Lathliss", the spare count and the copies, Yes, No and the days left. */
function AskRow({ row, now, busy, locked, onAnswer }: {
  row: SpareRequestRow; now: Date; busy: Answer | null; locked: boolean; onAnswer: (a: Answer, from: Element) => void;
}) {
  const { ask } = row;
  const friend = ask.asker.displayName;
  return (
    <li data-testid="waiting-row" data-kind="spare-request" data-unseen="" className={ASK_ROW}>
      <Picture imageUri={ask.card.imageUri} friend={ask.asker} className="row-span-2 self-start md:row-span-1 md:self-center" />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <p className="m-0 flex min-w-0 items-center gap-[7px]">
          <Unseen />
          <span className={`${KIND} text-[color:var(--accent-text)]`}>{w.kind["spare-request"]}</span>
          <small className={TIME}>{ago(row.createdAt, now)}</small>
        </p>
        <p className={TITLE}>{feedCopy.home.title.spareRequest(friend, ask.card.name)}</p>
        <p className={DETAIL}>{r.incomingDetail(ask.spare, friend, ask.copies, ask.deckName)}</p>
      </div>
      <div className="col-start-2 mt-[6px] min-w-0 md:col-start-3 md:row-start-1 md:mt-0">
        <AnswerPresses friend={friend} card={ask.card.name} daysLeft={ask.daysLeft} busy={busy} locked={locked} onAnswer={onAnswer} size="row" />
      </div>
    </li>
  );
}

/** The answered ask, for the visit, on the receipt's success wash (`.fi.rc`): "You're sparing Lathliss for Peter" or "You're keeping Lathliss". */
function ReceiptRow({ receipt }: { receipt: Receipt }) {
  const { ask } = receipt.row;
  const yes = receipt.answer === "yes";
  const text = receiptText(receipt.answer, shortName(ask.card.name), ask.asker.displayName);
  return (
    <li
      data-testid="waiting-receipt"
      data-receipt={receipt.row.key}
      data-answer={receipt.answer}
      className={`${ASK_ROW} bg-[color:color-mix(in_oklab,var(--success)_6%,var(--surface-inset))]`}
    >
      <Picture imageUri={ask.card.imageUri} friend={ask.asker} className="row-span-2 self-start md:row-span-1 md:self-center" />
      {/* Focus lands here after the answer (the pressed Yes or No is gone), so the receipt is read whole. */}
      <div data-testid="spare-receipt-status" tabIndex={-1} className="flex min-w-0 flex-col gap-[3px]">
        <p className="m-0 flex min-w-0 items-center gap-[7px]">
          <span className={`${KIND} ${yes ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]"}`}>
            {text.kind}
          </span>
          <small className={TIME}>{refreshCopy.home.elapsed.justNow}</small>
        </p>
        <p className={TITLE}>{text.title}</p>
        <p className={DETAIL}>{text.detail}</p>
      </div>
    </li>
  );
}

/** A trade match: "Colin has a spare Ghalta", the pods, and the link to Colin's Spares tab. */
function TradeRow({ row: r, now }: { row: TradeMatchRow; now: Date }) {
  return (
    <li
      data-testid="waiting-row"
      data-kind="trade-match"
      data-unseen={r.unseen ? "" : undefined}
      className={`grid grid-cols-[46px_minmax(0,1fr)] gap-[12px] px-[14px] py-[12px] md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-[14px] md:px-[16px] ${ROW}`}
    >
      <Picture imageUri={r.card.imageUri} friend={r.friend} />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <p className="m-0 flex min-w-0 items-center gap-[7px]">
          {r.unseen && <Unseen />}
          <span className={`${KIND} text-[color:var(--fg-faint)]`}>{w.kind[r.kind]}</span>
          <small className={TIME}>{ago(r.createdAt, now)}</small>
        </p>
        <p className={TITLE}>{w.tradeTitle(r.friend.displayName, r.card.name)}</p>
        <p className={DETAIL}>{w.tradeDetail(r.friend.displayName, r.pods)}</p>
        <WaitingLink row={r} className="mt-[6px] md:hidden" />
      </div>
      <WaitingLink row={r} className="hidden md:flex md:justify-end" />
    </li>
  );
}

/** The board's `.lnk`: in the text column on a phone, where a long name wraps rather than clip, and the row's third
 * column from desktop, on one line. */
function WaitingLink({ row, className }: { row: TradeMatchRow; className: string }) {
  return (
    <span className={className}>
      <Link
        href={`/friends/${row.friend.publicId}`}
        className="flex min-h-[32px] items-center gap-[4px] text-[13px] [overflow-wrap:anywhere] md:whitespace-nowrap font-medium text-[color:var(--accent-text)] no-underline"
      >
        {w.seeSpares(row.friend.displayName)}
        <span aria-hidden>›</span>
        <PendingReporter href={`/friends/${row.friend.publicId}`} />
      </Link>
    </span>
  );
}
