"use client";
// The Announcements archive (`/announcements`, small items 11 item 3; board `Archive` E2 to F7). A library, not a feed:
// every stored Wizards post, newest first, in the shipped `FeedItemRow` in its seen ink (`unseen: false`, no ✕, the date in
// the age's place), under sticky month heads, with a kind switch and a month jump. READS ONLY: nothing here marks a post
// seen or dismisses one.
//
// The pages already served are held HERE, keyed on the parameters (kind and the month the list starts from), so flipping
// back to a kind costs nothing, and the address is written through `mirrorUrl`, never Next's `staleTimes` (the list-cache
// rule, `useDiscoveryCache`'s way). A kind not yet held, a month jump and Show older read through the server action. Every
// response is filed under the key it was asked for, whatever the reader pressed since, so the newest press decides what is
// drawn and a late response only fills its own key.
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { loadArchivePageAction } from "../../app/announcements/actions";
import {
  anchorCursor, archiveQuery, countIn, dayLabel, firstYear, groupByMonth, monthLabel, monthShort, nearestMonth, newestMonth, totalFrom,
  type ArchiveKind, type ArchivePage, type MonthCounts, type Ym,
} from "../../lib/announcements/archive-model";
import { feedCopy } from "../../lib/copy/feed";
import type { FeedView } from "../../lib/feed/home";
import { mirrorUrl } from "../../lib/url/mirror";
import { FeedItemRow } from "../feed/feed-item";
import { useAnchoredPanel } from "../ui/anchored-panel";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { useMinWidth } from "../ui/use-min-width";
import { JumpSheet } from "./jump-sheet";

const c = feedCopy.archive;

/** One held view: the rows drawn so far, where the next page starts, and the state of the read in flight. */
export type Entry = { items: FeedView[]; next: string | null; status: "idle" | "loading" | "failed" };

export const entryKey = (kind: ArchiveKind, anchor: Ym | null): string => `${kind}|${anchor ?? ""}`;

const KINDS: readonly ArchiveKind[] = ["all", "secret-lair", "commander-decklists", "wizards-news"];

const BOX = "flex flex-col overflow-clip rounded-[14px] [border:1px_solid_var(--border)] bg-[color:var(--surface-inset)]";
const ROWS = "m-0 list-none p-0 [&>li+li]:[border-top:1px_solid_var(--border)]";

/** A month's head: sticky under the page's header while its month scrolls (`.mh`). */
export function MonthHead({ ym, n, stuck = false }: { ym: Ym; n?: number; stuck?: boolean }) {
  return (
    <h2
      data-archive-month={ym}
      className={`sticky top-[var(--header-offset,0px)] z-[1] m-0 flex items-baseline gap-[8px] [border-bottom:1px_solid_var(--border)] bg-[color:var(--surface-inset)] px-[14px] pt-[10px] pb-[8px] font-mono text-[9.5px] font-medium tracking-[.14em] text-[color:var(--fg-faint)] uppercase ${stuck ? "shadow-[0_6px_12px_rgba(0,0,0,.35)]" : ""}`}
    >
      {monthLabel(ym)}
      {n !== undefined && <em className="tracking-[.06em] text-[color:var(--fg-locked)] normal-case not-italic">{c.monthCount(n)}</em>}
    </h2>
  );
}

/** The foot: how many are drawn of how many there are, and Show older; or the failure and Try again; or two skeleton rows. */
export function ArchiveFoot({ shown, total, entry, onMore }: { shown: number; total: number; entry: Entry; onMore: () => void }) {
  if (entry.status === "loading") {
    return (
      <div data-archive-loading role="status" aria-label={c.loading} className="[border-top:1px_solid_var(--border)]">
        {[0, 1].map((i) => (
          <div key={i} aria-hidden className="grid grid-cols-[46px_minmax(0,1fr)] gap-x-[12px] px-[14px] py-[12px] [&+div]:[border-top:1px_solid_var(--border)]">
            <i className="block h-[64px] animate-pulse rounded-[4px] bg-[color:color-mix(in_srgb,var(--fg)_7%,transparent)]" />
            <span className="flex flex-col gap-[7px] pt-[4px]">
              <i className="block h-[9px] w-[40%] animate-pulse rounded-[3px] bg-[color:color-mix(in_srgb,var(--fg)_7%,transparent)]" />
              <i className="block h-[12px] w-[80%] animate-pulse rounded-[3px] bg-[color:color-mix(in_srgb,var(--fg)_7%,transparent)]" />
              <i className="block h-[10px] w-[95%] animate-pulse rounded-[3px] bg-[color:color-mix(in_srgb,var(--fg)_7%,transparent)]" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (entry.status === "failed") {
    return (
      <div data-archive-failed className="flex items-center gap-[10px] [border-top:1px_solid_var(--border)] py-[10px] pr-[6px] pl-[14px]">
        <p role="alert" className="m-0 flex-1 text-[12.5px] leading-[1.45] text-[color:var(--fg-body)]">{entry.items.length === 0 ? c.failedFirst : c.failedOlder}</p>
        <button type="button" onClick={onMore} className="flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[10px] font-sans text-[13px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2">
          {c.retry}
        </button>
      </div>
    );
  }
  if (entry.next === null) return null;
  return (
    <div data-archive-foot className="flex items-center justify-between gap-[10px] [border-top:1px_solid_var(--border)] py-[4px] pr-[6px] pl-[14px]">
      <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{c.shown(shown, total)}</small>
      <button type="button" onClick={onMore} className="flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[10px] font-sans text-[13px] font-medium text-[color:var(--fg)]">
        {c.older}
      </button>
    </div>
  );
}

/** A kind with no post in the month the reader is parked on: one line naming both, and a press to the nearest month that has one. */
export function EmptyMonth({ kind, ym, near, onGo }: { kind: ArchiveKind; ym: Ym; near: Ym | null; onGo: (ym: Ym) => void }) {
  return (
    <div data-archive-empty className="flex flex-col gap-[6px] px-[14px] py-[18px] [border-bottom:1px_solid_var(--border)]">
      <b className="font-sans text-[13.5px] font-semibold text-[color:var(--fg)]">{c.empty(c.emptyKind[kind], monthLabel(ym))}</b>
      {near && (
        <>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{c.emptyNear(monthLabel(near))}</p>
          <button type="button" onClick={() => onGo(near)} className="flex min-h-[36px] cursor-pointer items-center self-start border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)]">
            {c.emptyGo(monthLabel(near))} ›
          </button>
        </>
      )}
    </div>
  );
}

export function ArchiveView({ kind: servedKind, anchor: servedAnchor, page, counts, now }: {
  kind: ArchiveKind;
  anchor: Ym | null;
  page: ArchivePage;
  counts: MonthCounts;
  now: string;
}) {
  const [view, setView] = useState({ kind: servedKind, anchor: servedAnchor });
  const [held, setHeld] = useState<ReadonlyMap<string, Entry>>(() => new Map([[entryKey(servedKind, servedAnchor), { items: page.items, next: page.next, status: "idle" as const }]]));
  const [jumping, setJumping] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const flying = useRef(new Set<string>());
  const desktop = useMinWidth("(min-width: 768px)");
  const { at: panelAt, panelRef, triggerRef } = useAnchoredPanel<HTMLButtonElement>({ open: jumping && desktop, width: 340, gap: 6 });

  // A fresh payload (the address changed under the page: Back, a link) is filed and shown, adjusted during render rather
  // than in an effect, which would paint the previous view once.
  const [prevPage, setPrevPage] = useState(page);
  if (page !== prevPage) {
    setPrevPage(page);
    // A reader's loaded pages are kept: the served first page replaces the held entry only when it holds no more than it.
    setHeld((m) => {
      const k = entryKey(servedKind, servedAnchor);
      const had = m.get(k);
      return new Map(m).set(k, had && had.items.length > page.items.length ? had : { items: page.items, next: page.next, status: "idle" });
    });
    setView({ kind: servedKind, anchor: servedAnchor });
  }

  const patch = useCallback((key: string, f: (e: Entry) => Entry) => {
    setHeld((m) => new Map(m).set(key, f(m.get(key) ?? { items: [], next: null, status: "idle" })));
  }, []);

  /** Reads a page for a view and files it under that view's key, appending when it continues rows already held. */
  const read = useCallback(async (kind: ArchiveKind, anchor: Ym | null, after: string | null, more: boolean) => {
    const key = entryKey(kind, anchor);
    // One read per key at a time: a second press while one is in flight would append the same page twice.
    if (flying.current.has(key)) return;
    flying.current.add(key);
    patch(key, (e) => ({ ...e, status: "loading" }));
    let got: ArchivePage | null = null;
    try {
      got = await loadArchivePageAction(kind, after);
    } catch {
      got = null;
    }
    flying.current.delete(key);
    patch(key, (e) => {
      if (!got) return { ...e, status: "failed" };
      const have = new Set(more ? e.items.map((i) => i.key) : []);
      const fresh = got.items.filter((i) => !have.has(i.key));
      return { items: more ? [...e.items, ...fresh] : got.items, next: got.next, status: "idle" };
    });
  }, [patch]);

  const show = (kind: ArchiveKind, anchor: Ym | null) => {
    setView({ kind, anchor });
    mirrorUrl(`${window.location.pathname}${archiveQuery(kind, anchor)}`);
    const key = entryKey(kind, anchor);
    // A month this kind never posted in holds nothing to read: the empty line draws from the counts.
    const had = held.get(key);
    // A first read that failed has nothing to show: entering the view again retries it. A held or loading entry is served.
    if ((had && !(had.status === "failed" && had.items.length === 0)) || (anchor !== null && countIn(counts, anchor, kind) === 0)) return;
    void read(kind, anchor, anchor ? anchorCursor(anchor) : null, false);
  };

  const { kind, anchor } = view;
  const key = entryKey(kind, anchor);
  const emptyAt = anchor !== null && countIn(counts, anchor, kind) === 0 ? anchor : null;
  const entry: Entry = held.get(key) ?? { items: [], next: null, status: emptyAt ? "idle" : "loading" };
  const newest = newestMonth(counts, kind);
  const total = totalFrom(counts, kind, anchor);
  const groups = groupByMonth(entry.items);
  const more = () => void read(kind, anchor, entry.items.length === 0 ? (anchor ? anchorCursor(anchor) : null) : entry.next, entry.items.length > 0);
  const jumpTo = (ym: Ym) => {
    setJumping(false);
    // The newest month is the list's own start: no month in the address.
    show(kind, ym === newest ? null : ym);
    top.current?.scrollIntoView?.({ block: "start" });
  };
  const posts = totalFrom(counts, "all", null);
  // No post at all: nothing to jump to, so no jump.
  const jumpMonth = anchor ?? newest;

  return (
    <div className="mx-auto box-border flex w-full max-w-[860px] flex-col gap-[12px] px-[16px] pb-[40px] pt-[16px] md:px-0 md:pb-[50px] md:pt-[36px]">
      <Link href="/" className="flex min-h-[32px] items-center self-start font-mono text-[11.5px] text-[color:var(--fg-muted)]">‹ {c.back}</Link>
      <div>
        <h1 className="m-0 font-display text-[23px] leading-[1.15] font-bold text-[color:var(--fg)] md:text-[28px]">{c.title}</h1>
        <p data-archive-sub className="m-0 mt-[6px] font-mono text-[10px] tracking-[.06em] text-[color:var(--fg-faint)] md:text-[11px]">{c.sub(posts, firstYear(counts))}</p>
      </div>
      <div className="flex flex-col gap-[10px] md:flex-row md:items-center md:justify-between">
        <SegmentedSwitch
          kind="radio"
          ariaLabel={c.kindsAria}
          size="compact"
          fill
          value={kind}
          onChange={(k) => show(k, anchor)}
          segments={KINDS.map((k) => ({
            value: k,
            ariaLabel: c.segments[k].long,
            label: (<><span className="md:hidden">{c.segments[k].short}</span><span className="hidden md:inline">{c.segments[k].long}</span></>),
            data: { "data-archive-kind": k },
          }))}
        />
        {jumpMonth && (
          <div className="flex items-center gap-[12px]">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              aria-label={c.jump.open(monthShort(jumpMonth))}
              onClick={() => setJumping(true)}
              className="flex h-[44px] flex-none cursor-pointer items-center gap-[6px] rounded-[10px] [border:1px_solid_var(--border-strong)] bg-transparent px-[12px] font-sans text-[13px] text-[color:var(--fg)] md:h-[40px]"
            >
              {monthShort(jumpMonth)}
              <i aria-hidden className="text-[11px] text-[color:var(--fg-faint)] not-italic">▾</i>
            </button>
            <span data-archive-order className="font-mono text-[10.5px] text-[color:var(--fg-locked)] md:hidden">{c.newestFirst}</span>
          </div>
        )}
      </div>
      <div ref={top} data-archive-list className={`${BOX} scroll-mt-[calc(var(--header-offset,0px)+8px)]`}>
        {emptyAt ? (
          <>
            <MonthHead ym={emptyAt} />
            <EmptyMonth kind={kind} ym={emptyAt} near={nearestMonth(counts, kind, emptyAt)} onGo={(ym) => jumpTo(ym)} />
          </>
        ) : (
          groups.map((g, i) => (
            <section key={g.ym} aria-label={monthLabel(g.ym)}>
              <MonthHead ym={g.ym} n={countIn(counts, g.ym, kind)} stuck={i === 0} />
              <ul className={ROWS}>
                {g.items.map((item) => (
                  <FeedItemRow key={item.key} item={item} now={now} when={dayLabel(item.at)} />
                ))}
              </ul>
            </section>
          ))
        )}
        {!emptyAt && <ArchiveFoot shown={entry.items.length} total={total} entry={entry} onMore={more} />}
      </div>
      {jumping && (
        <JumpSheet
          counts={counts}
          kind={kind}
          current={anchor ?? newest}
          now={now}
          onPick={jumpTo}
          onClose={() => setJumping(false)}
          popover={desktop}
          at={panelAt}
          panelRef={panelRef}
          triggerRef={triggerRef}
        />
      )}
    </div>
  );
}
