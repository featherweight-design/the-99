"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { matchesAccount, type AccountRow } from "../../lib/admin/account-page-rule";
import type { AdminEnv } from "../../lib/admin/environment";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { SearchField } from "../ui/text-field";
import { usePublishedHeight } from "./admin-head";

// The Accounts list (admin STATES A1 to A3; design table, Accounts and the R2 deltas). As on Switches,
// the shell scrolls the document: the search is pinned under the head at `--admin-head-h`, and the
// desktop column head under both, at the height the pinned bar publishes (`--admin-pin-h`).

const copy = adminCopy.accounts;
const PIN_HEIGHT_VAR = "--admin-pin-h";
const GRID = "md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_110px_90px] md:items-center md:gap-[14px]";
const MONO_META = "overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px]";

/** The avatar the rows and the account page draw: initials in mono on an accent ring. */
export function Avatar({ text, size }: { text: string; size: "sm" | "lg" }) {
  const box = size === "sm" ? "h-[34px] w-[34px] rounded-[10px] text-[11.5px]" : "h-[48px] w-[48px] rounded-[14px] text-[15px] md:h-[44px] md:w-[44px] md:rounded-[12px] md:text-[14px]";
  return (
    <span
      aria-hidden
      className={`inline-flex flex-none items-center justify-center border border-solid border-[color:var(--accent)] bg-[color:var(--bg)] font-mono text-[color:var(--accent)] ${box}`}
    >
      {text}
    </span>
  );
}

function Row({ row }: { row: AccountRow }) {
  const href = `/admin/accounts/${encodeURIComponent(row.id)}`;
  // The group as the desktop column draws it, `No group` included.
  const phoneMeta = [row.group?.name ?? copy.noGroup, row.credits].filter(Boolean).join(" · ");
  return (
    <li data-account={row.id} className="border-0 border-solid border-[color:var(--border)] [border-top-width:1px] first:[border-top-width:0]">
      <Link href={href} className={`flex min-h-[64px] flex-col gap-[4px] px-[14px] py-[11px] text-inherit no-underline md:px-[16px] md:py-[10px] ${GRID}`}>
        <div className="flex min-w-0 items-center gap-[11px]">
          <Avatar text={row.initials} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="min-w-0 text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">{row.name}</span>
            {row.email && <span className={`${MONO_META} text-[color:var(--fg-faint)]`}>{row.email}</span>}
            <span className={`${MONO_META} text-[color:var(--fg-muted)]`}>{row.id}</span>
          </div>
          <span data-testid="account-spend-phone" className="flex-none font-mono text-[13px] text-[color:var(--fg)] md:hidden">
            <span className="sr-only">{copy.featureCols.spent} </span>
            {row.spend}
          </span>
        </div>
        {phoneMeta && <span className="pl-[45px] font-mono text-[10.5px] text-[color:var(--fg-body)] md:hidden">{phoneMeta}</span>}
        <span className="hidden font-mono text-[12px] text-[color:var(--fg-body)] md:inline">
          <span className="sr-only">{copy.cols.group} </span>
          {row.group?.name ?? copy.noGroup}
        </span>
        <span className="hidden font-mono text-[12px] text-[color:var(--fg-body)] md:inline">
          <span className="sr-only">{copy.cols.credits} </span>
          {row.credits}
        </span>
        <span className="hidden text-right font-mono text-[13px] text-[color:var(--fg)] md:inline">
          <span className="sr-only">{copy.featureCols.spent} </span>
          {row.spend}
        </span>
        <PendingReporter href={href} />
      </Link>
    </li>
  );
}

export function AccountsList({
  rows,
  clerk,
  overridesRead,
  month,
  env,
}: {
  rows: AccountRow[];
  clerk: "ok" | "down";
  /** False when the overrides and memberships could not be read: every group then reads as none. */
  overridesRead: boolean;
  month: string;
  env: AdminEnv;
}) {
  const [query, setQuery] = useState("");
  const pinRef = useRef<HTMLDivElement>(null);
  usePublishedHeight(pinRef, PIN_HEIGHT_VAR);
  const shown = useMemo(
    () => rows.filter((r) => matchesAccount({ id: r.id, name: r.clerkName, email: r.email }, query)),
    [rows, query],
  );

  return (
    <>
      {/* The tab's sub, which the head leaves to this page because it counts the accounts Clerk lists. */}
      <p className="m-0 max-w-[720px] px-[16px] pt-[14px] text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-body)] md:px-[28px] md:pt-[18px] md:text-[13.5px]">
        {copy.sub(rows.length, env)}
      </p>
      <div
        ref={pinRef}
        className="sticky top-[var(--admin-head-h,0px)] z-[1] flex flex-none flex-col gap-[10px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[14px] md:px-[28px] md:pb-[14px] md:pt-[18px]"
      >
        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={copy.search}
          aria-label={copy.search}
          containerClassName="h-[44px] rounded-[9px] px-[12px] py-0 md:h-[38px]"
          className="text-[16px] md:text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-[12px] px-[16px] pb-[12px] md:px-[28px] md:pb-[18px]">
        {clerk === "down" && <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--warning)]">{copy.clerkDown}</p>}
        {!overridesRead && <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--warning)]">{adminCopy.switches.overridesUnread}</p>}
        <div className="overflow-clip rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <div
            aria-hidden
            className={`sticky top-[calc(var(--admin-head-h,0px)+var(--admin-pin-h,0px))] z-[1] hidden bg-[color:var(--surface-rail)] px-[16px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] ${GRID}`}
          >
            <span>{copy.cols.account}</span>
            <span>{copy.cols.group}</span>
            <span>{copy.cols.credits}</span>
            <span className="text-right">{month}</span>
          </div>
          {shown.length === 0 ? (
            query.trim() && <p className="m-0 px-[14px] py-[14px] text-[13px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{copy.noMatch(query.trim())}</p>
          ) : (
            <ul data-testid="account-rows" className="m-0 list-none border-0 border-solid border-[color:var(--border)] p-0 md:[border-top-width:1px]">
              {shown.map((r) => (
                <Row key={r.id} row={r} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
