"use client";
// §F, the history list (collection edit F0 to F3): every entry of the last 90 days, newest first,
// grouped by day. A whole row opens its entry in place: a short one lists every row it changed, a
// long one opens on its first group with chips for the four groups and `Show more` in steps, so a
// Replace of hundreds of rows is never rendered whole (F3). Entries past the first page arrive
// through `Show older changes`. Each entry that is not already reverted, and that recorded a row, has its
// own Revert control, which opens the revert confirmation.

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadCollectionHistory, loadCollectionHistoryEntry, loadHistoryLiveFor } from "../../app/collection/history-actions";
import { nowHolderNames, type HistoryLive } from "../../lib/collection/history-live-view";
import { moveCopyCopy } from "../../lib/copy/move-copy";
import { ChangeCopyDoor } from "../cards/change-copy-door";
import type { HistoryEntry, HistoryListEntry } from "../../lib/collection/history";
import { historyKindOf, type HistoryKind } from "../../lib/collection/history-kind";
import {
  GROUP_FIRST, GROUP_STEP, SHORT_ENTRY_ROWS, dayLabel, entryTitle, fullStamp, groupByDay, groupRows, hasRecent, msToLocalMidnight, rowDelta,
  timeSlot, whenPhrase, type RowGroup,
} from "../../lib/collection/history-view";
import type { HistoryRow } from "../../db/schema";
import { cartDecksOf, type CartDecks } from "../../lib/collection/deck-line";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { validTimeZone } from "../../lib/time/zoned";
import { PendingReporter } from "../shell/pending-reporter";
import { ReplaceIcon } from "./replace-icon";
import { RevertConfirm } from "./revert-confirm";
import { Chevron } from "../ui/chevron";
import { useHydrated } from "../ui/hydrated-art";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { reveal } from "../../lib/ui/reveal";

const c = collectionEditCopy.history;

const TAG_INK: Record<HistoryKind, string> = {
  uploadReplace: "var(--warning)",
  uploadAdd: "var(--success)",
  uploadSync: "var(--fg)",
  add: "var(--success)",
  deckAdd: "var(--success)",
  edit: "var(--accent-text)",
  shopping: "var(--success)",
  remove: "var(--danger)",
  revert: "var(--fg-muted)",
};

/** What follows a `Went to …` sentence (Move a copy, #2980): where the copy is NOW when that differs, then Change. The record is not touched. */
function LiveTail({ oracleId, cardName, wentDeckIds, soft, live, onWritten }: {
  oracleId: string;
  cardName: string;
  wentDeckIds: readonly string[];
  soft: boolean;
  live: HistoryLive | undefined;
  onWritten?: (oracleId: string) => void;
}) {
  if (soft || !live) return null;
  const now = nowHolderNames(wentDeckIds, live);
  return (
    <>
      {now ? <>{" "}<span data-testid="history-now">{moveCopyCopy.history.now(now)}</span></> : null}
      {live.change && onWritten ? <>{" "}<ChangeCopyDoor oracleId={oracleId} cardName={cardName} owned={1} onWritten={() => onWritten(oracleId)} /></> : null}
    </>
  );
}

function RowLine({ row, rowDecks, live, onWritten }: {
  row: HistoryRow;
  rowDecks: Readonly<Record<string, string>> | null;
  live?: Readonly<Record<string, HistoryLive>>;
  onWritten?: (oracleId: string) => void;
}) {
  const d = rowDelta(row);
  const where = [row.setCode ? row.setCode.toUpperCase() : "", row.collectorNumber ? `#${row.collectorNumber}` : "", row.finish === "nonfoil" ? "" : row.finish]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex min-h-[40px] items-center gap-[10px] border-b border-b-[color:var(--border)] py-[6px] last:border-b-0">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-[color:var(--fg)]">{row.name}</span>
        {where ? <span className="block font-mono text-[11px] text-[color:var(--fg-faint)]">{where}</span> : null}
        {rowDecks && row.wentTo ? (
          <div className="text-[12px] text-[color:var(--fg-muted)]">
            {row.wentTo.soft ? gotItCopy.history.wentTo.leadSoft : gotItCopy.history.wentTo.lead}{" "}
            <DeckNames
              decks={cartDecksOf(row.wentTo.decks.map((d) => d.deckId), new Map(Object.entries(rowDecks)))}
              linked={false}
            />
            {"."}
            <LiveTail
              oracleId={row.oracleId}
              cardName={row.name}
              wentDeckIds={row.wentTo.decks.map((x) => x.deckId)}
              soft={row.wentTo.soft === true}
              live={live?.[row.oracleId]}
              onWritten={onWritten}
            />
          </div>
        ) : null}
      </div>
      <span className="flex-none font-mono text-[12.5px]" style={{ color: d > 0 ? "var(--success)" : "var(--fg-muted)" }}>
        {d === 0 ? c.rowDetails : c.rowDelta(d)}
      </span>
    </li>
  );
}

/** The line under a `From Shopping` entry, beside the disclosure. */
const DECK_LINE = "m-0 px-[14px] pb-[10px] text-[12px] text-[color:var(--fg-muted)] md:pl-[176px] md:text-[12.5px]";

/**
 * §D's deck line under a `From Shopping` entry: the deck's name as it reads now, a link to the deck,
 * or the deleted form with no link (Revert stays: it only touches the collection). The link opens the
 * deck rather than its Shopping view: the All / Shopping choice is builder state with no URL.
 * Beside the disclosure rather than in it, like the reverted line: a link in a button is invalid.
 */
function ShoppingDeckLine({ deck, linked }: { deck: NonNullable<HistoryListEntry["shoppingDeck"]>; linked: boolean }) {
  const cls = DECK_LINE;
  if (deck.name === null) return <p className={cls}>{gotItCopy.history.fromDeleted}</p>;
  const line = gotItCopy.history.fromDeck(deck.name);
  return (
    <p className={cls}>
      {line.pre}{" "}
      {linked ? (
        <a href={`/decks/${deck.id}`} className="text-[color:var(--accent-text)] underline underline-offset-2">{line.link}</a>
      ) : (
        // Drawn without links (/about's figure), as the reverted line is: a link out of the page's specimen is a dead end.
        <span>{line.link}</span>
      )}
      {line.post}
    </p>
  );
}

/**
 * The decks of a deck line as one run of text: the first few linked (plain on /about, which links nowhere),
 * then the count of the rest and of those since deleted, joined by commas and a last "and".
 */
function DeckNames({ decks, linked }: { decks: CartDecks; linked: boolean }) {
  const bf = gotItCopy.history.boughtFor;
  const items: React.ReactNode[] = [
    ...decks.named.map((d) => (linked
      ? <a key={d.id} href={`/decks/${d.id}`} className="text-[color:var(--accent-text)] underline underline-offset-2">{d.name}</a>
      : <span key={d.id}>{d.name}</span>)),
    ...(decks.more > 0 ? [<span key="more">{bf.more(decks.more)}</span>] : []),
    ...(decks.gone > 0 ? [<span key="gone">{bf.gone(decks.gone)}</span>] : []),
  ];
  return (
    <>
      {items.map((it, i) => (
        <span key={i}>{i === 0 ? "" : i === items.length - 1 ? " and " : ", "}{it}</span>
      ))}
    </>
  );
}

/**
 * The cart's line: a purchase from Shopping for all decks names the cart, and then the decks it was
 * bought for (the first few, linked, then a count), so the entry says where its copies went.
 */
function ShoppingCartLine({ linked, decks }: { linked: boolean; decks: HistoryListEntry["cartDecks"] }) {
  const line = gotItCopy.history.fromCart;
  const named = decks !== null && decks.named.length + decks.more + decks.gone > 0;
  return (
    <p className={DECK_LINE}>
      {line.pre}{" "}
      {linked ? (
        <Link href="/decks/shopping" className="text-[color:var(--accent-text)] underline underline-offset-2">
          {line.link}
          <PendingReporter href="/decks/shopping" />
        </Link>
      ) : (
        <span>{line.link}</span>
      )}
      {line.post}
      {named ? <>{". "}{gotItCopy.history.boughtFor.lead} <DeckNames decks={decks} linked={linked} />{"."}</> : null}
    </p>
  );
}

/** Where an add's or an upload's copies went, kept at arrival: one line under the entry. */
function WentToLine({ wentTo, linked, single, cardName, live, onWritten }: {
  wentTo: NonNullable<HistoryListEntry["wentTo"]>;
  linked: boolean;
  /** An entry of one card: its summary line takes the live tail (an entry of many cards is Move a copy's PR 4). */
  single?: HistoryListEntry["single"];
  cardName: string | null;
  live?: Readonly<Record<string, HistoryLive>>;
  onWritten?: (oracleId: string) => void;
}) {
  const w = gotItCopy.history.wentTo;
  return (
    <div className={DECK_LINE}>
      {wentTo.soft ? w.leadSoft : w.lead} <DeckNames decks={wentTo.decks} linked={linked} />{"."}
      {single && cardName ? (
        <LiveTail oracleId={single.oracleId} cardName={cardName} wentDeckIds={single.wentDeckIds} soft={wentTo.soft} live={live?.[single.oracleId]} onWritten={onWritten} />
      ) : null}
    </div>
  );
}

/** What an opened entry shows: every row when it is short, else its groups, one at a time, paged. */
/**
 * `rowDecks` names the decks a row's own line may print. Null (no row line) for an entry of one row that
 * already shows its entry line, which says it: the same sentence an inch apart would be said twice. An entry read
 * before an upload's placement was stamped has no entry line, so its rows speak for themselves.
 */
function EntryRows({ rows, rowDecks, live, onWritten }: {
  rows: HistoryRow[];
  rowDecks: Readonly<Record<string, string>> | null;
  live?: Readonly<Record<string, HistoryLive>>;
  onWritten?: (oracleId: string) => void;
}) {
  const groups = useMemo(() => groupRows(rows), [rows]);
  const [picked, setPicked] = useState<RowGroup | null>(null);
  const [shown, setShown] = useState(GROUP_FIRST);
  const groupIds = useId();
  if (rows.length === 0) return <p className="m-0 py-[6px] text-[13px] text-[color:var(--fg-muted)]">{c.noRows}</p>;
  if (rows.length <= SHORT_ENTRY_ROWS) {
    return <ul className="m-0 list-none p-0">{rows.map((r, i) => <RowLine key={i} row={r} rowDecks={rowDecks} live={live} onWritten={onWritten} />)}</ul>;
  }
  const active = groups.find((g) => g.group === picked) ?? groups[0];
  if (!active) return null;
  return (
    <div>
      <div className="mb-[8px]">
        <SegmentedSwitch
          kind="tabs"
          tone="neutral"
          size="compact"
          scroll
          ariaLabel={c.heading}
          ids={{ tab: (g) => `${groupIds}-tab-${g}`, panel: (g) => `${groupIds}-panel-${g}` }}
          segments={groups.map((g) => ({
            value: g.group,
            label: `${c.groups[g.group]} ·`,
            count: g.rows.length.toLocaleString("en-US"),
          }))}
          value={active.group}
          onChange={(g) => {
            setPicked(g);
            setShown(GROUP_FIRST);
          }}
        />
      </div>
      {/* Focusable: its rows are text, so without it Tab passes from the chosen group straight to Show more, or
          out of the panel when there is no more. */}
      <div
        role="tabpanel"
        tabIndex={0}
        id={`${groupIds}-panel-${active.group}`}
        aria-labelledby={`${groupIds}-tab-${active.group}`}
      >
        <ul className="m-0 list-none p-0">{active.rows.slice(0, shown).map((r, i) => <RowLine key={i} row={r} rowDecks={rowDecks} live={live} onWritten={onWritten} />)}</ul>
        {shown < active.rows.length ? (
          <button
            type="button"
            onClick={() => setShown((s) => s + GROUP_STEP)}
            className="mt-[6px] min-h-[44px] cursor-pointer text-[13px] text-[color:var(--accent-text)] underline underline-offset-2"
          >
            {c.showMore(Math.min(GROUP_STEP, active.rows.length - shown), active.rows.length - shown)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** What every time on the list is read against: now, the reader's zone and the locale their clock follows (undefined: the browser's). */
export type HistoryClock = { nowMs: number; zone: string; locale: string | undefined };

/**
 * The list's clock. The server and the first client render use the cookie's zone (UTC with none yet) and "en-US", so they agree;
 * once hydrated the browser's own zone and locale take over. `now` re-reads once a minute while an entry is under an hour old (its
 * "12 min ago" moves) and at the reader's next local midnight (Today becomes Yesterday), each seeded from the server's `nowMs`.
 */
function useHistoryClock(serverNowMs: number, timeZone: string | null, entries: readonly HistoryListEntry[]): HistoryClock {
  const hydrated = useHydrated();
  const browser = hydrated ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const zone = browser && validTimeZone(browser) ? browser : (timeZone ?? "UTC");
  const [nowMs, setNowMs] = useState(serverNowMs);
  const recent = hasRecent(entries, nowMs);
  useEffect(() => {
    let timer = 0;
    const schedule = (from: number) => {
      const toMinute = recent ? 60_000 - (from % 60_000) : Infinity;
      timer = window.setTimeout(() => {
        const t = Date.now();
        setNowMs(t);
        schedule(t);
      }, Math.min(msToLocalMidnight(from, zone), toMinute) + 50);
    };
    schedule(Date.now());
    return () => window.clearTimeout(timer);
  }, [zone, recent]);
  return { nowMs, zone, locale: hydrated ? undefined : "en-US" };
}

/**
 * One entry of the list: its disclosure, its Revert, the reverted and aged notes and, when open,
 * its rows. Exported so /about draws the same row with fixture props rather than a copy of it.
 */
export function HistoryEntryItem({
  e,
  title,
  revertedByEntry,
  isOpen,
  detail,
  onToggle,
  onRevert,
  onRetry,
  clock,
  anchor = true,
  live,
  onWritten,
}: {
  e: HistoryListEntry;
  title: string;
  revertedByEntry?: HistoryListEntry;
  isOpen: boolean;
  detail: HistoryEntry | "loading" | "failed" | undefined;
  onToggle: () => void;
  onRevert: (title: string, sync: boolean) => void;
  onRetry: () => void;
  /** The reader's now and zone: every time on the row is their wall clock. */
  clock: HistoryClock;
  /** The row carries `id="entry-…"` for the Add sheet's link. /about draws it without: a page of its own ids. */
  anchor?: boolean;
  /** Move a copy (#2980): the live read by oracle id; absent where none was made (/about's figure), which draws no Change. */
  live?: Readonly<Record<string, HistoryLive>>;
  /** A move was written from this entry's Change: the list re-reads that card. */
  onWritten?: (oracleId: string) => void;
}) {
  const kind = historyKindOf(e);
  const reverted = e.revertedBy !== null;
  return (
    <li
      id={anchor ? `entry-${e.id}` : undefined}
      className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface)]"
    >
      <div className="flex items-center">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="grid min-w-0 flex-1 cursor-pointer grid-cols-[1fr_auto] items-center gap-x-[12px] gap-y-[4px] border-0 bg-transparent p-[12px_14px] text-left text-[color:var(--fg)] md:grid-cols-[150px_1fr_auto]"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.06em]" style={{ color: TAG_INK[kind] }}>
          {c.kinds[kind]}
        </span>
        <time
          dateTime={e.createdAt.toISOString()}
          title={fullStamp(e.createdAt, clock.zone, clock.locale)}
          className="font-mono text-[11.5px] text-[color:var(--fg-faint)] md:order-last"
        >
          {timeSlot(e.createdAt, clock.nowMs, clock.zone, clock.locale)}
        </time>
        <span className="col-span-2 flex min-w-0 flex-col gap-[3px] md:col-span-1">
          <span className="truncate text-[14px]" style={{ color: reverted ? "var(--fg-muted)" : "var(--fg)" }}>
            {title} <Chevron kind="disclosure" open={isOpen} className="text-[color:var(--fg-faint)]" />
          </span>
          <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)]">{c.figures(e.copiesUp, e.copiesDown, e.rowCount)}</span>
        </span>
      </button>
      {!reverted && e.rowCount > 0 ? (
        // Its own control beside the disclosure, never inside it: a button in a button. Not on an
        // entry that recorded no rows (a Replace that matched, a revert that found nothing left):
        // reverting it would change nothing.
        <button
          type="button"
          onClick={() => onRevert(title, kind === "uploadSync")}
          aria-label={`${c.revert} ${title}`}
          className="mr-[10px] min-h-[44px] flex-none cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[12px] text-[13px] text-[color:var(--fg)] md:min-h-[32px]"
        >
          {c.revert}
        </button>
      ) : null}
      </div>
      {e.shoppingDeck ? <ShoppingDeckLine deck={e.shoppingDeck} linked={anchor} /> : null}
      {e.shoppingCart ? <ShoppingCartLine linked={anchor} decks={e.cartDecks} /> : null}
      {e.wentTo ? <WentToLine wentTo={e.wentTo} linked={anchor} single={e.single} cardName={e.firstName} live={live} onWritten={onWritten} /> : null}
      {reverted ? (
        <p className="m-0 px-[14px] pb-[10px] text-[12.5px] text-[color:var(--fg-faint)] md:pl-[176px]">
          {c.reverted}
          {e.revertedByVisible && revertedByEntry ? (
            <>
              {" · "}
              {anchor ? (
                <a href={`#entry-${revertedByEntry.id}`} className="text-[color:var(--accent-text)] underline underline-offset-2">
                  {c.revertedBy(whenPhrase(revertedByEntry.createdAt, clock.nowMs, clock.zone, clock.locale))}
                </a>
              ) : (
                // Drawn without row anchors (/about's figure): a link to nothing would be a dead end.
                <span>{c.revertedBy(whenPhrase(revertedByEntry.createdAt, clock.nowMs, clock.zone, clock.locale))}</span>
              )}
            </>
          ) : null}
        </p>
      ) : null}
      {e.kind === "revert" && !e.revertsVisible ? (
        <p className="m-0 px-[14px] pb-[10px] text-[12.5px] text-[color:var(--fg-faint)] md:pl-[176px]">{c.agedNote}</p>
      ) : null}
      {isOpen ? (
        <div className="border-t border-t-[color:var(--border)] px-[14px] py-[8px] md:pl-[176px]">
          {detail && detail !== "loading" && detail !== "failed" ? (
            <>
              {/* A Sync leads with what it kept and what the player decided (Y2): not rows of the
                  entry, since the Sync never wrote them, so they sit above the groups, not in them. */}
              {detail.sync ? (
                <p className="m-0 pb-[10px] text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
                  {c.syncNote(detail.sync.kept, detail.sync.decided, detail.sync.tokens)}
                </p>
              ) : null}
              <EntryRows rows={detail.rows} rowDecks={detail.rows.length > 1 || !e.wentTo ? detail.rowDecks : null} live={live} onWritten={onWritten} />
            </>
          ) : detail === "failed" ? (
            <p role="alert" className="m-0 text-[13px] text-[color:var(--fg-body)]">
              {c.loadFailed}{" "}
              <button type="button" onClick={onRetry} className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-[color:var(--accent-text)] underline underline-offset-2">
                {c.loadRetry}
              </button>
            </p>
          ) : (
            <p role="status" className="m-0 text-[13px] text-[color:var(--fg-muted)]">{c.loading}</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function HistoryList({
  initial,
  nextBefore: initialNext,
  nowMs: serverNowMs,
  reachesBack,
  ship,
  timeZone,
  focusId,
}: {
  initial: HistoryListEntry[];
  nextBefore: number | null;
  nowMs: number;
  reachesBack: Date;
  /** The day the ledger shipped. */
  ship: Date;
  /** The reader's zone from their `the99_tz` cookie, null on a first visit (the browser's takes over once hydrated). */
  timeZone: string | null;
  /** An entry to open and bring into view on arrival (`?entry=`, the Add sheet's link). */
  focusId?: string;
}) {
  const [entries, setEntries] = useState(initial);
  const [next, setNext] = useState(initialNext);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(focusId && initial.some((e) => e.id === focusId) ? [focusId] : []));
  const [details, setDetails] = useState<ReadonlyMap<string, HistoryEntry | "loading" | "failed">>(new Map());
  // Move a copy (#2980): the live half by oracle id. A page's single-card entries ask ONCE, as one batch; an opened entry's
  // rows ride its own load. `asked` keeps a card from being read twice.
  const [live, setLive] = useState<Readonly<Record<string, HistoryLive>>>({});
  const asked = useRef(new Set<string>());
  const [pager, setPager] = useState<"idle" | "loading" | "failed">("idle");
  // The entry whose revert is being decided, with the words the dialog quotes.
  const [reverting, setReverting] = useState<{ id: string; title: string; when: string; sync: boolean } | null>(null);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const { nowMs, zone, locale } = useHistoryClock(serverNowMs, timeZone, entries);
  const clock = useMemo(() => ({ nowMs, zone, locale }), [nowMs, zone, locale]);
  const groups = useMemo(() => groupByDay(entries, nowMs, zone), [entries, nowMs, zone]);

  useEffect(() => {
    const ids = entries.flatMap((e) => (e.single && e.wentTo && !e.wentTo.soft && !asked.current.has(e.single.oracleId) ? [e.single.oracleId] : []));
    if (ids.length === 0) return;
    ids.forEach((id) => asked.current.add(id));
    loadHistoryLiveFor(ids).then((r) => setLive((m) => ({ ...m, ...r }))).catch(() => { ids.forEach((id) => asked.current.delete(id)); });
  }, [entries]);

  // After a move: that card, re-read, so its line draws where the copy is now.
  function reread(oracleId: string) {
    loadHistoryLiveFor([oracleId]).then((r) => setLive((m) => ({ ...m, ...r }))).catch(() => undefined);
  }

  async function fetchDetail(id: string) {
    setDetails((m) => new Map(m).set(id, "loading"));
    try {
      const d = await loadCollectionHistoryEntry(id);
      if (d?.live) setLive((m) => ({ ...m, ...d.live }));
      setDetails((m) => new Map(m).set(id, d ?? "failed"));
    } catch {
      setDetails((m) => new Map(m).set(id, "failed"));
    }
  }

  function toggle(id: string) {
    const isOpen = open.has(id);
    setOpen((s) => {
      const n = new Set(s);
      if (isOpen) n.delete(id);
      else n.add(id);
      return n;
    });
    if (!isOpen && !details.has(id)) void fetchDetail(id);
  }

  // The Add sheet's link arrives with an entry to show: read it, and bring it into view once.
  const focused = useRef(false);
  useEffect(() => {
    if (!focusId || focused.current || !initial.some((e) => e.id === focusId)) return;
    focused.current = true;
    void fetchDetail(focusId);
    reveal(document.getElementById(`entry-${focusId}`), "center");
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function older() {
    if (next === null || pager === "loading") return;
    setPager("loading");
    try {
      const page = await loadCollectionHistory(next);
      setEntries((e) => [...e, ...page.entries]);
      setNext(page.nextBefore);
      setPager("idle");
    } catch {
      setPager("failed");
    }
  }

  return (
    <section className="px-[16px] pb-[32px] pt-[18px] md:px-[24px] md:pt-[24px]">
      <h1 className="m-0 font-display text-[19px] font-semibold md:text-[22px]">{c.heading}</h1>
      <p className="m-0 mt-[4px] text-[13.5px] text-[color:var(--fg-muted)]">{c.lede}</p>

      {entries.length === 0 ? (
        <div className="mt-[28px] flex flex-col items-center gap-[10px] py-[24px] text-center">
          <span aria-hidden className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[color:var(--border-dashed)] text-[color:var(--fg-faint)]">
            <ReplaceIcon size={20} className="" />
          </span>
          <p className="m-0 font-display text-[17px] font-semibold">{c.emptyTitle}</p>
          <p className="m-0 max-w-[420px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.emptyBody(dayLabel(ship, zone))}</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="mt-[20px]">
            <h2 className="m-0 mb-[6px] font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">{g.label}</h2>
            <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
              {g.entries.map((e) => (
                <HistoryEntryItem
                  key={e.id}
                  e={e}
                  title={entryTitle(e, byId, reachesBack, zone)}
                  revertedByEntry={e.revertedBy ? byId.get(e.revertedBy) : undefined}
                  isOpen={open.has(e.id)}
                  detail={details.get(e.id)}
                  onToggle={() => toggle(e.id)}
                  onRevert={(title, sync) => setReverting({ id: e.id, title, when: whenPhrase(e.createdAt, nowMs, zone, locale), sync })}
                  clock={clock}
                  live={live}
                  onWritten={reread}
                  onRetry={() => void fetchDetail(e.id)}
                />
              ))}
            </ul>
          </div>
        ))
      )}

      {next !== null ? (
        <div className="mt-[16px]">
          <button
            type="button"
            onClick={() => void older()}
            disabled={pager === "loading"}
            className="min-h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)] disabled:cursor-wait disabled:opacity-60"
          >
            {pager === "loading" ? c.loading : c.olderEntries}
          </button>
          {pager === "failed" ? <p role="alert" className="m-0 mt-[6px] text-[13px] text-[color:var(--fg-body)]">{c.loadFailed}</p> : null}
        </div>
      ) : null}

      {reverting ? (
        <RevertConfirm
          entryId={reverting.id}
          title={reverting.title}
          titleShape={reverting.sync ? "sync" : "entry"}
          when={reverting.when}
          onClose={() => setReverting(null)}
          onReverted={() => setReverting(null)}
        />
      ) : null}

      <p className="m-0 mt-[28px] max-w-[560px] text-[12.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot(dayLabel(reachesBack, zone))}</p>
    </section>
  );
}
