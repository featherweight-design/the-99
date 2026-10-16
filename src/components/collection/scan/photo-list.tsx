"use client";

import { useState } from "react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import type { PhotoRow } from "./photo-reader";
import type { ScanMode } from "./scan-view";
import { BIG, BIG_DESK, DeskBar, ModeSegment, Thumb } from "./scanner-view";

const copy = collectionEditCopy.scan;

export type PhotoListProps = {
  layout: "phone" | "desk";
  rows: PhotoRow[];
  mode: ScanMode;
  notice?: string | null;
  /** An add is in flight: the add presses are held until it lands. */
  busy?: boolean;
  onMode: (m: ScanMode) => void;
  onClose: () => void;
  onAddSure: () => void;
  onPick: (rowId: number, oracleId: string) => void;
  onChooseMore: () => void;
};

/**
 * The photos a player chose in place of the camera (card-scan PR 5, handoff W4; the phone draws the same rows in the
 * scanner's own full screen, from D6). A row per photo: its thumbnail, then what it was read as: Sure with the name
 * (never a printing: the one added is the list line's to show), Not sure with its top three to pick from, or no card.
 * A row still being read says which photo it is. Nothing reaches the list unpressed: `Add the N sure ones` takes
 * every sure row, and a Not sure row adds the guess pressed. A row already added says so and is never added again.
 */
export function PhotoList(p: PhotoListProps) {
  const phone = p.layout === "phone";
  const read = p.rows.filter((r) => r.state.kind !== "pending").length;
  const sure = p.rows.filter((r) => r.state.kind === "sure").length;
  const notice = p.notice && (
    <p
      role="alert"
      className="m-0 rounded-[12px] border border-[color:var(--border-strong)] bg-[color:color-mix(in_srgb,var(--surface-rail)_92%,transparent)] px-[14px] py-[11px] text-[13.5px] leading-[1.5] text-[color:var(--fg)]"
    >
      {p.notice}
    </p>
  );
  const list = (
    // A live region: each row is decided after it is drawn, so what it became is announced as it lands.
    <ul aria-live="polite" className="m-0 flex list-none flex-col gap-[12px] p-0">
      {p.rows.map((r, i) => (
        <PhotoItem key={r.id} row={r} index={i + 1} total={p.rows.length} phone={phone} busy={!!p.busy} onPick={(o) => p.onPick(r.id, o)} />
      ))}
    </ul>
  );
  const more = (
    <button type="button" onClick={p.onChooseMore} className="min-h-[44px] border-0 bg-transparent p-0 text-left text-[13.5px] text-[color:var(--accent)]">
      {copy.photos.more}
    </button>
  );
  const addSure = sure > 0 && (
    <button type="button" disabled={p.busy} onClick={p.onAddSure} className={`${phone ? BIG : BIG_DESK} disabled:opacity-60`}>
      {copy.photos.addSure(sure)}
    </button>
  );
  if (!phone) {
    return (
      <section
        data-testid="scanner"
        data-layout="desk"
        data-photos=""
        className="mx-[22px] flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)]"
      >
        <DeskBar label={copy.photos.read(read)} mode={p.mode} onMode={p.onMode} onStop={p.onClose} />
        {/* The sheet's height is fixed: the rows scroll, and the presses under them stay in reach. */}
        <div data-testid="scan-photos-body" className="flex min-h-0 flex-col gap-[12px] overflow-y-auto px-[14px] pt-[12px]">
          {notice}
          {list}
        </div>
        <div className="flex flex-none items-center gap-[14px] px-[14px] pb-[12px] pt-[12px]">
          {addSure}
          {more}
        </div>
      </section>
    );
  }
  return (
    <section data-testid="scanner" data-layout="phone" data-photos="" className="absolute inset-0 z-40 flex flex-col bg-[color:var(--bg)]">
      <div className="flex h-[68px] flex-none items-center gap-[10px] px-[12px] pt-[12px]">
        <button
          type="button"
          data-scan-close=""
          aria-label={copy.close}
          onClick={p.onClose}
          className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full bg-[color:var(--elevated)] text-[15px] text-[color:var(--fg)]"
        >
          ✕
        </button>
        <ModeSegment mode={p.mode} onMode={p.onMode} desk={false} />
        <span aria-hidden="true" className="h-[44px] w-[44px] flex-none" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto px-[16px] py-[12px]">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]">{copy.photos.read(read)}</span>
        {notice}
        {list}
      </div>
      <div className="flex flex-none flex-col gap-[10px] px-[22px] pb-[22px] pt-[14px]">
        {addSure}
        {more}
      </div>
    </section>
  );
}

const TAG = "font-mono text-[10px] uppercase tracking-[.12em] rounded-[4px] px-[6px] py-[2px]";
const TAG_OK = `${TAG} text-[color:var(--success)] bg-[color:color-mix(in_srgb,var(--success)_12%,transparent)]`;
const TAG_WARN = `${TAG} text-[color:var(--warning)] bg-[color:color-mix(in_srgb,var(--warning)_12%,transparent)]`;
const SUB = "font-mono text-[10.5px] text-[color:var(--fg-faint)]";

function PhotoItem({ row, index, total, phone, busy, onPick }: { row: PhotoRow; index: number; total: number; phone: boolean; busy: boolean; onPick: (oracleId: string) => void }) {
  const s = row.state;
  const arrow = (
    <span aria-hidden="true" className="text-[12px] text-[color:var(--fg-faint)]">
      →
    </span>
  );
  let body;
  switch (s.kind) {
    case "pending":
      body = <span className={SUB}>{copy.photos.photoOf(index, total)}</span>;
      break;
    case "failed":
      body = <span className="min-w-0 flex-1 text-[13px] text-[color:var(--fg-muted)]">{copy.photos.noCard}</span>;
      break;
    case "notSure":
      body = (
        <>
          {arrow}
          <Name title={copy.photos.pick} warn sub={copy.photos.photoOf(index, total)} />
          <span className={`ml-auto ${TAG_WARN}`}>{copy.photos.notSure}</span>
        </>
      );
      break;
    case "sure":
    case "added":
      body = (
        <>
          {arrow}
          {/* The guess's art floats, as W4's `.gc` draws it, where the top three's art is inset. */}
          <span className="block h-[50px] w-[36px] flex-none overflow-hidden rounded-[4px] bg-[color:var(--elevated)] shadow-[0_6px_14px_rgba(0,0,0,.4)]">
            {s.guess.imageUri && <img src={s.guess.imageUri} alt="" className="h-full w-full object-cover" />}
          </span>
          <Name title={s.guess.name} />
          <span className={`ml-auto ${TAG_OK}`}>{s.kind === "sure" ? copy.photos.sure : copy.fix.onList}</span>
        </>
      );
  }
  return (
    <li aria-busy={s.kind === "pending" || undefined} data-state={s.kind} className="flex flex-col gap-[12px]">
      <div className="flex items-center gap-[10px] rounded-[9px] border border-[color:var(--border)] bg-[color:var(--bg)] px-[10px] py-[8px]">
        <PhotoThumb src={row.thumb} />
        {body}
      </div>
      {s.kind === "notSure" && (
        <div className={`grid grid-cols-3 gap-[10px] ${phone ? "" : "w-[300px]"}`}>
          {s.guesses.map((g) => (
            <button key={g.oracleId} type="button" disabled={busy} onClick={() => onPick(g.oracleId)} className="flex min-w-0 flex-col gap-[6px] border-0 bg-transparent p-0 text-left disabled:opacity-60">
              <Thumb guess={g} className="aspect-[63/88] w-full rounded-[9px]" />
              <span className={`line-clamp-2 leading-[1.3] text-[color:var(--fg)] ${phone ? "text-[12px]" : "text-[11.5px]"}`}>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/** The photo itself. A file the browser cannot draw (HEIC in Chrome) leaves the empty tile, never a broken image. */
function PhotoThumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="relative h-[50px] w-[36px] flex-none overflow-hidden rounded-[5px] bg-[color:var(--elevated)]">
      {!broken && <img src={src} alt={copy.photos.yourPhoto} onError={() => setBroken(true)} className="h-full w-full object-cover" />}
    </span>
  );
}

function Name({ title, sub, warn }: { title: string; sub?: string; warn?: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
      <b className={`truncate text-[13.5px] font-semibold ${warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]"}`}>{title}</b>
      {sub && <span className={SUB}>{sub}</span>}
    </span>
  );
}
