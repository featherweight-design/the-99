"use client";
// §F, the history list (collection edit F0 to F3): every entry of the last 90 days, newest first,
// grouped by day. A whole row opens its entry in place: a short one lists every row it changed, a
// long one opens on its first group with chips for the four groups and `Show more` in steps, so a
// Replace of hundreds of rows is never rendered whole (F3). Entries past the first page arrive
// through `Show older changes`. Each entry that is not already reverted has its own Revert control,
// which opens the revert confirmation.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadCollectionHistory, loadCollectionHistoryEntry } from "../../app/collection/history-actions";
import type { HistoryEntry, HistoryListEntry } from "../../lib/collection/history";
import { historyKindOf, type HistoryKind } from "../../lib/collection/history-kind";
import {
  GROUP_FIRST, GROUP_STEP, SHORT_ENTRY_ROWS, dayLabel, entryTitle, groupByDay, groupRows, rowDelta, timeLabel, type RowGroup,
} from "../../lib/collection/history-view";
import type { HistoryRow } from "../../db/schema";
import { cartDecksOf, type CartDecks } from "../../lib/collection/deck-line";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { PendingReporter } from "../shell/pending-reporter";
import { ReplaceIcon } from "./replace-icon";
import { RevertConfirm } from "./revert-confirm";
import { Chevron } from "../ui/chevron";
import { reveal } from "../../lib/ui/reveal";

const c = collectionEditCopy.history;

const TAG_INK: Record<HistoryKind, string> = {
  uploadReplace: "var(--warning)",
  uploadAdd: "var(--success)",
  add: "var(--success)",
  edit: "var(--accent)",
  shopping: "var(--success)",
  remove: "var(--danger)",
  revert: "var(--fg-muted)",
};

function RowLine({ row, rowDecks }: { row: HistoryRow; rowDecks: Readonly<Record<string, string>> | null }) {
  const d = rowDelta(row);
  const where = [row.setCode ? row.setCode.toUpperCase() : "", row.collectorNumber ? `#${row.collectorNumber}` : "", row.finish === "nonfoil" ? "" : row.finish]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex min-h-[40px] items-center gap-[10px] border-b border-b-[color:var(--border)] py-[6px] last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-[color:var(--fg)]">{row.name}</span>
        {where ? <span className="block font-mono text-[11px] text-[color:var(--fg-faint)]">{where}</span> : null}
        {rowDecks && row.wentTo ? (
          <span className="block text-[12px] text-[color:var(--fg-muted)]">
            {row.wentTo.soft ? gotItCopy.history.wentTo.leadSoft : gotItCopy.history.wentTo.lead}{" "}
            <DeckNames
              decks={cartDecksOf(row.wentTo.decks.map((d) => d.deckId), new Map(Object.entries(rowDecks)))}
              linked={false}
            />
            {"."}
          </span>
        ) : null}
      </span>
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
        <a href={`/decks/${deck.id}`} className="text-[color:var(--accent)] underline underline-offset-2">{line.link}</a>
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
      ? <a key={d.id} href={`/decks/${d.id}`} className="text-[color:var(--accent)] underline underline-offset-2">{d.name}</a>
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
        <Link href="/decks/shopping" className="text-[color:var(--accent)] underline underline-offset-2">
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
function WentToLine({ wentTo, linked }: { wentTo: NonNullable<HistoryListEntry["wentTo"]>; linked: boolean }) {
  const w = gotItCopy.history.wentTo;
  return (
    <p className={DECK_LINE}>
      {wentTo.soft ? w.leadSoft : w.lead} <DeckNames decks={wentTo.decks} linked={linked} />{"."}
    </p>
  );
}

/** What an opened entry shows: every row when it is short, else its groups, one at a time, paged. */
/**
 * `rowDecks` names the decks a row's own line may print. Null (no row line) for an entry of one row, whose
 * entry line already says it: the same sentence an inch apart would be said twice.
 */
function EntryRows({ rows, rowDecks }: { rows: HistoryRow[]; rowDecks: Readonly<Record<string, string>> | null }) {
  const groups = useMemo(() => groupRows(rows), [rows]);
  const [picked, setPicked] = useState<RowGroup | null>(null);
  const [shown, setShown] = useState(GROUP_FIRST);
  if (rows.length === 0) return <p className="m-0 py-[6px] text-[13px] text-[color:var(--fg-muted)]">{c.noRows}</p>;
  if (rows.length <= SHORT_ENTRY_ROWS) {
    return <ul className="m-0 list-none p-0">{rows.map((r, i) => <RowLine key={i} row={r} rowDecks={rowDecks} />)}</ul>;
  }
  const active = groups.find((g) => g.group === picked) ?? groups[0];
  if (!active) return null;
  return (
    <div>
      <div role="group" aria-label={c.heading} className="mb-[8px] flex flex-wrap gap-[6px]">
        {groups.map((g) => (
          <button
            key={g.group}
            type="button"
            aria-pressed={g.group === active.group}
            onClick={() => {
              setPicked(g.group);
              setShown(GROUP_FIRST);
            }}
            className={`min-h-[32px] cursor-pointer rounded-full border-0 px-[12px] font-mono text-[12px] ${
              g.group === active.group ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-[color:var(--elevated)] text-[color:var(--fg)]"
            }`}
          >
            {c.groups[g.group]} · {g.rows.length.toLocaleString("en-US")}
          </button>
        ))}
      </div>
      <ul className="m-0 list-none p-0">{active.rows.slice(0, shown).map((r, i) => <RowLine key={i} row={r} rowDecks={rowDecks} />)}</ul>
      {shown < active.rows.length ? (
        <button
          type="button"
          onClick={() => setShown((s) => s + GROUP_STEP)}
          className="mt-[6px] min-h-[44px] cursor-pointer text-[13px] text-[color:var(--accent)] underline underline-offset-2"
        >
          {c.showMore(Math.min(GROUP_STEP, active.rows.length - shown), active.rows.length - shown)}
        </button>
      ) : null}
    </div>
  );
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
  anchor = true,
}: {
  e: HistoryListEntry;
  title: string;
  revertedByEntry?: HistoryListEntry;
  isOpen: boolean;
  detail: HistoryEntry | "loading" | "failed" | undefined;
  onToggle: () => void;
  onRevert: (title: string) => void;
  onRetry: () => void;
  /** The row carries `id="entry-…"` for the Add sheet's link. /about draws it without: a page of its own ids. */
  anchor?: boolean;
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
        <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)] md:order-last">{timeLabel(e.createdAt)}</span>
        <span className="col-span-2 flex min-w-0 flex-col gap-[3px] md:col-span-1">
          <span className="truncate text-[14px]" style={{ color: reverted ? "var(--fg-muted)" : "var(--fg)" }}>
            {title} <Chevron open={isOpen} className="text-[color:var(--fg-faint)]" />
          </span>
          <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)]">{c.figures(e.copiesUp, e.copiesDown, e.rowCount)}</span>
        </span>
      </button>
      {!reverted ? (
        // Its own control beside the disclosure, never inside it: a button in a button.
        <button
          type="button"
          onClick={() => onRevert(title)}
          aria-label={`${c.revert} ${title}`}
          className="mr-[10px] min-h-[44px] flex-none cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[12px] text-[13px] text-[color:var(--fg)] md:min-h-[32px]"
        >
          {c.revert}
        </button>
      ) : null}
      </div>
      {e.shoppingDeck ? <ShoppingDeckLine deck={e.shoppingDeck} linked={anchor} /> : null}
      {e.shoppingCart ? <ShoppingCartLine linked={anchor} decks={e.cartDecks} /> : null}
      {e.wentTo ? <WentToLine wentTo={e.wentTo} linked={anchor} /> : null}
      {reverted ? (
        <p className="m-0 px-[14px] pb-[10px] text-[12.5px] text-[color:var(--fg-faint)] md:pl-[176px]">
          {c.reverted}
          {e.revertedByVisible && revertedByEntry ? (
            <>
              {" · "}
              {anchor ? (
                <a href={`#entry-${revertedByEntry.id}`} className="text-[color:var(--accent)] underline underline-offset-2">
                  {c.revertedBy(timeLabel(revertedByEntry.createdAt))}
                </a>
              ) : (
                // Drawn without row anchors (/about's figure): a link to nothing would be a dead end.
                <span>{c.revertedBy(timeLabel(revertedByEntry.createdAt))}</span>
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
            <EntryRows rows={detail.rows} rowDecks={detail.rows.length > 1 ? detail.rowDecks : null} />
          ) : detail === "failed" ? (
            <p role="alert" className="m-0 text-[13px] text-[color:var(--fg-body)]">
              {c.loadFailed}{" "}
              <button type="button" onClick={onRetry} className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-[color:var(--accent)] underline underline-offset-2">
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
  nowMs,
  reachesBackLabel,
  reachesBack,
  shipLabel,
  focusId,
}: {
  initial: HistoryListEntry[];
  nextBefore: number | null;
  nowMs: number;
  reachesBackLabel: string;
  reachesBack: Date;
  shipLabel: string;
  /** An entry to open and bring into view on arrival (`?entry=`, the Add sheet's link). */
  focusId?: string;
}) {
  const [entries, setEntries] = useState(initial);
  const [next, setNext] = useState(initialNext);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(focusId && initial.some((e) => e.id === focusId) ? [focusId] : []));
  const [details, setDetails] = useState<ReadonlyMap<string, HistoryEntry | "loading" | "failed">>(new Map());
  const [pager, setPager] = useState<"idle" | "loading" | "failed">("idle");
  // The entry whose revert is being decided, with the words the dialog quotes.
  const [reverting, setReverting] = useState<{ id: string; title: string; when: string } | null>(null);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const groups = useMemo(() => groupByDay(entries, nowMs), [entries, nowMs]);

  async function fetchDetail(id: string) {
    setDetails((m) => new Map(m).set(id, "loading"));
    try {
      const d = await loadCollectionHistoryEntry(id);
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
          <p className="m-0 max-w-[420px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.emptyBody(shipLabel)}</p>
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
                  title={entryTitle(e, byId, reachesBack)}
                  revertedByEntry={e.revertedBy ? byId.get(e.revertedBy) : undefined}
                  isOpen={open.has(e.id)}
                  detail={details.get(e.id)}
                  onToggle={() => toggle(e.id)}
                  onRevert={(title) => setReverting({ id: e.id, title, when: `${dayLabel(e.createdAt)}, ${timeLabel(e.createdAt)}` })}
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
          when={reverting.when}
          onClose={() => setReverting(null)}
          onReverted={() => setReverting(null)}
        />
      ) : null}

      <p className="m-0 mt-[28px] max-w-[560px] text-[12.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot(reachesBackLabel)}</p>
    </section>
  );
}
