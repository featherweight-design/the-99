"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { matchesAccount, type AccountRow } from "../../lib/admin/account-page-rule";
import { invitedByName, phoneInviteMeta } from "../../lib/admin/invites-rule";
import type { AdminEnv } from "../../lib/admin/environment";
import { adminCopy, adminMaskCopy } from "../../lib/copy/admin";
import { inviteCopy } from "../../lib/copy/invites";
import { PendingReporter } from "../shell/pending-reporter";
import { SearchField } from "../ui/text-field";
import { usePublishedHeight } from "./admin-head";
import { FailedToast, RevealFailedToast, ShowButton } from "./show-button";
import { useReveal, utcHourMinute, type Revealed } from "./use-reveal";
import { lookUpAccount } from "../../app/admin/accounts/actions";
import type { LookUpResult } from "../../lib/admin/lookup";

// The Accounts list (admin STATES A1 to A3; design table, Accounts and the R2 deltas). As on Switches,
// the shell scrolls the document: the search is pinned under the head at `--admin-head-h`, and the
// desktop column head under both, at the height the pinned bar publishes (`--admin-pin-h`).

const copy = adminCopy.accounts;
const inv = adminCopy.invites;
const maskCopy = adminMaskCopy.reveal;
const maskAccounts = adminMaskCopy.accounts;
const PIN_HEIGHT_VAR = "--admin-pin-h";
const GRID = "md:grid md:grid-cols-[minmax(0,2.1fr)_minmax(0,0.6fr)_78px_104px_minmax(0,0.7fr)_52px] md:items-center md:gap-[14px]";
const MONO_META = "overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px] leading-[1.5]";
/** A revealed row's lines wrap rather than clip: the whole email and id are what the Show was for (A2). */
const MONO_WHOLE = "font-mono text-[10.5px] leading-[1.5] [overflow-wrap:break-word]";

/** The avatar the rows and the account page draw: initials in mono on an accent ring, or the diamond when null (D4). */
export function Avatar({ text, size }: { text: string | null; size: "sm" | "lg" }) {
  const box = size === "sm" ? "h-[34px] w-[34px] rounded-[10px] text-[11.5px]" : "h-[48px] w-[48px] rounded-[14px] text-[15px] md:h-[44px] md:w-[44px] md:rounded-[12px] md:text-[14px]";
  return (
    <span
      aria-hidden
      className={`inline-flex flex-none items-center justify-center border border-solid border-[color:var(--accent)] bg-[color:var(--bg)] font-mono text-[color:var(--accent)] ${box}`}
      data-mark={text === null ? "diamond" : undefined}
    >
      {text ?? <i className="block h-[8px] w-[8px] rotate-45 bg-[color:var(--accent)]" />}
    </span>
  );
}

type RowReveal = { revealed: Revealed | null; pending: boolean; canShow: boolean; onShow: () => void; onHide: () => void };

function Row({ row, reveal }: { row: AccountRow; reveal: RowReveal }) {
  const href = `/admin/accounts/${encodeURIComponent(row.id)}`;
  const rev = reveal.revealed;
  // The group as the desktop column draws it, `No group` included.
  const phoneHead = [row.group?.name ?? copy.noGroup, row.credits].filter(Boolean).join(" · ");
  const phoneInv = phoneInviteMeta(row.invites);
  const { left, waiting, invitedBy } = row.invites;
  return (
    // A revealed row (A2): the raised surface and a 1px inset accent ring, its own fields whole.
    <li
      data-account={row.id}
      data-revealed={rev ? "" : undefined}
      className={`border-0 border-solid border-[color:var(--border)] [border-top-width:1px] first:[border-top-width:0] ${
        rev ? "bg-[color:var(--surface-raised)] shadow-[inset_0_0_0_1px_var(--accent)]" : ""
      }`}
    >
      <div className={`flex min-h-[64px] flex-col gap-[5px] py-[11px] pl-[14px] pr-[8px] md:px-[16px] md:py-[10px] ${GRID}`}>
        <div className="flex min-w-0 items-center gap-[11px]">
          <Avatar text={row.initials} size="sm" />
          {/* The name is the link to the account; Show sits beside it, never inside it (D5). */}
          <Link href={href} className="flex min-w-0 flex-1 flex-col gap-[2px] text-inherit no-underline">
            <span className="min-w-0 text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">
              {rev?.name ?? row.name}
              {row.owner && (
                <span className="ml-[6px] inline-flex h-[18px] items-center rounded-full border border-solid border-[color:var(--border-strong)] px-[7px] align-[1px] font-mono text-[10px] font-normal tracking-[0.08em] text-[color:var(--fg-muted)]">
                  {inv.tree.owner}
                </span>
              )}
            </span>
            {rev ? (
              <>
                {rev.email && <span className={`${MONO_WHOLE} text-[color:var(--fg-body)]`}>{rev.email}</span>}
                <span className={`${MONO_WHOLE} text-[color:var(--fg-muted)]`}>{rev.id}</span>
                <span className={`${MONO_WHOLE} text-[color:var(--accent)]`}>{maskCopy.shown(utcHourMinute(rev.hidesAt))}</span>
              </>
            ) : (
              row.email && <span className={`${MONO_META} text-[color:var(--fg-faint)]`}>{row.email}</span>
            )}
            <PendingReporter href={href} />
          </Link>
          {reveal.canShow && <ShowButton on={rev !== null} pending={reveal.pending} label={row.name} onShow={reveal.onShow} onHide={reveal.onHide} />}
        </div>
        <span data-invite-meta className="pl-[45px] font-mono text-[10.5px] text-[color:var(--fg-body)] md:hidden">
          {phoneHead} · <i className="not-italic text-[color:var(--accent)]">{phoneInv.figure}</i>
          {phoneInv.after} · {phoneInv.by} ·{" "}
          <span data-testid="account-spend-phone">
            <span className="sr-only">{copy.featureCols.spent} </span>
            {row.spend}
          </span>
        </span>
        <span className="hidden font-mono text-[12px] text-[color:var(--fg-body)] md:inline">
          <span className="sr-only">{copy.cols.group} </span>
          {row.group?.name ?? copy.noGroup}
        </span>
        <span className="hidden font-mono text-[12px] text-[color:var(--fg-body)] md:inline">
          <span className="sr-only">{copy.cols.credits} </span>
          {row.credits}
        </span>
        <span data-testid="account-invites-cell" className={`hidden font-mono text-[12px] md:inline ${left === 0 && waiting === 0 ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg)]"}`}>
          <span className="sr-only">{inv.colInvites} </span>
          {left}
          {waiting > 0 && <span className="text-[color:var(--fg-muted)]">{inviteCopy.count.waiting(waiting)}</span>}
        </span>
        <span
          data-testid="account-invited-by"
          className={`hidden min-w-0 font-mono text-[12px] [overflow-wrap:anywhere] md:inline ${invitedBy.kind === "account" ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}
        >
          <span className="sr-only">{inv.colInvitedBy} </span>
          {invitedByName(invitedBy)}
        </span>
        <span className="hidden text-right font-mono text-[13px] text-[color:var(--fg)] md:inline">
          <span className="sr-only">{copy.featureCols.spent} </span>
          {row.spend}
        </span>
      </div>
    </li>
  );
}

export function AccountsList({
  rows,
  clerk,
  month,
  env,
  viewerId,
}: {
  viewerId: string;
  rows: AccountRow[];
  clerk: "ok" | "down";
  month: string;
  env: AdminEnv;
}) {
  const [query, setQuery] = useState("");
  const reveal = useReveal();
  // The one field (D10 to D13): without an `@` it filters the masked names as you type; with one it waits for Enter
  // and looks up that exact address. An answer stands only while the field still holds what was looked up.
  const email = query.includes("@");
  const [lookup, setLookup] = useState<{ q: string; result: LookUpResult } | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookFailed, setLookFailed] = useState<{ q: string; n: number } | null>(null);
  const answer = email && lookup?.q === query ? lookup.result : null;
  const lineId = useId();
  const lookUp = async (q: string) => {
    if (looking) return;
    setLooking(true);
    setLookFailed(null);
    let result: LookUpResult;
    try {
      result = await lookUpAccount(q);
    } catch {
      result = { kind: "failed" };
    }
    setLooking(false);
    // A failure keeps the field and the whole list as they were, and says so in the toast (A5).
    if (result.kind === "failed") setLookFailed((prev) => ({ q, n: (prev?.n ?? 0) + 1 }));
    else setLookup({ q, result });
  };
  const pinRef = useRef<HTMLDivElement>(null);
  usePublishedHeight(pinRef, PIN_HEIGHT_VAR);
  const shown = useMemo(() => {
    if (!email) return rows.filter((r) => matchesAccount(r, query));
    // A8: an address typed and not yet looked up leaves the list whole; a hit narrows it to its one row (A3).
    if (answer?.kind === "hit") return rows.filter((r) => r.id === answer.id);
    if (answer?.kind === "miss") return [];
    return rows;
  }, [rows, query, email, answer]);
  const line = !email ? null : answer?.kind === "hit" ? maskAccounts.hit : answer?.kind === "miss" ? maskAccounts.miss : maskAccounts.enterToLookUp;

  return (
    <>
      {/* The tab's sub, which the head leaves to this page because it counts the accounts Clerk lists. */}
      <p className="m-0 max-w-[720px] px-[16px] pt-[14px] text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-body)] md:px-[28px] md:pt-[18px] md:text-[13.5px]">
        {copy.sub(rows.length, env)}
      </p>
      <div
        ref={pinRef}
        className="sticky top-[calc(var(--header-offset,0px)+var(--admin-head-h,0px))] z-[1] flex flex-none flex-col gap-[12px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[12px] md:px-[28px]"
      >
        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && email && query.trim()) {
              e.preventDefault();
              void lookUp(query);
            }
          }}
          enterKeyHint="search"
          placeholder={maskAccounts.search}
          aria-label={maskAccounts.search}
          aria-describedby={line ? lineId : undefined}
          aria-busy={looking || undefined}
          containerClassName={`h-[44px] gap-[9px] rounded-[9px] py-0 pl-[12px] pr-[6px] md:h-[38px] ${email ? "border-[color:var(--accent)]" : ""}`}
          className="text-[16px] [@media(pointer:fine)]:md:text-[14px]"
        />
        {line && (
          <p
            id={lineId}
            aria-live="polite"
            data-lookup-line={answer?.kind ?? "enter"}
            className={`m-0 text-[13px] leading-[1.55] ${answer?.kind === "hit" ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-muted)]"}`}
          >
            {line}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-[12px] px-[16px] pb-[12px] md:px-[28px] md:pb-[18px]">
        {clerk === "down" && <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--warning)]">{copy.clerkDown}</p>}
        {/* A4: a miss draws no rows and no column head, only the line above. */}
        {answer?.kind !== "miss" && (
        <div data-testid="account-card" className="overflow-clip rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <div
            aria-hidden
            className={`sticky top-[calc(var(--header-offset,0px)+var(--admin-head-h,0px)+var(--admin-pin-h,0px))] z-[1] hidden bg-[color:var(--surface-rail)] px-[16px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] ${GRID}`}
          >
            <span>{copy.cols.account}</span>
            <span>{copy.cols.group}</span>
            <span>{copy.cols.credits}</span>
            <span>{inv.colInvites}</span>
            <span>{inv.colInvitedBy}</span>
            <span className="text-right">{month}</span>
          </div>
          {shown.length === 0 ? (
            !email && query.trim() && <p className="m-0 px-[14px] py-[14px] text-[13px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{copy.noMatch(query.trim())}</p>
          ) : (
            <ul data-testid="account-rows" className="m-0 list-none border-0 border-solid border-[color:var(--border)] p-0 md:[border-top-width:1px]">
              {shown.map((r) => (
                <Row
                  key={r.id}
                  row={r}
                  reveal={{
                    revealed: reveal.revealed.get(r.id) ?? null,
                    pending: reveal.pending.has(r.id),
                    // The owner and the viewer's own row carry no Show (A1): neither is masked from its reader.
                    canShow: !r.owner && r.id !== viewerId,
                    onShow: () => void reveal.show(r.id, r.name),
                    onHide: () => reveal.hide(r.id),
                  }}
                />
              ))}
            </ul>
          )}
        </div>
        )}
      </div>
      {reveal.failure && <RevealFailedToast key={reveal.failure.n} failure={reveal.failure} onRetry={() => void reveal.show(reveal.failure!.id, reveal.failure!.masked)} onDone={reveal.dismissFailure} />}
      {lookFailed && (
        <FailedToast
          key={`look-${lookFailed.n}`}
          kind="lookup-failed"
          title={maskAccounts.lookUpFailed}
          onRetry={() => void lookUp(lookFailed.q)}
          onDone={() => setLookFailed(null)}
        />
      )}
    </>
  );
}
