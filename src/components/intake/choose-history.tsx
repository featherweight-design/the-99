"use client";
// Help me choose History (R1, design/design_handoff_the99_hmc_history): the player's past runs,
// newest first. ONE component, placed twice by the route: a 380px column beside the form from `lg` (1024px; at 768 the form would be left under 250px)
// up, and the phone's own view (`v=history`). A row is a link to the results page for that run.
// Stored reads only: nothing here calls a model.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { chooseHistoryPage } from "../../app/decks/new/choose/history-actions";
import { helpMeChooseHistoryCopy as copy } from "../../lib/copy/help-me-choose-history";
import { mergeFirstPage, type ChooseHistoryPage, type ChooseHistoryRow } from "../../lib/intake/history";
import { FailureMark } from "../decks/tuning-history";

/** While a run is in flight the list re-reads its first page at the tools' own cadence. */
const WATCH_MS = 3000;

const noop = () => () => {};
/**
 * False for the server render and the hydrating render, true after: dates are drawn in the reader's own
 * zone, which the server cannot know, so both first passes draw them in UTC (identical, no mismatch) and
 * the zoned pass follows at once.
 */
function useZoned(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
const zone = (zoned: boolean) => (zoned ? {} : { timeZone: "UTC" as const });
/** `Oct 13 · 9:40 PM`, the deck History's own form. */
const fmtDate = (iso: string, zoned: boolean) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...zone(zoned) });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...zone(zoned) });
  return `${day} · ${time}`;
};
const fmtMonth = (iso: string, zoned: boolean) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", ...zone(zoned) });
const fmtDay = (iso: string, zoned: boolean) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", ...zone(zoned) });

type More = "idle" | "loading" | "failed";

export function ChooseHistory({
  initial,
  layout,
}: {
  /** The first page the route read, or null when that read failed. */
  initial: ChooseHistoryPage | null;
  /** `column`: beside the form, desktop. `view`: the phone's own screen. */
  layout: "column" | "view";
}) {
  const [rows, setRows] = useState<ChooseHistoryRow[] | null>(initial?.rows ?? null);
  const [cursor, setCursor] = useState<string | null>(initial?.nextCursor ?? null);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState<More>("idle");
  const column = layout === "column";
  const headingId = `choose-history-${layout}`;
  const zoned = useZoned();
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLElement>(null);
  // The column scrolls inside itself, and its foot fades only while rows remain below.
  const [fade, setFade] = useState(false);
  const measure = () => {
    const el = scroller.current;
    setFade(!!el && column && el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  };
  useEffect(measure, [rows, cursor, column]);

  async function reload() {
    setLoading(true);
    setRows(null);
    try {
      const page = await chooseHistoryPage(null);
      setRows(page.rows);
      setCursor(page.nextCursor);
      setMore("idle");
    } catch {
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  async function showMore() {
    if (!cursor || more === "loading") return;
    setMore("loading");
    try {
      const page = await chooseHistoryPage(cursor);
      setRows((prev) => {
        const seen = new Set((prev ?? []).map((r) => r.id));
        return [...(prev ?? []), ...page.rows.filter((r) => !seen.has(r.id))];
      });
      setCursor(page.nextCursor);
      setMore("idle");
    } catch {
      setMore("failed");
    }
  }

  // A run in flight settles in place: re-read the first page while one is `reading`. One read at a time
  // (a slow answer never overtakes a newer one), and only the instance that is drawn reads at all: the
  // phone's view and the column can both be mounted, one of them hidden.
  const reading = rows?.some((r) => r.state === "reading") ?? false;
  useEffect(() => {
    if (!reading) return;
    let cancelled = false;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || root.current?.offsetParent === null) return;
      inFlight = true;
      try {
        const page = await chooseHistoryPage(null);
        if (!cancelled) setRows((prev) => mergeFirstPage(prev ?? [], page.rows));
      } catch {
        // The next tick asks again; a failed poll leaves the rows as they are.
      } finally {
        inFlight = false;
      }
    }, WATCH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [reading]);

  const empty = rows !== null && rows.length === 0;
  const sections = rows ? byMonth(rows, zoned) : [];

  return (
    <section
      ref={root}
      aria-labelledby={headingId}
      data-testid={`choose-history-${layout}`}
      className={
        column
          ? "flex flex-col gap-[14px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[20px] py-[18px]"
          : "flex flex-col gap-[12px] px-[18px] pb-[24px]"
      }
    >
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <h2 id={headingId} className={`m-0 font-display font-normal text-[color:var(--fg)] ${column ? "text-[19px]" : "text-[24px]"}`}>
          {copy.title}
        </h2>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{empty ? copy.subEmpty : copy.sub}</span>
      </div>

      {rows === null && loading ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-[6px]">
          <span className="sr-only">{copy.loading}</span>
          {[86, 64, 78].map((w) => (
            <div key={w} aria-hidden="true" className="anim-skeleton flex min-h-[60px] flex-col gap-[9px] rounded-[9px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] px-[12px] py-[11px]">
              <span className="h-[11px] rounded-[4px] bg-[color:var(--elevated)]" style={{ width: `${w}%` }} />
              <span className="flex items-center gap-[8px]">
                <span className="h-[30px] w-[70px] rounded-[3px] bg-[color:var(--surface-raised)]" />
                <span className="flex-1" />
                <span className="h-[9px] w-[60px] rounded-[4px] bg-[color:var(--surface-raised)]" />
              </span>
            </div>
          ))}
        </div>
      ) : rows === null ? (
        <LoadFailed onRetry={reload} column={column} busy={false} />
      ) : empty ? (
        <div
          data-testid="choose-history-empty"
          className={`flex flex-col gap-[6px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] ${column ? "p-[16px]" : "px-[16px] py-[18px]"}`}
        >
          <span className="text-[13.5px] font-semibold text-[color:var(--fg-body)]">{copy.empty.head}</span>
          <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)]">{copy.empty.body}</span>
        </div>
      ) : (
        <>
          <nav
            ref={scroller}
            onScroll={measure}
            aria-label={copy.listLabel}
            data-fade={fade || undefined}
            className={`flex flex-col gap-[6px] ${column ? "max-h-[560px] overflow-y-auto overscroll-contain border-0 border-t border-solid border-t-[color:var(--border)] pt-[2px]" : ""}`}
            style={fade ? { maskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 28px), transparent)" } : undefined}
          >
            {sections.map(([month, list]) => (
              <div key={month} className="flex flex-col gap-[6px]">
                <div className="px-[2px] pb-[4px] pt-[8px] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{month}</div>
                <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
                  {list.map((row) => (
                    <li key={row.id}>
                      <RunRow row={row} column={column} zoned={zoned} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {cursor ? (
              <div className="flex flex-col items-start gap-[2px]">
                <button
                  type="button"
                  onClick={showMore}
                  aria-busy={more === "loading" || undefined}
                  className={`flex items-center border-0 bg-transparent px-[2px] text-[12.5px] font-medium text-[color:var(--accent)] ${column ? "min-h-[30px]" : "min-h-[44px]"}`}
                >
                  {copy.more}
                </button>
                {more === "failed" ? (
                  <span role="status" className="px-[2px] text-[12px] text-[color:var(--fg-body)]">{copy.moreFailed}</span>
                ) : null}
              </div>
            ) : null}
          </nav>
          <p className="m-0 border-0 border-t border-solid border-t-[color:var(--border)] pt-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.foot}</p>
        </>
      )}
    </section>
  );
}

function RunRow({ row, column, zoned }: { row: ChooseHistoryRow; column: boolean; zoned: boolean }) {
  const reading = row.state === "reading";
  const date = reading ? copy.row.now : fmtDate(row.at, zoned);
  const tail = row.state === "nothing" ? copy.row.nothing : row.state === "ok" ? copy.row.picks(row.picks) : copy.row.reading;
  const ariaDate = fmtDay(row.at, zoned);
  const label = reading
    ? copy.row.readingAria(row.words)
    : copy.row.aria(row.words, ariaDate, row.state === "nothing" ? copy.row.ariaNothing : copy.row.ariaPicks(row.picks));
  const thumb = column ? "h-[25px] w-[18px]" : "h-[30px] w-[22px]";
  return (
    <Link
      href={row.href}
      prefetch={false}
      aria-label={label}
      data-history-run={row.id}
      data-state={row.state}
      className={`flex flex-col rounded-[9px] border border-solid bg-[color:var(--surface)] no-underline hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--border-strong)] ${
        reading ? "border-[color:var(--accent)]" : "border-[color:var(--border)]"
      } ${column ? "gap-[8px] px-[12px] py-[10px]" : "min-h-[60px] gap-[9px] px-[12px] py-[11px]"}`}
    >
      <span className={`overflow-hidden leading-[1.45] text-[color:var(--fg)] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] ${column ? "text-[13px]" : "text-[13.5px]"}`}>
        {row.words}
      </span>
      <span className="flex items-center gap-[8px]">
        {row.thumbs.length > 0 ? (
          <span aria-hidden="true" className="flex gap-[3px]">
            {row.thumbs.map((id, i) => (
              <span
                key={id}
                className={`${thumb} rounded-[3px] bg-[color:var(--elevated)] bg-cover bg-center`}
                style={row.thumbArt[i] ? { backgroundImage: `url(${row.thumbArt[i]})` } : undefined}
              />
            ))}
          </span>
        ) : null}
        {reading ? (
          <span className="inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--accent)] [background:color-mix(in_srgb,var(--accent)_14%,transparent)]">
            <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[color:currentColor]" />
            {tail}
          </span>
        ) : (
          <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{tail}</span>
        )}
        <span className="flex-1" />
        <span className="whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]">{date}</span>
        {column ? null : <span aria-hidden="true" className="text-[16px] text-[color:var(--fg-faint)]">›</span>}
      </span>
    </Link>
  );
}

function LoadFailed({ onRetry, column, busy }: { onRetry: () => void; column: boolean; busy: boolean }) {
  return (
    <div data-testid="choose-history-failed" className="flex flex-col gap-[14px]">
      <div className="flex items-start gap-[10px]">
        <span className="mt-[2px] flex-none text-[color:var(--danger)]"><FailureMark size={18} label={copy.loadFailed.tag} /></span>
        <p className="m-0 min-w-0 flex-1 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.loadFailed.body}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        aria-busy={busy || undefined}
        className={`flex items-center self-start rounded-[8px] border border-solid border-[color:var(--accent)] bg-transparent px-[18px] text-[13.5px] font-semibold text-[color:var(--accent)] ${column ? "min-h-[40px]" : "min-h-[44px]"}`}
      >
        {copy.retry}
      </button>
    </div>
  );
}

function byMonth(rows: readonly ChooseHistoryRow[], zoned: boolean): [string, ChooseHistoryRow[]][] {
  const out: [string, ChooseHistoryRow[]][] = [];
  for (const row of rows) {
    const month = fmtMonth(row.at, zoned);
    const last = out[out.length - 1];
    if (last && last[0] === month) last[1].push(row);
    else out.push([month, [row]]);
  }
  return out;
}
