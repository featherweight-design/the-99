"use client";

import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { filterByColors, parseColors } from "../../lib/commanders/filter";
import { rankMap } from "../../lib/commanders/rank-maps";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import { availabilityCopy } from "../../lib/copy/availability";
import { RecCard, type ScoreDelta } from "./rec-card";
import { FilterBar } from "./filter-bar";
import { GuidedBanner } from "./guided-banner";
import { PageHeader } from "./page-header";
import { useScopeAnnouncement, useScopeNav } from "./list-nav";
import { DegradedBanner } from "./degraded-banner";
import { FilteredEmpty } from "./filtered-empty";
import { REVEAL_STEP, RevealControl, EndOfRanking } from "./reveal-control";

// ── URL helpers (mirrors collection/browser.tsx pattern) ─────────────────────

export type AvailMode = "all" | "free";

// A commander whose whole pool is free. Shared rather than allocated per row,
// and the fallback for the degraded read, where the page has no counts at all:
// zero claims renders the receipt's first clause alone, which stays true.
const NO_CLAIMS: ReceiptCounts = { inUse: 0, wantedByBrew: 0 };

function serializeParams(colors: string[], avail: AvailMode): string {
  const p = new URLSearchParams();
  if (colors.length > 0) p.set("c", colors.join(""));
  // Only the non-default is written, so a player who never touches the toggle
  // carries no mode at all. Writing it at all is the point: this runs on every
  // colour change too, and a narrower version would silently drop the mode on
  // the next pip click.
  if (avail === "all") p.set("avail", "all");
  const s = p.toString();
  return s ? `?${s}` : "";
}


// ── Component ─────────────────────────────────────────────────────────────────

export type CommandersViewProps = {
  results: CommanderListItem[];
  degraded: boolean;
  uniqueCardsRead: number;
  candidateCount: number;
  firstRun: boolean;
  /**
   * Which ranking to open on, parsed from `?avail=`. Only the initial mode: both
   * rankings arrive in the same render, so the toggle switches between two lists
   * already on the client and this component owns the mode from mount on.
   */
  avail: AvailMode;
  /** The same commanders re-scored against the free pool. Null when unreadable. */
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
  avail: initialAvail,
  freeItems,
  availOk,
  receiptCounts,
}: CommandersViewProps) {
  const search = useSearchParams();

  const [colors, setColors] = useState<string[]>(() =>
    parseColors(search.get("c")),
  );
  const [avail, setAvailState] = useState<AvailMode>(initialAvail);

  // Mirror both controls to the URL through the History API rather than
  // `router.replace`: a replace is a navigation, and this page's whole point is
  // that neither control needs one — the server sends both rankings in the same
  // render. The URL stays shareable and `useSearchParams` still sees it.
  useEffect(() => {
    // The live pathname, not a literal: this rewrites the query and must leave
    // the path exactly as it found it under a basePath or a route move.
    const path = window.location.pathname;
    window.history.replaceState(null, "", `${path}${serializeParams(colors, avail)}`);
  }, [colors, avail]);

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
  // Both rankings are already here, so the flip is a state change: no push, no
  // transition, no dimmed list waiting on a server that has nothing left to say.
  const setAvail = useCallback(
    (next: AvailMode) => {
      if (next === avail) return;
      if (next === "free" && !freeItems) return;
      // The window belongs to the current result set, not the session, and a
      // re-rank means different commanders occupy the revealed range.
      setShown(REVEAL_STEP);
      setAvailState(next);
    },
    [avail, freeItems],
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

  // A scope flip lands as a fresh mount, so its message arrives on arrival
  // rather than at click time — and it lands on this same region, which every
  // other announcement on this page already uses.
  const setScope = useScopeNav();
  useScopeAnnouncement("owned", active.length, "fit", setAnnouncement);

  return (
    <div>
      <PageHeader
        uniqueCardsRead={uniqueCardsRead}
        avail={avail}
        scope="owned"
        onScopeChange={setScope}
        candidateCount={active.length}
      />

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

      {/* The bar itself lives in `filter-bar.tsx`, shared with the discovery
          scope. The `Order` slot is the only part that differs between them:
          here it stays the inert label the owned ranking has always shown,
          because that ranking has exactly one order. */}
      <FilterBar
        colors={colors}
        onToggleColor={toggleColor}
        onClearColors={handleClearFilter}
        avail={avail}
        onAvailChange={setAvail}
        availOk={availOk}
        wasWindowed={wasWindowed}
        shown={shown}
        filteredTotal={filtered.length}
        activeTotal={active.length}
        order={{
          desktop: (
            <span
              className="font-mono"
              style={{ fontSize: 11, color: "var(--fg-faint)" }}
            >
              Order: Fit ↓ · fixed
            </span>
          ),
          // Null below the window threshold, where this label has never rendered
          // on a phone. It is a label rather than a control, so its absence
          // denies the player nothing.
          mobile: wasWindowed ? (
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
              Fit ↓ · fixed
            </span>
          ) : null,
        }}
      />


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
            <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
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
