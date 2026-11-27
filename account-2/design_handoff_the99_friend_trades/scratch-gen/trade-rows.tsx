"use client";
// Friend trades R1 (proposal): the Requests box's third tab, Trades. Every trade the reader is in, the ones waiting on
// them first, then newest, in Waiting on you's own row (`ASK_ROW`: picture, kicker with the age, title, one line, the
// action line, the ✕ at its end). The picture is the shipped 46x64 card with the friend's face on its corner, the
// reader's first card fanned behind it, so a trade reads as two cards at a glance. The whole row opens the friend's
// Trade tab; a row that waits on a mark carries Mark traded in place. Ended trades (traded, declined, withdrawn,
// no answer) stay until ✕ clears them, as Your requests does.
import type { ReactNode } from "react";
import { PersonInitials, PersonText, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";
import { ART_CROP_TRIM } from "../ui/art-crop-trim";
import { KICKER_AGE } from "../feed/kicker-age";
import { DismissButton } from "../feed/dismiss";
import { tradeCopy as t } from "../../lib/copy/trades";

export type TradeRowView = {
  key: string;
  friend: { displayName: ThirdPartyName; commander: { artCropUri: string | null } | null };
  theirCard: string | null;
  yourCard: string | null;
  kind: string | PersonParts;
  ink: "accent" | "success" | "faint" | "warning";
  age: string;
  title: string | PersonParts;
  line: string | PersonParts;
  /** The action line's end: a link, a press, or nothing. */
  action?: { label: string; filled?: boolean } | null;
  unseen?: boolean;
  clear?: boolean;
};

const ROW = "relative grid grid-cols-[46px_minmax(0,1fr)] gap-x-[12px] px-[14px] py-[12px] md:grid-cols-[46px_minmax(0,1fr)_auto] md:items-center md:gap-x-[14px] md:px-[16px] [&+&]:[border-top:1px_solid_var(--border)]";
const ACTIONS = "col-start-2 mt-[5px] flex min-w-0 flex-nowrap items-center gap-[8px] md:col-start-3 md:row-start-1 md:mt-0 md:justify-end md:gap-[12px]";
const KIND = "truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em]";
const INK = { accent: "text-[color:var(--accent-text)]", success: "text-[color:var(--success)]", faint: "text-[color:var(--fg-faint)]", warning: "text-[color:var(--warning)]" };

export function TradePicture({ theirs, yours, friend, className = "" }: {
  theirs: string | null; yours: string | null; friend: TradeRowView["friend"]; className?: string;
}) {
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
      <span className={`absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1.5px_solid_var(--surface-inset)] ${friend.commander?.artCropUri ? ART_CROP_TRIM.box : ""}`}>
        {friend.commander?.artCropUri
          ? <FadingImg src={friend.commander.artCropUri} alt="" className="block h-full w-full object-cover" style={ART_CROP_TRIM.img} />
          : <PersonInitials n={friend.displayName} />}
      </span>
    </span>
  );
}

export function TradeRows({ rows, empty }: { rows: readonly TradeRowView[]; empty?: ReactNode }) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <ul data-testid="trades" className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.key} data-testid="trade-row" className={ROW}>
          <TradePicture theirs={r.theirCard} yours={r.yourCard} friend={r.friend} className="row-span-2 self-start md:row-span-1 md:self-center" />
          <div className={`flex min-w-0 flex-col gap-[3px] ${r.clear ? "pr-[30px]" : ""}`}>
            <p className="m-0 flex min-w-0 items-center gap-[7px]">
              {r.unseen ? <span aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" /> : null}
              <span className={`${KIND} ${INK[r.ink]}`}><PersonText text={r.kind} /></span>
              <small className={`${KICKER_AGE} text-[color:var(--fg-faint)]`}>{r.age}</small>
            </p>
            <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]"><PersonText text={r.title} /></p>
            <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]"><PersonText text={r.line} /></p>
          </div>
          {/* An ended trade's ✕ holds the row's top right corner, as Your requests' does. */}
          {r.clear ? <span className="absolute right-[4px] top-[6px]"><DismissButton title={r.title} onPress={() => {}} /></span> : null}
          {r.action ? (
            <div className={ACTIONS}>
              {r.action ? (
                r.action.filled ? (
                  <button type="button" className="relative z-[1] inline-flex h-[36px] flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] px-[16px] font-sans text-[13px] font-medium [border:1px_solid_var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)]">{r.action.label}</button>
                ) : (
                  <a className="flex min-h-[32px] items-center whitespace-nowrap font-sans text-[13px] font-medium text-[color:var(--accent-text)] no-underline after:absolute after:inset-0 after:content-['']">{r.action.label}</a>
                )
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
