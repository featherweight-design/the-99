"use client";
// Friend trades' rows (handoff `design_handoff_the99_friend_trades`, STATES.md "Trades rows"): one trade per row, in
// Waiting on you's own form (picture, kicker with the age, title, one line, the action at its end, an ended trade's ✕).
// The picture is the friend's first card with the friend's face on its corner, the reader's first card fanned behind
// it, so a trade reads as two cards at a glance. The press opens the trade's sheet; a trade that waits on the reader's
// mark carries Mark traded in place. Ended trades stay until ✕ clears them.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonInitials, PersonText, personAttrs, type PersonParts } from "../../lib/person-name";
import { cardList, tradeCopy as t } from "../../lib/copy/trades";
import { feedAge } from "../../lib/feed/age";
import { tradeDay } from "../../lib/social/when";
import type { TradeListRow } from "../../lib/social/trade-reads";
import type { OtherSide } from "../../lib/social/spare-requests";
import { clearTradeAction, markTradedAction } from "../../app/friends/trade-actions";
import { FadingImg } from "../ui/hydrated-art";
import { ART_CROP_TRIM } from "../ui/art-crop-trim";
import { KICKER_AGE } from "../feed/kicker-age";
import { DismissButton } from "../feed/dismiss";
import { useSpareToast } from "./spare-answer";

type Ink = "accent" | "success" | "faint" | "warning";
type Press = { label: string; kind: "open" | "mark" } | null;
type RowText = { kind: string | PersonParts; ink: Ink; title: string | PersonParts; line: string | PersonParts; press: Press; clear: boolean };

const ROW = "relative grid grid-cols-[46px_minmax(0,1fr)] gap-x-[12px] px-[14px] py-[12px] md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-x-[14px] md:px-[16px] [&+&]:[border-top:1px_solid_var(--border)]";
const ACTIONS = "col-start-2 mt-[5px] flex min-w-0 flex-nowrap items-center gap-[8px] md:col-start-3 md:row-start-1 md:mt-0 md:justify-end md:gap-[12px]";
const KIND = "truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em]";
const INK: Record<Ink, string> = {
  accent: "text-[color:var(--accent-text)]", success: "text-[color:var(--success)]", faint: "text-[color:var(--fg-faint)]", warning: "text-[color:var(--warning)]",
};
const FILLED = "relative z-[1] inline-flex h-[36px] flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] px-[16px] font-sans text-[13px] font-medium [border:1px_solid_var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)] disabled:cursor-default";
const LINK = "flex min-h-[32px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)] after:absolute after:inset-0 after:content-['']";

/** A row's words and press, by its state (STATES.md, the rows table). */
export function rowText(r: TradeListRow, now: Date, timeZone?: string): RowText {
  const f = r.friend.displayName;
  const theirs = cardList(r.theirs);
  const yours = cardList(r.yours);
  const k = t.row.kind;
  const open = (label: string): Press => ({ label, kind: "open" });
  const mark: Press = { label: t.markTraded, kind: "mark" };
  switch (r.row.state) {
    case "offer":
      return { kind: k.offer, ink: "accent", title: t.row.offer(f, theirs, yours), line: t.daysLeft(r.daysLeft), press: open(t.row.answer), clear: false };
    case "offered":
      return { kind: k.offered, ink: "faint", title: t.row.offered(f, theirs, yours), line: t.row.waitingLine(f, r.daysLeft), press: open(t.row.open), clear: false };
    case "countered":
      return { kind: k.countered, ink: "accent", title: t.row.countered(f), line: t.row.counteredLine(theirs, yours, r.daysLeft), press: open(t.row.seeCounter), clear: false };
    case "look":
      return { kind: k.look, ink: "warning", title: t.row.look(r.goneName ?? ""), line: t.row.lookLine(f, r.daysLeft), press: open(t.row.takeLook), clear: false };
    case "accepted":
      return { kind: k.accepted, ink: "success", title: r.row.byYou ? t.row.acceptedYou(f) : t.row.accepted(f), line: t.row.acceptedLine, press: mark, clear: false };
    case "themMarked":
      return { kind: k.themMarked(f), ink: "success", title: t.row.themMarked(f), line: t.row.themMarkedLine, press: mark, clear: false };
    case "youMarked":
      return { kind: k.youMarked, ink: "success", title: t.row.youMarked(f), line: t.row.youMarkedLine(f), press: open(t.row.open), clear: false };
    case "traded":
      return { kind: k.traded, ink: "success", title: t.row.traded(f), line: t.row.tradedLine(theirs, yours, tradeDay(r.at, timeZone)), press: null, clear: true };
    case "declined":
      return { kind: k.declined, ink: "faint", title: r.row.byYou ? t.row.declinedYou(f) : t.row.declined(f), line: t.row.nothingElse, press: null, clear: true };
    case "withdrawn":
      return { kind: k.withdrawn, ink: "faint", title: r.row.byYou ? t.row.withdrawnYou(f) : t.row.withdrawn(f), line: t.row.nothingElse, press: null, clear: true };
    case "rescinded":
      return { kind: k.withdrawn, ink: "faint", title: r.row.byYou ? t.row.rescindedYou(f) : t.row.rescinded(f), line: t.row.nothingElse, press: null, clear: true };
    case "expired":
      return {
        kind: k.expired, ink: "faint", title: r.row.byYou ? t.row.expiredYou(f) : t.row.expired(f),
        line: t.row.expiredLine(Math.floor((now.getTime() - r.createdAt.getTime()) / 86_400_000)), press: null, clear: true,
      };
  }
}

export function TradePicture({ theirs, yours, friend, className = "" }: {
  theirs: string | null; yours: string | null; friend: Pick<OtherSide, "displayName" | "commander">; className?: string;
}) {
  const art = friend.commander?.artCropUri ?? null;
  return (
    <span aria-hidden className={`relative h-[64px] w-[46px] ${className}`}>
      {yours ? (
        <FadingImg src={yours} alt="" className="absolute -left-[5px] top-[1px] block h-[60px] w-[43px] -rotate-[9deg] rounded-[3px] object-cover opacity-90 shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
      ) : null}
      {theirs ? (
        <FadingImg src={theirs} alt="" className="relative block h-[64px] w-[46px] rotate-[3deg] rounded-[3px] object-cover shadow-[0_2px_8px_rgba(0,0,0,.55)]" />
      ) : (
        <span className="relative block h-[64px] w-[46px] rounded-[3px] bg-[color:var(--surface-sunken)]" />
      )}
      <span className={`absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1.5px_solid_var(--surface-inset)] ${art ? ART_CROP_TRIM.box : ""}`}>
        {art ? <FadingImg src={art} alt="" className="block h-full w-full object-cover" style={ART_CROP_TRIM.img} /> : <PersonInitials n={friend.displayName} />}
      </span>
    </span>
  );
}

/**
 * The rows, as `loadTradesWith` sorted them. `onOpen` opens a trade's sheet; Mark traded and ✕ write in place, then
 * refresh the page, and a refusal draws the shared toast with the row unchanged.
 */
export function TradeRows({ rows, now, timeZone, onOpen }: {
  rows: readonly TradeListRow[]; now: Date; timeZone?: string; onOpen: (id: string, from: HTMLElement) => void;
}) {
  const router = useRouter();
  const toast = useSpareToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function write(id: string, act: (id: string) => Promise<{ ok: boolean }>) {
    if (busy) return;
    setBusy(id);
    try {
      if ((await act(id)).ok) router.refresh();
      else toast.fail();
    } catch {
      toast.fail();
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <ul data-testid="trades" className="m-0 flex list-none flex-col p-0">
        {rows.map((r) => {
          const x = rowText(r, now, timeZone);
          return (
            <li key={r.id} data-testid="trade-row" data-row-state={r.row.state} className={ROW}>
              <TradePicture theirs={r.theirImage} yours={r.yourImage} friend={r.friend} className="row-span-2 self-start md:row-span-1 md:self-center" />
              <div className={`flex min-w-0 flex-col gap-[3px] ${x.clear ? "pr-[30px] md:pr-[34px]" : ""}`}>
                <p className="m-0 flex min-w-0 items-center gap-[7px]">
                  {r.row.waitsOnYou ? <span aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" /> : null}
                  <span className={`${KIND} ${INK[x.ink]}`}><PersonText text={x.kind} /></span>
                  <small className={`${KICKER_AGE} text-[color:var(--fg-faint)]`}>{feedAge(r.at.toISOString(), now.toISOString())}</small>
                </p>
                <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]"><PersonText text={x.title} /></p>
                <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]"><PersonText text={x.line} /></p>
              </div>
              {x.clear ? (
                <span className="absolute right-[4px] top-[6px]">
                  <DismissButton title={x.title} label={t.row.clearAria} margin="" disabled={busy !== null} onPress={() => void write(r.id, clearTradeAction)} />
                </span>
              ) : null}
              {x.press ? (
                <div className={ACTIONS}>
                  {x.press.kind === "mark" ? (
                    <>
                      {/* The row still opens its sheet (Rescind lives there): a press over the whole row, under Mark traded. */}
                      <button type="button" data-testid="trade-row-open" aria-haspopup="dialog" onClick={(e) => onOpen(r.id, e.currentTarget)}
                        {...personAttrs({ "aria-label": t.sheet.openAria(r.friend.displayName) }, "absolute inset-0 cursor-pointer border-0 bg-transparent p-0")} />
                      <button type="button" data-testid="trade-row-mark" className={FILLED} disabled={busy !== null} aria-busy={busy === r.id || undefined}
                        onClick={() => void write(r.id, markTradedAction)}>
                        {x.press.label}
                      </button>
                    </>
                  ) : (
                    <button type="button" data-testid="trade-row-open" className={LINK} aria-haspopup="dialog" onClick={(e) => onOpen(r.id, e.currentTarget)}>
                      {x.press.label}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {toast.node}
    </>
  );
}
