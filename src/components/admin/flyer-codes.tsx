"use client";

import { useState } from "react";
import { PendingReporter } from "../shell/pending-reporter";
import Link from "next/link";
import { flyerAdminCopy } from "../../lib/copy/admin";
import type { FlyerRowView, FlyersView } from "../../lib/admin/flyers-rule";
import { FlyerLaunchCsv, FlyerLaunchCsvAlert, useLaunchCsv } from "./flyer-launch-csv";
import { FlyerLaunchDate } from "./flyer-launch-date";
import { FlyerNewForm, type FlyerGroupChoice } from "./flyer-new-form";
import { FlyerRevokeModal, type RevokeTarget } from "./flyer-revoke-modal";

// The Flyer codes section on the Invites tab (flyer trial PR 4a; handoff Admin-Desktop A1, Admin-Phone P1): a row per
// code (Store, Code, Sign-ups with its bar, Group, Made, Print), revoked rows dimmed with their date, and the launch
// list's count. One markup for both widths: a two-column card on the phone, the six-column row from `md`. New flyer
// code and Revoke are the next PR's, so neither is drawn here.

const copy = flyerAdminCopy;
const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const MONO_FAINT = "font-mono text-[11px] text-[color:var(--fg-faint)]";
const TEXT_BASE = "inline-flex min-h-[44px] items-center whitespace-nowrap px-[6px] text-[13px] font-medium no-underline md:min-h-[32px]";
const TEXT_BUTTON = `${TEXT_BASE} text-[color:var(--accent-text)]`;
const DANGER_BUTTON = `${TEXT_BASE} cursor-pointer border-0 bg-transparent text-[color:var(--danger)]`;

function Row({ row, onRevoke }: { row: FlyerRowView; onRevoke: (row: FlyerRowView) => void }) {
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
          <button
            type="button"
            data-testid="flyer-revoke"
            onClick={() => onRevoke(row)}
            aria-label={`${copy.revoke} ${row.store}`}
            className={DANGER_BUTTON}
          >
            {copy.revoke}
          </button>
        </span>
      )}
    </li>
  );
}

export function FlyerCodes({ view, groups = [] }: { view: FlyersView; groups?: readonly FlyerGroupChoice[] }) {
  const cols = copy.cols;
  const [making, setMaking] = useState(false);
  // Only the row's code is kept: the count the modal shows is read from the live row, so a refresh updates it.
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  // Download CSV and its failure line sit in different rows of the launch card, so the card holds their state.
  const csv = useLaunchCsv();
  const live = revokingCode === null ? undefined : view.rows.find((r) => r.code === revokingCode);
  const revoking: RevokeTarget | null = live ? { id: live.id, store: live.store, code: live.code, taken: live.taken } : null;
  return (
    <section id="flyer-codes" aria-label={copy.section} data-testid="flyer-codes" className="scroll-mt-[16px] flex flex-col gap-[12px] px-[16px] pt-[16px] md:px-[28px] md:pt-[22px]">
      <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] pt-[10px]">
        <h2 className="m-0 text-[15px] font-semibold text-[color:var(--fg)]">{copy.section}</h2>
        <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{view.meta}</small>
        {!making && (
          <button type="button" data-testid="flyer-new-open" onClick={() => setMaking(true)} className={`${TEXT_BUTTON} ml-auto cursor-pointer border-0 bg-transparent md:px-0 md:font-normal`}>
            {copy.newCode}
          </button>
        )}
      </div>
      {making && <FlyerNewForm groups={groups} onClose={() => setMaking(false)} />}
      {view.rows.length === 0 && (
        <div className={CARD}>
          <p data-testid="flyer-codes-empty" className="m-0 px-[16px] py-[18px] text-[13px] leading-[1.6] text-[color:var(--fg-muted)] [text-wrap:pretty]">
            {copy.empty}
          </p>
        </div>
      )}
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
              <Row key={r.id} row={r} onRevoke={(row) => setRevokingCode(row.code)} />
            ))}
          </ul>
        </div>
      )}
      <div className={CARD} data-testid="launch-list-card">
        <div className="grid min-h-[56px] grid-cols-[minmax(0,1fr)] items-center gap-[4px] px-[14px] pb-[4px] pt-[12px] md:grid-cols-[minmax(0,1fr)_auto] md:gap-[14px] md:py-[10px] md:pl-[16px] md:pr-[10px]">
          <span className="flex flex-col gap-[4px] md:gap-[3px]">
            <b className="text-[14px] font-semibold text-[color:var(--fg)]">{view.launch.title}</b>
            <span className={MONO_FAINT}>{view.launch.meta}</span>
          </span>
          {view.launch.count > 0 && (
            <span className="-ml-[6px] flex justify-start md:m-0 md:justify-end">
              <FlyerLaunchCsv csv={csv} />
            </span>
          )}
        </div>
        <FlyerLaunchCsvAlert csv={csv} />
        <FlyerLaunchDate saved={view.launch.date} />
      </div>
      {revoking && <FlyerRevokeModal target={revoking} onClose={() => setRevokingCode(null)} />}
    </section>
  );
}
