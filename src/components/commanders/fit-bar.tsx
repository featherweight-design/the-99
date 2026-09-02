// Fit Bar — 3-segment accent ramp (§Fit Bar, §Fit Bar — Degraded).
// Segments: Pool (#6E5B33 = --accent-dim), Roles (#A9863E = --accent-mid),
// Synergy (#C9A24B = --accent). Degraded: 2 segments (Pool + Roles, no Synergy).
// Legend dots below bar (desktop only, when legend=true).

import type { FitSegmentsResult } from "../../lib/recs/format";

const SEGMENT_COLORS: Record<"pool" | "roles" | "synergy", string> = {
  pool:    "#6E5B33",
  roles:   "#A9863E",
  synergy: "#C9A24B",
};

const SEGMENT_LABELS: Record<"pool" | "roles" | "synergy", string> = {
  pool:    "Pool",
  roles:   "Roles",
  synergy: "Synergy",
};

type FitBarProps = {
  /** From fitSegments() */
  fit: FitSegmentsResult;
  /** Show legend dots + labels below (desktop list card only) */
  legend?: boolean;
};

export function FitBar({ fit, legend = false }: FitBarProps) {
  const hasSynergy = fit.segments.some((s) => s.key === "synergy");

  return (
    <div>
      {/* Track — mobile 6px / desktop 8px height */}
      <div
        className="overflow-hidden flex rounded-full h-[6px] sm:h-[8px]"
        style={{ background: "#2A241D" }}
      >
        {/* Filled region — dynamic width = pct% of track */}
        <div
          className="flex h-full"
          style={{ width: `${fit.pct}%` }}
        >
          {fit.segments.map((seg) => (
            <div
              key={seg.key}
              className="h-full"
              style={{
                flexGrow: seg.grow,
                background: SEGMENT_COLORS[seg.key],
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend dots — desktop only */}
      {legend && (
        <div className="hidden sm:flex gap-3 mt-[6px]">
          {fit.segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-[5px]">
              {/* Dot: 7px×7px, border-radius 2px */}
              <span
                className="block shrink-0"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: SEGMENT_COLORS[seg.key],
                }}
              />
              <span
                className="font-mono"
                style={{ fontSize: "9.5px", color: "#8E8269" }}
              >
                {SEGMENT_LABELS[seg.key]}
              </span>
            </div>
          ))}
          {/* Synergy — placeholder in legend when degraded */}
          {!hasSynergy && (
            <div className="flex items-center gap-[5px]">
              <span
                className="block shrink-0"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: "#3A3229",
                }}
              />
              <span
                className="font-mono"
                style={{ fontSize: "9.5px", color: "#5E5647" }}
              >
                Synergy —
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
