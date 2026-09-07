"use client";

// The Fit Hero's legend and the key that explains it (#342, §5.1).
//
// The legend and the key are one component because the desktop trigger sits inside the legend
// row (margin-left:auto) while the panel sits below it, and both read the same open boolean.
// Two instances render at once — one per width — and each holds its own state.

import { useId, useState } from "react";
import { explainedCopy } from "../../lib/copy/commander-explained";

export type FitSegmentKey = "pool" | "roles" | "synergy";

export type FitLegendSegment = {
  key: FitSegmentKey;
  points: number;
  weight: number;
};

const SEGMENT_COLORS: Record<FitSegmentKey, string> = {
  pool: "var(--accent-dim)",
  roles: "var(--accent-mid)",
  synergy: "var(--accent)",
};

type FitLegendProps = {
  segments: FitLegendSegment[];
  score: number;
  width: "desktop" | "phone";
};

export function FitLegend({ segments, score, width }: FitLegendProps) {
  const isPhone = width === "phone";
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const trigger = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? undefined : explainedCopy.key.openAria}
      onClick={() => setOpen((v) => !v)}
      className={[
        "font-mono border border-dashed border-[color:var(--border-strong)]",
        open
          ? "bg-[var(--elevated-hover)] text-[var(--fg-faint)]"
          : "bg-transparent text-[var(--accent)]",
        isPhone
          ? "flex w-full items-center justify-center rounded-[8px]"
          : "inline-flex items-center rounded-full",
      ].join(" ")}
      style={
        isPhone
          ? { minHeight: 44, marginTop: 12, fontSize: 12 }
          : { height: 28, padding: "0 12px", marginLeft: "auto", fontSize: 11 }
      }
    >
      {open ? explainedCopy.key.close : explainedCopy.key.open}
    </button>
  );

  return (
    <>
      <div
        className="flex flex-wrap items-center"
        style={{ gap: 24, marginTop: 12 }}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center"
            style={{ gap: isPhone ? 5 : 6 }}
          >
            <span
              aria-hidden
              className="block shrink-0"
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: SEGMENT_COLORS[seg.key],
              }}
            />
            <span
              className="font-sans"
              style={{ fontSize: 13, color: "var(--fg-body)" }}
            >
              {explainedCopy.legend[seg.key]}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 12, color: "var(--fg)" }}
              aria-label={explainedCopy.legend.segmentAria(
                explainedCopy.legend[seg.key],
                seg.points,
                seg.weight,
              )}
            >
              {seg.points}
              <span aria-hidden style={{ color: "var(--fg-faint)" }}>
                /{seg.weight}
              </span>
            </span>
          </div>
        ))}
        {!isPhone && trigger}
      </div>

      {isPhone && trigger}

      {open && (
        <div
          id={panelId}
          className={isPhone ? "flex flex-col" : "grid"}
          style={
            isPhone
              ? {
                  marginTop: 14,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                  gap: 14,
                }
              : {
                  marginTop: 14,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16,
                  gridTemplateColumns: `repeat(${segments.length}, 1fr)`,
                  gap: 18,
                }
          }
        >
          {segments.map((seg) => {
            const def = explainedCopy.key[seg.key];
            return (
              <div key={seg.key}>
                <div
                  className="flex items-center"
                  style={{ gap: 7, marginBottom: 7 }}
                >
                  <span
                    aria-hidden
                    className="block shrink-0"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: SEGMENT_COLORS[seg.key],
                    }}
                  />
                  <span
                    className="font-sans font-[600]"
                    style={{ fontSize: 13.5, color: "var(--fg)" }}
                  >
                    {def.label}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10.5,
                      color: "var(--fg-faint)",
                      marginLeft: "auto",
                    }}
                  >
                    {def.weight(seg.weight)}
                  </span>
                </div>
                <p
                  className="m-0"
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: "var(--fg-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {isPhone ? def.bodyMobile : def.body}
                </p>
              </div>
            );
          })}
          <p
            className={`font-mono m-0 ${isPhone ? "" : "col-span-full"}`}
            style={{
              marginTop: isPhone ? 0 : 14,
              fontSize: isPhone ? 10.5 : 11,
              color: "var(--fg-faint)",
              lineHeight: 1.5,
            }}
          >
            {isPhone
              ? explainedCopy.key.sum(
                  segments.map((s) => s.points),
                  score,
                )
              : explainedCopy.key.sumWithGloss(
                  segments.map((s) => s.points),
                  score,
                )}
          </p>
        </div>
      )}
    </>
  );
}
