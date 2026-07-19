"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RankedCommander } from "../../lib/recs/recommend";
import { filterByColors } from "../../lib/commanders/filter";
import { RecCard } from "./rec-card";
import { GuidedBanner } from "./guided-banner";
import { DegradedBanner } from "./degraded-banner";
import { FilteredEmpty } from "./filtered-empty";

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

// ── Component ─────────────────────────────────────────────────────────────────

export type CommandersViewProps = {
  results: RankedCommander[];
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

  // Clear handler passed to FilteredEmpty
  const handleClearFilter = useCallback(() => setColors([]), []);

  return (
    <div>
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

      {/* ── Main content: filter + list (or filtered-empty) ── */}
      <div className="p-[12px_14px] sm:px-[34px] sm:pb-[34px] sm:pt-[14px]">
        {/* Color filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(["W", "U", "B", "R", "G"] as const).map((c) => {
            const active = colors.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setColors((prev) =>
                    active ? prev.filter((x) => x !== c) : [...prev, c],
                  )
                }
                // brand focus-visible outline treatment inherited from globals.css
                className="rounded px-3 py-1 font-mono text-[12px] font-semibold transition-colors"
                style={{
                  background: active ? "var(--brass)" : "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  color: active ? "var(--bg)" : "var(--fg)",
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            );
          })}
          {colors.length > 0 && (
            <button
              type="button"
              onClick={handleClearFilter}
              // brand focus-visible outline treatment inherited from globals.css
              className="rounded px-3 py-1 font-mono text-[12px] transition-colors"
              style={{
                background: "transparent",
                border: "1px solid var(--border-strong)",
                color: "var(--fg-faint)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats line */}
        <p
          className="mb-4 font-mono text-[11px] md:text-[12px]"
          style={{ color: "var(--fg-faint)" }}
        >
          {uniqueCardsRead.toLocaleString("en-US")} cards scanned · {candidateCount} eligible
          commander{candidateCount === 1 ? "" : "s"}
          {colors.length > 0 && ` · ${filtered.length} matching`}
        </p>

        {/* Result list or filtered-to-zero state */}
        {colors.length > 0 && filtered.length === 0 ? (
          <FilteredEmpty
            colors={colors}
            total={results.length}
            onClear={handleClearFilter}
          />
        ) : (
          <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
            {filtered.map((r, i) => (
              <li key={r.slug}>
                <RecCard
                  commander={r}
                  rank={i + 1}
                  globalDegraded={degraded}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
