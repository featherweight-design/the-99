"use client";

import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { filterByColors } from "../../lib/commanders/filter";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { RecCard } from "./rec-card";
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

function parseColors(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.toUpperCase().split("").filter((c) => "WUBRG".includes(c)))];
}

function serializeParams(colors: string[]): string {
  const p = new URLSearchParams();
  if (colors.length > 0) p.set("c", colors.join(""));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Color pip background colors per table §Color pip (inactive) ───────────────

const PIP_BG: Record<string, string> = {
  W: "#E8E4D6",
  U: "#4A7FB5",
  B: "#5B5566",
  R: "#C05A48",
  G: "#6B9E63",
};

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
};

export function CommandersView({
  results,
  degraded,
  uniqueCardsRead,
  candidateCount,
  firstRun,
}: CommandersViewProps) {
  const router = useRouter();
  const search = useSearchParams();

  const [colors, setColors] = useState<string[]>(() =>
    parseColors(search.get("c")),
  );

  // Mirror color filter to URL via shallow replace (no RSC refetch).
  useEffect(() => {
    const qs = serializeParams(colors);
    router.replace(`/commanders${qs}`, { scroll: false });
  }, [colors, router]);

  const filtered = useMemo(() => filterByColors(results, colors), [results, colors]);

  // Global rank in the fixed Fit ordering — filtering hides cards but must not
  // renumber the ones still shown.
  const rankBySlug = useMemo(
    () => new Map(results.map((r, i) => [r.slug, i + 1])),
    [results],
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
    setAnnouncement(
      `${shown} shown, ${filtered.length - shown} more below. Ranks ${before + 1} to ${shown} added.`,
    );
    // preventScroll: revealing must not move the reader's place. The brass ring
    // is the cue that keyboard position advanced, not a jump down the page.
    itemRefs.current[before]?.focus({ preventScroll: true });
  }, [shown, filtered.length]);

  return (
    <div>
      {/* Present before the first reveal — a live region inserted at announce
          time is frequently not read. A list too short to window can never
          announce, so it renders the pre-windowing surface untouched. */}
      {wasWindowed && (
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      )}

      {/* ── Global degraded banner (above everything) ── */}
      {degraded && (
        <div className="px-[14px] pt-[12px] sm:px-0 sm:pt-0">
          <DegradedBanner />
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
          background: "#14110E",
          padding: "18px 34px 14px",
          borderBottom: "1px solid #2A241D",
          zIndex: 2,
        }}
      >
        {/* Filter row: pip wrapper + chips + Includes + Order + count */}
        <div className="flex items-center gap-[12px] flex-wrap">
          {/* Pip row wrapper (§Filter pip row wrapper) */}
          <div
            className="flex items-center gap-[8px]"
            style={{
              background: "#181410",
              border: "1px solid #3A3229",
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
                color: "#8E8269",
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
                    background: PIP_BG[c],
                    opacity: active ? 1 : 0.35,
                    boxShadow: active ? "0 0 0 2px #C9A24B" : "none",
                  }}
                />
              );
            })}
          </div>

          {/* Active filter chips (desktop, §Active-filter chip desktop) */}
          {colors.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-[7px]"
              style={{
                fontSize: 12.5,
                color: "#EDE6D8",
                background: "#2A241D",
                border: "1px solid #3A3229",
                borderRadius: 999,
                padding: "5px 8px 5px 11px",
              }}
            >
              {/* Color dot */}
              <span
                className="block rounded-full shrink-0"
                style={{ width: 9, height: 9, background: PIP_BG[c] ?? WUBRG_HEX[c] }}
              />
              {COLOR_LABELS[c]}
              {/* Dismiss ✕ */}
              <button
                type="button"
                aria-label={`Remove ${COLOR_LABELS[c]} filter`}
                onClick={() => toggleColor(c)}
                className="cursor-pointer bg-transparent border-0 p-0 leading-none"
                style={{ color: "#8E8269" }}
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
              className="bg-transparent border-0 p-0 cursor-pointer font-mono"
              style={{ fontSize: 12, color: "#C9A24B" }}
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
            style={{ fontSize: 11, color: "#8E8269", marginLeft: wasWindowed ? undefined : "auto" }}
          >
            Order: Fit ↓ · fixed
          </span>

          {/* "Showing N of 24" count — right-aligned amber label */}
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "#8E8269" }}
          >
            Showing {filtered.length} of {results.length}
          </span>
        </div>
      </div>

      {/* ── Mobile filter strip ── */}
      <div className="sm:hidden px-[14px] pt-[12px] pb-[4px]">
        {/* Mobile pip row wrapper */}
        <div
          className="inline-flex items-center gap-[8px]"
          style={{
            background: "#181410",
            border: "1px solid #3A3229",
            borderRadius: 8,
            padding: "8px 11px",
          }}
        >
          {/* "COLORS" label */}
          <span
            className="font-mono"
            style={{ fontSize: 10, letterSpacing: "0.1em", color: "#8E8269" }}
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
                  background: PIP_BG[c],
                  opacity: active ? 1 : 0.35,
                  boxShadow: active ? "0 0 0 2px #C9A24B" : "none",
                }}
              />
            );
          })}

          {/* Showing count (mobile inline, within pip row wrapper area) */}
          <span
            className="font-mono"
            style={{ fontSize: 10.5, color: "#8E8269", marginLeft: "auto" }}
          >
            {filtered.length}/{results.length}
          </span>
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
                  color: "#EDE6D8",
                  background: "#2A241D",
                  border: "1px solid #3A3229",
                  borderRadius: 999,
                  padding: "4px 8px 4px 10px",
                }}
              >
                <span
                  className="block rounded-full shrink-0"
                  style={{ width: 9, height: 9, background: PIP_BG[c] ?? WUBRG_HEX[c] }}
                />
                {COLOR_LABELS[c]}
                <button
                  type="button"
                  aria-label={`Remove ${COLOR_LABELS[c]} filter`}
                  onClick={() => toggleColor(c)}
                  className="cursor-pointer bg-transparent border-0 p-0 leading-none"
                  style={{ color: "#8E8269" }}
                >
                  ✕
                </button>
              </span>
            ))}
            {/* Clear link (mobile) */}
            <button
              type="button"
              onClick={handleClearFilter}
              className="bg-transparent border-0 p-0 cursor-pointer font-mono"
              style={{ fontSize: 11.5, color: "#C9A24B" }}
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
                      ? "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brass)]"
                      : undefined
                  }
                >
                  <RecCard commander={r} rank={rankBySlug.get(r.slug) ?? 0} />
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
