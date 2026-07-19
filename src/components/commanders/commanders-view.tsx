"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RankedCommander } from "../../lib/recs/recommend";
import { filterByColors } from "../../lib/commanders/filter";
import { retryRecs } from "../../app/commanders/actions";

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

  return (
    <div className="p-5 md:px-[34px] md:pt-[34px] md:pb-11">
      {/* ── Degraded banner ── */}
      {degraded && (
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-4 py-3 text-[13px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg-body)",
          }}
        >
          <span>Synergy data is partially offline — some scores are estimates.</span>
          <form action={retryRecs}>
            <button
              type="submit"
              className="ml-4 rounded px-3 py-1 text-[12px] font-semibold"
              style={{
                background: "transparent",
                border: "1px solid var(--border-strong)",
                color: "var(--fg)",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </form>
        </div>
      )}

      {/* ── First-run prompt ── */}
      {firstRun && (
        <p
          className="mb-4 text-[13px]"
          style={{ color: "var(--fg-body)" }}
        >
          Pick a commander and build your first deck.
        </p>
      )}

      {/* ── Color filter chips ── */}
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
            onClick={() => setColors([])}
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

      {/* ── Stats line ── */}
      <p
        className="mb-4 font-mono text-[11px] md:text-[12px]"
        style={{ color: "var(--fg-faint)" }}
      >
        {uniqueCardsRead.toLocaleString()} cards scanned · {candidateCount} eligible commander
        {candidateCount === 1 ? "" : "s"}
        {colors.length > 0 &&
          ` · ${filtered.length} matching`}
      </p>

      {/* ── Result list (placeholder rendering: name + score) ── */}
      {filtered.length === 0 ? (
        <p
          className="text-[14px]"
          style={{ color: "var(--fg-muted)" }}
        >
          No commanders match the selected colors.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li
              key={r.slug}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <span
                className="font-semibold text-[15px]"
                style={{ color: "var(--fg)" }}
              >
                {r.name}
              </span>
              <span
                className="font-mono text-[13px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {r.score}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
