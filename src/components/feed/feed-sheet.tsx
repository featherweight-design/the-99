"use client";
// What's new's Show all sheet (tool-discovery R10, G20; handoff `ShowAll.dc.html`). Home's rail and phone column keep five
// rows however many items there are; "Show all N" opens this instead of stretching the list in place. 460px from the right
// over a scrim on a desktop, the full screen on a phone. Head: the diamond, What's new, the count, a bare ✕, then a chip
// per kind present (with counts). Body: one scrolling list, Today / This week / Earlier, in the shipped rows at the phone
// layout. Foot, fixed: Past announcements, Choose notifications, Clear all (what the chip shows). It reads the feed the
// page already holds: no fetch.

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../lib/a11y/inert-page";
import { captureToolEvent } from "../../lib/analytics/posthog";
import { feedCountBucket } from "../../lib/analytics/tool-events";
import { feedCopy, feedSheetCopy } from "../../lib/copy/feed";
import type { FeedView } from "../../lib/feed/home";
import { FEED_KINDS, type FeedKind } from "../../lib/feed/kinds";
import { useAnswerSheet } from "../home/answer-sheet";
import { PendingReporter } from "../shell/pending-reporter";
import { FeedItemRow, type FeedFaces } from "./feed-item";

const c = feedCopy.home;
const s = feedSheetCopy;

const DAY_MS = 86_400_000;

export const FEED_ROWS = "m-0 list-none p-0 [&>li+li]:[border-top:1px_solid_var(--border)]";
export const FEED_DAY = "m-0 px-[14px] pt-[9px] font-mono text-[9.5px] font-medium tracking-[.14em] text-[color:var(--fg-locked)] uppercase";

/** The items split into Today (the last 24 hours), This week (the last seven days) and Earlier, each in the feed's order. Pure. */
export function sheetGroups(items: readonly FeedView[], now: string): { today: FeedView[]; week: FeedView[]; earlier: FeedView[] } {
  const at = new Date(now).getTime();
  const age = (i: FeedView) => at - new Date(i.at).getTime();
  return {
    today: items.filter((i) => age(i) < DAY_MS),
    week: items.filter((i) => age(i) >= DAY_MS && age(i) < 7 * DAY_MS),
    earlier: items.filter((i) => age(i) >= 7 * DAY_MS),
  };
}

/** The kinds the items hold, in Settings' order, with how many each holds. Pure. */
export function kindCounts(items: readonly FeedView[]): { kind: FeedKind; n: number }[] {
  return FEED_KINDS.map((kind) => ({ kind, n: items.filter((i) => i.kind === kind).length })).filter((k) => k.n > 0);
}

const chipName = (k: FeedKind): string => s.kinds[k] ?? feedCopy.news.kinds[k].name;

const FOCUS = "focus-visible:outline-transparent focus-visible:shadow-[0_0_0_2px_var(--accent)]";

export function FeedSheet({ items, now, zone, faces, unseen, aside, onDismiss, onClear, onClose }: {
  items: FeedView[];
  now: string;
  zone: string | null;
  faces?: FeedFaces;
  /** How many of the items are unseen: the head's `12 · 3 new`. */
  unseen: number;
  /** Past announcements, when announcements are on for this reader. */
  aside?: ReactNode;
  onDismiss: (key: string, from: HTMLElement) => void;
  /** Clear all: the keys the chip shows (less the row whose answer is opening), and whether a chip narrowed them. */
  onClear: (keys: string[], filtered: boolean) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDialogA11y(ref, onClose, { initialFocusRef: headingRef });
  const inertRef = useInertWhileOpen(true);
  const pending = useAnswerSheet()?.pending ?? null;
  const [kind, setKind] = useState<FeedKind | null>(null);
  const kinds = useMemo(() => kindCounts(items), [items]);
  // A chip whose kind has no row left (the last one hidden or cleared) falls back to All.
  const active = kind && kinds.some((k) => k.kind === kind) ? kind : null;
  const shown = active ? items.filter((i) => i.kind === active) : items;
  const groups = sheetGroups(shown, now);
  const group = (label: string, rows: FeedView[], after: boolean) =>
    rows.length === 0 ? null : (
      <section key={label} aria-label={label} className={`flex flex-col ${after ? "[border-top:1px_solid_var(--border)]" : ""}`}>
        <p className={`${FEED_DAY} !pt-[12px] !pb-[2px] md:!px-[18px]`}>{label}</p>
        <ul className={FEED_ROWS}>
          {rows.map((i) => (
            <FeedItemRow key={i.key} item={i} now={now} zone={zone} compact face={i.friend ? faces?.get(i.friend.publicId) ?? null : null} onDismiss={(from) => onDismiss(i.key, from)} />
          ))}
        </ul>
      </section>
    );
  const chip = (label: string, n: number, on: boolean, press: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={on}
      data-feed-chip
      onClick={press}
      className={`flex min-h-[36px] flex-none cursor-pointer items-center gap-[6px] rounded-full px-[12px] font-sans text-[13px] font-medium whitespace-nowrap ${FOCUS} ${
        on ? "[border:1px_solid_var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)]" : "[border:1px_solid_var(--border-strong)] bg-[color:var(--surface)] text-[color:var(--fg)]"
      }`}
    >
      {label}
      <small className={`font-mono text-[10.5px] ${on ? "opacity-70" : "text-[color:var(--fg-faint)]"}`}>{n}</small>
    </button>
  );

  return createPortal(
    <div
      ref={inertRef}
      role="presentation"
      data-feed-sheet-scrim
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "color-mix(in oklab, var(--bg) 55%, transparent)" }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-sheet-title"
        data-feed-sheet
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet-in-phone flex h-full w-full flex-col overflow-hidden bg-[color:var(--bg)] md:w-[460px] md:[border-left:1px_solid_var(--border-strong)]"
        style={{ boxShadow: "var(--modal-shadow)" }}
      >
        <div className="flex flex-none flex-col gap-[12px] [border-bottom:1px_solid_var(--border)] px-[16px] pt-[14px] pb-[12px] md:px-[20px] md:pt-[18px]">
          <div className="flex items-center gap-[10px]">
            <span aria-hidden="true" className="h-[7px] w-[7px] flex-none rotate-45 bg-[color:var(--accent)] opacity-85" />
            <h2 ref={headingRef} id="feed-sheet-title" tabIndex={-1} className="m-0 font-display text-[20px] leading-[1.2] font-bold text-[color:var(--fg)] outline-none">
              {s.title}
            </h2>
            <span className="font-mono text-[10.5px] tracking-[.14em] text-[color:var(--accent-text)]">{s.count(items.length, unseen)}</span>
            <button
              type="button"
              data-feed-sheet-close
              aria-label={s.close}
              onClick={onClose}
              className={`-mr-[8px] ml-auto flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent md:h-[36px] md:w-[36px] font-mono text-[15px] text-[color:var(--fg-muted)] ${FOCUS}`}
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
          <div role="group" aria-label={feedCopy.archive.kindsAria} className="-mx-[16px] flex gap-[8px] overflow-x-auto px-[16px] [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {chip(s.all, items.length, active === null, () => setKind(null))}
            {kinds.map((k) =>
              chip(chipName(k.kind), k.n, active === k.kind, () => {
                setKind(k.kind);
                captureToolEvent("feed_sheet_filter", { kind: k.kind });
              }),
            )}
          </div>
        </div>
        <div
          data-dismiss-scope
          data-feed-sheet-body
          // A combo row's press opens the combo view in the page, under `<main>`, which this sheet holds inert while it is up (the
          // sheet is portalled to `<body>`, so `<main>` is its sibling). Left open, the combo draws and takes no press, and the app reads
          // as frozen (#3371). So the sheet gives way after the press goes through (a tick later: unmounting the row inside its own click drops the open): the combo opens in its place.
          onClick={(e) => {
            const target = e.target as Element;
            if (target.closest("[data-feed-press]") && target.closest("li")?.querySelector("[data-feed-combo]")) setTimeout(onClose, 0);
          }}
          className="flex min-h-0 flex-auto flex-col overflow-y-auto overscroll-contain"
        >
          {group(c.today, groups.today, false)}
          {group(s.thisWeek, groups.week, groups.today.length > 0)}
          {group(c.earlier, groups.earlier, groups.today.length + groups.week.length > 0)}
        </div>
        <div data-feed-sheet-foot className="flex flex-none items-center gap-[6px] [border-top:1px_solid_var(--border)] px-[10px] py-[6px] md:px-[14px]">
          {aside}
          <Link href="/settings" className={`flex min-h-[44px] items-center gap-[5px] px-[6px] font-sans text-[13px] font-medium text-[color:var(--fg-muted)] md:min-h-[36px] ${FOCUS}`}>
            {c.choose}
            <i aria-hidden className="text-[15px] leading-none text-[color:var(--fg-faint)] not-italic">›</i>
            <PendingReporter href="/settings" />
          </Link>
          {shown.length > 0 && (
            <button
              type="button"
              data-feed-sheet-clear
              aria-label={c.clearAll.aria}
              onClick={() => {
                const keys = shown.map((i) => i.key).filter((k) => k !== pending);
                if (keys.length === 0) return;
                captureToolEvent("feed_sheet_clear", { count: feedCountBucket(keys.length), filtered: active ? "kind" : "all" });
                onClear(keys, active !== null);
              }}
              className={`ml-auto flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[10px] font-sans text-[13px] font-medium text-[color:var(--fg-muted)] md:min-h-[36px] ${FOCUS}`}
            >
              {c.clearAll.label}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
