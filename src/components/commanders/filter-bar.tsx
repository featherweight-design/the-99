"use client";
// The colour filter, the `Score against` control and the window counts, lifted
// out of `CommandersView` so the discovery scope renders the same bar rather
// than a second one that drifts from it. The handoff's must-nots forbid a new
// component here; this is the shipped bar relocated, not a redesign.
//
// The `order` slot is the one thing the two scopes disagree about: the owned
// scope keeps its inert `Order: Fit ↓ · fixed` label, and discovery puts a sort
// menu there. It is a node rather than a flag because the two have no shared
// shape — one is a span, the other a trigger that opens a menu.

import { useRef, type ReactNode } from "react";
import { availabilityCopy } from "../../lib/copy/availability";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { WindowCount } from "./reveal-control";

type AvailMode = "all" | "free";

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
              "flex items-center justify-center rounded-md border-0",
              size === "mobile" ? "flex-1 px-[10px]" : "px-[13px]",
              off ? "cursor-not-allowed" : "cursor-pointer",
              active
                ? "font-semibold text-[color:var(--bg)] bg-[color:var(--accent)]"
                : `font-medium bg-transparent ${off ? "text-[color:var(--fg-locked)]" : "text-[color:var(--fg-body)]"}`,
            ].join(" ")}
            style={{
              height,
              fontSize,
              whiteSpace: "nowrap",
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

const WUBRG = ["W", "U", "B", "R", "G"] as const;

export type FilterBarProps = {
  colors: string[];
  onToggleColor: (c: string) => void;
  onClearColors: () => void;
  avail: "all" | "free";
  onAvailChange: (v: "all" | "free") => void;
  availOk: boolean;
  /** True once the list has ever been long enough to window. The counts are
      omitted entirely below that, so a short list stays byte-identical to what
      shipped before windowing existed. */
  wasWindowed: boolean;
  shown: number;
  filteredTotal: number;
  activeTotal: number;
  /** Rendered twice at different sizes, so each breakpoint gets its own node.
      A null `mobile` drops the row it would sit in, which is how the owned scope
      keeps its phone layout unchanged below the window threshold. */
  order: { desktop: ReactNode; mobile: ReactNode };
};

export function FilterBar({
  colors,
  onToggleColor,
  onClearColors,
  avail,
  onAvailChange,
  availOk,
  wasWindowed,
  shown,
  filteredTotal,
  activeTotal,
  order,
}: FilterBarProps) {
  return (
    <>
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
            {WUBRG.map((c) => {
              const active = colors.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Filter by ${COLOR_LABELS[c]}`}
                  onClick={() => onToggleColor(c)}
                  className="block rounded-full cursor-pointer border-0 p-0 transition-opacity"
                  style={{
                    width: 16,
                    height: 16,
                    // eslint-disable-next-line no-restricted-syntax -- the fill is the mana colour itself, looked up per render; no class can name it
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
              value={avail}
              onChange={onAvailChange}
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
                onClick={() => onToggleColor(c)}
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
              onClick={onClearColors}
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
              filteredTotal={filteredTotal}
              className="font-mono text-[11px] tracking-[0.12em] uppercase ml-auto"
            />
          )}

          {/* Order slot (desktop, §Order label) */}
          <span style={{ marginLeft: wasWindowed ? undefined : "auto" }}>
            {order.desktop}
          </span>

          {/* "Showing N of 24" count — right-aligned amber label */}
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--fg-faint)" }}
          >
            Showing {filteredTotal} of {activeTotal}
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
          {WUBRG.map((c) => {
            const active = colors.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                aria-label={`Filter by ${COLOR_LABELS[c]}`}
                onClick={() => onToggleColor(c)}
                className="block rounded-full cursor-pointer border-0 p-0 transition-opacity"
                style={{
                  width: 14,
                  height: 14,
                  // eslint-disable-next-line no-restricted-syntax -- the fill is the mana colour itself, looked up per render; no class can name it
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
            {filteredTotal}/{activeTotal}
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
            value={avail}
            onChange={onAvailChange}
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

        {/* Window count and order slot (§Header window count, mobile) — one row
            under the colour filter. The count is omitted below the window
            threshold; the order slot is not, because a control the player cannot
            reach until the list grows is a control they do not have. A caller
            with nothing to put there passes null and the row disappears. */}
        {(wasWindowed || order.mobile) && (
          <div
            className={[
              "flex items-center mt-[9px]",
              wasWindowed ? "justify-between" : "justify-end",
            ].join(" ")}
          >
            {wasWindowed && (
              <WindowCount
                shown={shown}
                filteredTotal={filteredTotal}
                className="font-mono text-[10.5px]"
              />
            )}
            {order.mobile}
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
                  onClick={() => onToggleColor(c)}
                  className="cursor-pointer bg-transparent border-0 p-0 leading-none text-[color:var(--fg-faint)]"
                >
                  ✕
                </button>
              </span>
            ))}
            {/* Clear link (mobile) */}
            <button
              type="button"
              onClick={onClearColors}
              className="bg-transparent border-0 p-0 cursor-pointer font-mono text-[color:var(--accent)]"
              style={{ fontSize: 11.5 }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </>
  );
}
