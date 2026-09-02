"use client";

import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { filterByColors } from "../../lib/commanders/filter";
import { rankMap } from "../../lib/commanders/rank-maps";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import { availabilityCopy } from "../../lib/copy/availability";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { RecCard, type ScoreDelta } from "./rec-card";
import { GuidedBanner } from "./guided-banner";
import { DegradedBanner } from "./degraded-banner";
import { FilteredEmpty } from "./filtered-empty";
import {
  REVEAL_STEP,
  RevealControl,
  EndOfRanking,
  WindowCount,
} from "./reveal-control";

// ── URL helpers (mirrors collection/browser.tsx pattern) ─────────────────────

export type AvailMode = "all" | "free";

// A commander whose whole pool is free. Shared rather than allocated per row,
// and the fallback for the degraded read, where the page has no counts at all:
// zero claims renders the receipt's first clause alone, which stays true.
const NO_CLAIMS: ReceiptCounts = { inUse: 0, wantedByBrew: 0 };

function parseColors(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.toUpperCase().split("").filter((c) => "WUBRG".includes(c)))];
}

function serializeParams(colors: string[], avail: AvailMode): string {
  const p = new URLSearchParams();
  if (colors.length > 0) p.set("c", colors.join(""));
  // Only the non-default is written, so a player who never touches the toggle
  // keeps the URL they have today. Writing it at all is the point: this function
  // runs on every colour change, and a narrower version would silently drop
  // `?avail=free` on the next pip click and re-rank the page behind them.
  if (avail === "free") p.set("avail", "free");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * `Score against` (§7). A radiogroup, not a tablist: it switches the data the
 * page is ranked on, not which panel is showing — the handoff says so in as many
 * words, and a tablist would promise a panel swap that never happens.
 *
 * The label is never shortened to "Availability". It is doing anti-collision
 * work against the builder's `Owned only`, which filters a collection and asks
 * a different question entirely.
 */
function ScoreAgainst({
  value,
  onChange,
  disabled,
  labelId,
  size,
}: {
  value: AvailMode;
  onChange: (next: AvailMode) => void;
  disabled: boolean;
  labelId: string;
  size: "mobile" | "desktop";
}) {
  const { ranking, degraded: degradedCopy } = availabilityCopy;
  const height = size === "mobile" ? 38 : 30;
  const fontSize = size === "mobile" ? 13 : 12.5;
  const segments = [
    { mode: "all" as const, label: ranking.all, aria: ranking.allAria },
    { mode: "free" as const, label: ranking.free, aria: ranking.freeAria },
  ];

  // A radiogroup is one tab stop, and the arrows move within it — the pattern
  // every screen-reader user expects the moment the role is announced. Selection
  // follows focus, which is the shipped behaviour for a group this small and
  // matches what a click already does.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = (from: number, dir: 1 | -1) => {
    const next = (from + dir + segments.length) % segments.length;
    if (disabled && segments[next].mode === "free") return;
    refs.current[next]?.focus();
    onChange(segments[next].mode);
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="flex gap-[3px] rounded-lg p-[3px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border-strong)" }}
    >
      {segments.map((s, i) => {
        const active = s.mode === value;
        // Only `What's free` can be unavailable: `Everything I own` needs no
        // deck read, so it stays reachable through the whole outage.
        const off = disabled && s.mode === "free";
        return (
          <button
            key={s.mode}
            ref={(n) => {
              refs.current[i] = n;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={off || undefined}
            aria-label={off ? degradedCopy.segmentDisabledAria : s.aria}
            // Roving: the checked segment is the group's single tab stop.
            tabIndex={active ? 0 : -1}
            onClick={() => !off && onChange(s.mode)}
            onKeyDown={(e) => {
              const dir =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (dir === 0) return;
              e.preventDefault();
              step(i, dir);
            }}
            className={[
              "flex items-center justify-center rounded-md",
              size === "mobile" ? "flex-1 px-[10px]" : "px-[13px]",
              off ? "cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            style={{
              height,
              fontSize,
              border: 0,
              whiteSpace: "nowrap",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--bg)" : off ? "var(--fg-locked)" : "var(--fg-body)",
              fontWeight: active ? 600 : 500,
              textDecoration: off ? "line-through" : undefined,
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

const COLOR_LABELS: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

// ── Component ─────────────────────────────────────────────────────────────────

export type CommandersViewProps = {
  results: CommanderListItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  firstRun: boolean;
  /**
   * Which ranking the server rendered, parsed from `?avail=`. The URL is the
   * single source of truth: `rankFree` runs on the server, so a client-only
   * mode would show one ranking's numerals over the other's rows.
   */
  avail: AvailMode;
  /** The same commanders re-scored against the free pool. Null in `all` mode. */
  freeItems: CommanderListItem[] | null;
  /** False when the availability read failed — `What's free` is unavailable. */
  availOk: boolean;
  /** Receipt clause counts by oracleId, for both modes. */
  receiptCounts: Map<string, ReceiptCounts>;
};

export function CommandersView({
  results,
  degraded,
  uniqueCardsRead,
  candidateCount,
  firstRun,
  avail,
  freeItems,
  availOk,
  receiptCounts,
}: CommandersViewProps) {
  const router = useRouter();
  const search = useSearchParams();

  const [colors, setColors] = useState<string[]>(() =>
    parseColors(search.get("c")),
  );

  // Mirror color filter to URL via shallow replace (no RSC refetch). The mode is
  // CARRIED here and never drives this effect, which is why it comes off a ref:
  //
  //   - Off the prop, a pip clicked while a flip is still in the air would write
  //     the mode the server last sent, and a shallow replace to `?c=W` would
  //     both drop `?avail=free` and race the push that was fetching it.
  //   - As a dependency, the flip itself would fire a replace alongside its own
  //     push — two navigations for one click.
  //
  // The ref reads what is DRAWN, so the pip lands on the same destination the
  // transition was already heading for, with the filter added.
  const availRef = useRef(avail);
  useEffect(() => {
    const qs = serializeParams(colors, availRef.current);
    router.replace(`/commanders${qs}`, { scroll: false });
  }, [colors, router]);

  // Which list is on screen. Falling back to `results` when the free ranking is
  // missing keeps the page rendering something true rather than nothing.
  const active = avail === "free" && freeItems ? freeItems : results;

  const filtered = useMemo(() => filterByColors(active, colors), [active, colors]);

  // Two rank maps, each built once over the FULL candidate set in that mode's
  // ordering. Both are pre-filter, so filtering still never renumbers: a hidden
  // rank leaves a gap rather than closing it. The numeral does move when the
  // toggle moves, and that is the point — the score itself changed.
  const rankAll = useMemo(() => rankMap(results), [results]);
  const rankFreeBySlug = useMemo(
    () => (freeItems ? rankMap(freeItems) : null),
    [freeItems],
  );
  const rankBySlug =
    avail === "free" && rankFreeBySlug ? rankFreeBySlug : rankAll;

  // The all-mode score for each commander, joined on oracleId. Both arrays are
  // already on the client, so the delta is a join and not a fetch.
  const allByOracleId = useMemo(
    () => new Map(results.map((r) => [r.oracleId, r])),
    [results],
  );

  // §9.2: free mode only, and only where the score actually moved. It compares a
  // commander to its OWN other score, never to another row, so it is correct at
  // rank 3 and at rank 200 whether or not either is revealed.
  const deltaFor = useCallback(
    (r: CommanderListItem): ScoreDelta | null => {
      if (avail !== "free") return null;
      const was = allByOracleId.get(r.oracleId)?.score;
      if (was === undefined) return null;
      const drop = Math.round(was) - Math.round(r.score);
      return drop > 0 ? { drop, was: Math.round(was) } : null;
    },
    [avail, allByOracleId],
  );

  // ── Windowing (#52) ────────────────────────────────────────────────────────
  // The window belongs to the current result set, not the session, so every
  // filter change puts it back to the first batch.
  const [shown, setShown] = useState(REVEAL_STEP);

  // Clear handler passed to FilteredEmpty
  const handleClearFilter = useCallback(() => {
    setColors([]);
    setShown(REVEAL_STEP);
  }, []);

  // Toggle a single color in/out of active set
  const toggleColor = useCallback((c: string) => {
    setColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
    setShown(REVEAL_STEP);
  }, []);

  // ── Score against (§7) ─────────────────────────────────────────────────────
  // The flip needs the server, because rankFree runs there. A server round trip
  // with no local feedback reads as a dead control, so the pressed segment moves
  // immediately and the list dims until the new ranking lands.
  const [pending, startTransition] = useTransition();
  // The override covers the round trip and nothing more, so it is scoped to the
  // transition rather than cleared. Two failure shapes ride on that. Clearing it
  // on the click would drop it before the new HTML lands and flash the old
  // segment back; expiring it only when `avail` moves would strand it forever on
  // the one navigation that does not move `avail` — a flip to free that the
  // server answers with a degraded `all`, leaving a struck-out segment drawn as
  // checked. Once the transition commits, whatever the server said is the truth.
  const [optimisticAvail, setOptimisticAvail] = useState<{
    from: AvailMode;
    to: AvailMode;
  } | null>(null);
  const pressedAvail =
    pending && optimisticAvail && optimisticAvail.from === avail
      ? optimisticAvail.to
      : avail;

  // Declared after `pressedAvail` and therefore after the effect that reads it,
  // so a pip click in the same commit sees the value the last commit drew. The
  // two never change together: a flip moves the mode, a pip moves the colours.
  useEffect(() => {
    availRef.current = pressedAvail;
  }, [pressedAvail]);

  const setAvail = useCallback(
    (next: AvailMode) => {
      // Against what is DRAWN, not what the server last sent: mid-flight the two
      // differ, and guarding on the server value makes the unpressed segment a
      // dead control for the length of the trip.
      if (next === pressedAvail) return;
      setOptimisticAvail({ from: avail, to: next });
      // The window belongs to the current result set, not the session, and a
      // re-rank means different commanders occupy the revealed range.
      setShown(REVEAL_STEP);
      startTransition(() => {
        router.push(`/commanders${serializeParams(colors, next)}`, {
          scroll: false,
        });
      });
    },
    [avail, pressedAvail, colors, router],
  );

  const windowed = useMemo(() => filtered.slice(0, shown), [filtered, shown]);
  const remaining = Math.max(0, filtered.length - shown);
  // A list too short to have ever been windowed ends on a plain spacer — the
  // rule means "you've revealed everything", not "the list ended".
  const wasWindowed = filtered.length > REVEAL_STEP;

  const [announcement, setAnnouncement] = useState("");
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const prevShown = useRef(shown);

  const handleReveal = useCallback(() => {
    setShown((s) => Math.min(s + REVEAL_STEP, filtered.length));
  }, [filtered.length]);

  // Both the announcement and the focus move are derived from the *committed*
  // window rather than computed in the click handler: the row to focus doesn't
  // exist yet when the handler runs, and reading `shown` there would let two
  // fast clicks announce a range that was never actually revealed.
  useLayoutEffect(() => {
    const before = prevShown.current;
    prevShown.current = shown;
    // Only a reveal widens the window; a filter change narrows it back. Clearing
    // rather than returning matters twice over: it drops stale screen-reader text
    // that no longer describes the list, and it stops React bailing out later if
    // a reveal happens to produce the string already sitting in the region — an
    // unchanged node is never re-announced.
    if (shown <= before) {
      setAnnouncement("");
      return;
    }
    const n = (v: number) => v.toLocaleString("en-US");
    setAnnouncement(
      `${n(shown)} shown, ${n(filtered.length - shown)} more below. Ranks ${n(before + 1)} to ${n(shown)} added.`,
    );
    // preventScroll: revealing must not move the reader's place. The accent ring
    // is the cue that keyboard position advanced, not a jump down the page.
    itemRefs.current[before]?.focus({ preventScroll: true });
  }, [shown, filtered.length]);

  // The re-rank announcement (§7.7), on the page's one live region. A plain
  // effect on purpose: the reveal handler above is a layout effect and clears
  // the region when the window narrows, which a flip always does. Running after
  // it is what stops the clear from swallowing this.
  const prevAvail = useRef(avail);
  useEffect(() => {
    if (prevAvail.current === avail) return;
    prevAvail.current = avail;
    setAnnouncement(availabilityCopy.ranking.announce(avail, active.length));
  }, [avail, active.length]);

  return (
    <div>
      {/* Present before the first reveal — a live region inserted at announce
          time is frequently not read. Unconditional since #43: the ranking
          toggle exists on every list, including one too short to ever window. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      {/* ── Global degraded banner (above everything) ── */}
      {/* One banner, never two: both reads being down folds into a single
          `both` variant with one Retry, because `retryRecs` re-runs the whole
          page and the player is making one decision, not two. */}
      {(degraded || !availOk) && (
        <div className="px-[14px] pt-[12px] sm:px-0 sm:pt-0">
          <DegradedBanner
            variant={
              degraded && !availOk ? "both" : availOk ? "synergy" : "availability"
            }
          />
        </div>
      )}

      {/* ── First-run guided banner ── */}
      {firstRun && (
        <div className="px-[14px] pt-[12px] sm:px-0 sm:pt-0">
          <GuidedBanner
            uniqueCardsRead={uniqueCardsRead}
            candidateCount={candidateCount}
          />
        </div>
      )}

      {/* ── Desktop sticky filter bar (§Filter container, desktop) ── */}
      <div
        className="hidden sm:block"
        style={{
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          padding: "18px 34px 14px",
          borderBottom: "1px solid var(--border)",
          zIndex: 2,
        }}
      >
        {/* Filter row: pip wrapper + chips + Includes + Order + count */}
        <div className="flex items-center gap-[12px] flex-wrap">
          {/* Pip row wrapper (§Filter pip row wrapper) */}
          <div
            className="flex items-center gap-[8px]"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            {/* "COLORS" label */}
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "var(--fg-faint)",
              }}
            >
              COLORS
            </span>
            {/* Color pips */}
            {(["W", "U", "B", "R", "G"] as const).map((c) => {
              const active = colors.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Filter by ${COLOR_LABELS[c]}`}
                  onClick={() => toggleColor(c)}
                  className="block rounded-full cursor-pointer border-0 p-0 transition-opacity"
                  style={{
                    width: 16,
                    height: 16,
                    background: WUBRG_COLOR[c],
                    opacity: active ? 1 : 0.35,
                    boxShadow: active ? "0 0 0 2px var(--accent)" : "none",
                  }}
                />
              );
            })}
          </div>

          {/* Score against (desktop, §7) — the third control in this row. */}
          <div className="flex items-center gap-[8px]">
            <span
              id="score-against-desktop"
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--fg-faint)",
              }}
            >
              {availabilityCopy.ranking.label}
            </span>
            <ScoreAgainst
              value={pressedAvail}
              onChange={setAvail}
              disabled={!availOk}
              labelId="score-against-desktop"
              size="desktop"
            />
          </div>

          {/* Active filter chips (desktop, §Active-filter chip desktop) */}
          {colors.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-[7px]"
              style={{
                fontSize: 12.5,
                color: "var(--fg)",
                background: "var(--elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: 999,
                padding: "5px 8px 5px 11px",
              }}
            >
              {/* Color dot */}
              <span
                className="block rounded-full shrink-0"
                style={{ width: 9, height: 9, background: WUBRG_COLOR[c] }}
              />
              {COLOR_LABELS[c]}
              {/* Dismiss ✕ */}
              <button
                type="button"
                aria-label={`Remove ${COLOR_LABELS[c]} filter`}
                onClick={() => toggleColor(c)}
                className="cursor-pointer bg-transparent border-0 p-0 leading-none text-[color:var(--fg-faint)]"
              >
                ✕
              </button>
            </span>
          ))}

          {/* Clear link (when any active) */}
          {colors.length > 0 && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="bg-transparent border-0 p-0 cursor-pointer font-mono text-[color:var(--accent)]"
              style={{ fontSize: 12 }}
            >
              Clear
            </button>
          )}

          {/* Window count (§Header window count, desktop) — sits ahead of the
              order label. It is omitted entirely on a list short enough never to
              window, so that surface stays byte-identical to what shipped. */}
          {wasWindowed && (
            <WindowCount
              shown={shown}
              filteredTotal={filtered.length}
              className="font-mono text-[11px] tracking-[0.12em] uppercase ml-auto"
            />
          )}

          {/* "Order: Fit ↓ · fixed" label (desktop, §Order label) */}
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--fg-faint)", marginLeft: wasWindowed ? undefined : "auto" }}
          >
            Order: Fit ↓ · fixed
          </span>

          {/* "Showing N of 24" count — right-aligned amber label */}
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--fg-faint)" }}
          >
            Showing {filtered.length} of {active.length}
          </span>
        </div>

        {/* Note (§7.6) — free state only, under the control. */}
        {avail === "free" && (
          <p
            className="font-mono m-0 mt-[8px]"
            style={{ fontSize: 11, color: "var(--fg-faint)" }}
          >
            {availabilityCopy.ranking.freeNoteLong}
          </p>
        )}
      </div>

      {/* ── Mobile filter strip ── */}
      <div className="sm:hidden px-[14px] pt-[12px] pb-[4px]">
        {/* Mobile pip row wrapper */}
        <div
          className="inline-flex items-center gap-[8px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "8px 11px",
          }}
        >
          {/* "COLORS" label */}
          <span
            className="font-mono"
            style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--fg-faint)" }}
          >
            COLORS
          </span>
          {/* Color pips (mobile 14px) */}
          {(["W", "U", "B", "R", "G"] as const).map((c) => {
            const active = colors.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                aria-label={`Filter by ${COLOR_LABELS[c]}`}
                onClick={() => toggleColor(c)}
                className="block rounded-full cursor-pointer border-0 p-0 transition-opacity"
                style={{
                  width: 14,
                  height: 14,
                  background: WUBRG_COLOR[c],
                  opacity: active ? 1 : 0.35,
                  boxShadow: active ? "0 0 0 2px var(--accent)" : "none",
                }}
              />
            );
          })}

          {/* Showing count (mobile inline, within pip row wrapper area) */}
          <span
            className="font-mono"
            style={{ fontSize: 10.5, color: "var(--fg-faint)", marginLeft: "auto" }}
          >
            {filtered.length}/{active.length}
          </span>
        </div>

        {/* Score against (mobile, §7) — its own block under the colour row. */}
        <div className="mt-[10px]">
          <p
            id="score-against-mobile"
            className="font-mono m-0 mb-[6px]"
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-faint)",
            }}
          >
            {availabilityCopy.ranking.label}
          </p>
          <ScoreAgainst
            value={pressedAvail}
            onChange={setAvail}
            disabled={!availOk}
            labelId="score-against-mobile"
            size="mobile"
          />
          {/* Note (§7.6). The phone buys the short form — the long one's second
              sentence costs a third line at 390px. */}
          {avail === "free" && (
            <p
              className="font-mono m-0 mt-[7px]"
              style={{ fontSize: 10.5, color: "var(--fg-faint)", lineHeight: 1.5 }}
            >
              {availabilityCopy.ranking.freeNote}
            </p>
          )}
        </div>

        {/* Window count (§Header window count, mobile) — its own row under the
            colour filter. */}
        {wasWindowed && (
          <div className="flex items-center justify-between mt-[9px]">
            <WindowCount
              shown={shown}
              filteredTotal={filtered.length}
              className="font-mono text-[10.5px]"
            />
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
              Fit ↓ · fixed
            </span>
          </div>
        )}

        {/* Mobile active filter chips (§Active-filter chip mobile) */}
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-[6px] mt-[8px]">
            {colors.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-[6px]"
                style={{
                  fontSize: 12,
                  color: "var(--fg)",
                  background: "var(--elevated)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 999,
                  padding: "4px 8px 4px 10px",
                }}
              >
                <span
                  className="block rounded-full shrink-0"
                  style={{ width: 9, height: 9, background: WUBRG_COLOR[c] }}
                />
                {COLOR_LABELS[c]}
                <button
                  type="button"
                  aria-label={`Remove ${COLOR_LABELS[c]} filter`}
                  onClick={() => toggleColor(c)}
                  className="cursor-pointer bg-transparent border-0 p-0 leading-none text-[color:var(--fg-faint)]"
                >
                  ✕
                </button>
              </span>
            ))}
            {/* Clear link (mobile) */}
            <button
              type="button"
              onClick={handleClearFilter}
              className="bg-transparent border-0 p-0 cursor-pointer font-mono text-[color:var(--accent)]"
              style={{ fontSize: 11.5 }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Main content: list (or filtered-empty) ── */}
      <div className="p-[12px_14px] sm:px-[34px] sm:pb-[34px] sm:pt-[14px]">
        {/* Result list or filtered-to-zero state */}
        {colors.length > 0 && filtered.length === 0 ? (
          <FilteredEmpty
            colors={colors}
            total={results.length}
            onClear={handleClearFilter}
          />
        ) : (
          <>
            {/* The flip is a server round trip. Without this the list sits
                unchanged after the click and the control reads as dead. */}
            <ul
              aria-busy={pending || undefined}
              className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0 transition-opacity"
              style={{ opacity: pending ? 0.55 : 1 }}
            >
              {windowed.map((r, i) => (
                <li
                  key={r.slug}
                  tabIndex={wasWindowed ? -1 : undefined}
                  ref={
                    wasWindowed
                      ? (el) => {
                          itemRefs.current[i] = el;
                        }
                      : undefined
                  }
                  className={
                    wasWindowed
                      ? "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                      : undefined
                  }
                >
                  <RecCard
                    commander={r}
                    rank={rankBySlug.get(r.slug) ?? 0}
                    avail={avail}
                    counts={receiptCounts.get(r.oracleId) ?? NO_CLAIMS}
                    delta={deltaFor(r)}
                  />
                </li>
              ))}
              {remaining > 0 && (
                <li>
                  <RevealControl remaining={remaining} onReveal={handleReveal} />
                </li>
              )}
            </ul>
            {/* Mobile: clear the bottom tab bar so the control isn't half-covered. */}
            {remaining > 0 && <div className="h-[24px] sm:hidden" />}
            {remaining === 0 && wasWindowed && (
              <EndOfRanking total={filtered.length} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
