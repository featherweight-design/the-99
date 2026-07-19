// Recommendation Card (§Recommendation Card, §Fit Bar, §Role Chips, §Synergy Line,
// §Receipts Preview, §Per-Commander Degraded Note).
// Desktop: grid 40px 100px 1fr 236px (rank · art · evidence · fit).
// Mobile: stacked tile with Fit pinned top-right.
// Whole card links to /commanders/${slug}.

import Link from "next/link";
import { identityGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { fitSegments, receiptsPreview } from "../../lib/recs/format";
import { retryRecs } from "../../app/commanders/actions";
import { FitBar } from "./fit-bar";
import { RoleChips } from "./role-chips";
import type { RankedCommander } from "../../lib/recs/recommend";

type RecCardProps = {
  commander: RankedCommander;
  rank: number;
  /** Global degraded flag — when false and fitSynergy===null, show per-card note */
  globalDegraded: boolean;
};

export function RecCard({ commander: c, rank, globalDegraded }: RecCardProps) {
  const gradient = identityGradient(c.colorIdentity);
  const fit = fitSegments(c);
  const scoreDisplay = Math.round(fit.pct);

  // Per-commander degraded: EDHREC missing for this card only, not a global outage
  const perCmdDegraded = c.fitSynergy === null && !globalDegraded;

  // Receipts preview from overlapOwned
  const receipts = receiptsPreview(c.overlapOwned);

  // Synergy bar pct
  const synergyPct =
    c.edhrecOwnedCount !== null && c.edhrecTotal !== null && c.edhrecTotal > 0
      ? Math.round((c.edhrecOwnedCount / c.edhrecTotal) * 100)
      : 0;

  return (
    <Link
      href={`/commanders/${c.slug}`}
      // brand focus-visible outline treatment inherited from globals.css
      className="block group"
      style={{ textDecoration: "none" }}
    >
      {/* ── Mobile layout: stacked tile ── */}
      <div
        className="sm:hidden rounded-[11px] p-[12px_13px] flex flex-col gap-[9px] transition-colors group-hover:border-[#3A3229] group-hover:bg-[#211C15]"
        style={{
          background: "#1E1A15",
          border: "1px solid #2A241D",
        }}
      >
        {/* Mobile top row: art + name/info + fit score */}
        <div className="flex gap-[10px] items-start">
          {/* Art thumbnail — mobile 36×50px */}
          <div
            className="shrink-0 rounded-[6px]"
            style={{
              width: 36,
              height: 50,
              background: gradient,
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
            }}
          />

          {/* Name + type line */}
          <div className="flex-1 min-w-0">
            {/* Rank + name row */}
            <div className="flex items-center gap-[6px]">
              <span
                className="font-display font-[800] shrink-0"
                style={{ fontSize: 17, color: "#8E8269", width: 16, textAlign: "center" }}
              >
                {rank}
              </span>
              <span
                className="font-display font-[600] truncate"
                style={{ fontSize: 14.5, color: "#EDE6D8" }}
              >
                {c.name}
              </span>
            </div>
            {/* Pool line */}
            <p
              className="m-0 mt-[2px]"
              style={{ fontSize: 11, color: "#A89B84" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} in pool
            </p>
          </div>

          {/* Fit score pinned top-right */}
          <div className="flex flex-col items-center shrink-0">
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 20, color: "#EDE6D8", lineHeight: 1 }}
            >
              {scoreDisplay}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: "0.12em", color: "#8E8269" }}
            >
              FIT
            </span>
          </div>
        </div>

        {/* Fit bar (mobile) */}
        <FitBar fit={fit} />

        {/* Role chips */}
        <RoleChips roleCounts={c.roleCounts} />

        {/* Receipts / synergy short (mobile) */}
        {c.edhrecOwnedCount !== null && c.edhrecTotal !== null && (
          <p className="m-0 font-mono" style={{ fontSize: 10.5, color: "#8E8269" }}>
            own{" "}
            <strong style={{ fontWeight: 600, color: "#C6B79A" }}>
              {c.edhrecOwnedCount}
            </strong>{" "}
            of top {c.edhrecTotal}
          </p>
        )}

        {/* Per-commander degraded note (mobile) */}
        {perCmdDegraded && (
          <div
            className="flex items-center gap-[8px] rounded-[7px]"
            style={{
              background: "#211C15",
              border: "1px solid #3A3229",
              borderLeft: "2px solid #8E8269",
              padding: "7px 11px",
            }}
          >
            <span style={{ color: "#8E8269", fontSize: 12 }}>⚠</span>
            <span style={{ fontSize: 12, color: "#A89B84" }}>
              Synergy data unavailable.{" "}
              <form action={retryRecs} className="inline">
                <button
                  type="submit"
                  // brand focus-visible outline treatment inherited from globals.css
                  className="underline cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
                  style={{ color: "#C9A24B", fontSize: 12 }}
                >
                  Retry
                </button>
              </form>
            </span>
          </div>
        )}
      </div>

      {/* ── Desktop layout: grid 40px 100px 1fr 236px ── */}
      <div
        className="hidden sm:grid rounded-[12px] p-[18px_20px] transition-colors group-hover:border-[#3A3229] group-hover:bg-[#211C15]"
        style={{
          gridTemplateColumns: "40px 100px 1fr 236px",
          gap: 20,
          alignItems: "stretch",
          background: "#1E1A15",
          border: "1px solid #2A241D",
        }}
      >
        {/* Rank column */}
        <div className="flex flex-col items-center justify-center gap-[7px]">
          <span
            className="font-display font-[800]"
            style={{ fontSize: 26, color: "#8E8269", lineHeight: 1 }}
          >
            {rank}
          </span>
          {/* Diamond pip below numeral */}
          <span
            className="block"
            style={{
              width: 6,
              height: 6,
              background: "#3A3229",
              transform: "rotate(45deg)",
            }}
          />
        </div>

        {/* Art thumbnail — desktop aspect 63/88 */}
        <div
          className="rounded-[8px] relative"
          style={{
            aspectRatio: "63/88",
            background: gradient,
            boxShadow:
              "inset 0 -30px 34px -26px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.28)",
          }}
        >
          {/* WUBRG identity pips — absolute bottom */}
          {c.colorIdentity.length > 0 && (
            <div
              className="absolute flex gap-[3px]"
              style={{ left: 6, right: 6, bottom: 6 }}
            >
              {c.colorIdentity.map((color) => (
                <span
                  key={color}
                  className="block rounded-full shrink-0"
                  style={{
                    width: 11,
                    height: 11,
                    background: WUBRG_HEX[color] ?? "#8E8269",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Evidence column */}
        <div className="flex flex-col gap-[9px]" style={{ minWidth: 0 }}>
          {/* Commander name */}
          <h3
            className="font-display font-[600] m-0"
            style={{ fontSize: 20, color: "#EDE6D8", lineHeight: 1.1 }}
          >
            {c.name}
          </h3>

          {/* Pool line */}
          <p
            className="m-0"
            style={{ fontSize: 12.5, color: "#A89B84", marginTop: 2 }}
          >
            {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} in identity pool
          </p>

          {/* Role chips */}
          <RoleChips roleCounts={c.roleCounts} />

          {/* Synergy line (desktop, when synergy available) */}
          {c.edhrecOwnedCount !== null && c.edhrecTotal !== null && (
            <div className="flex items-center gap-[10px]">
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8E8269",
                }}
              >
                Synergy
              </span>
              {/* Overlap bar track */}
              <div
                className="overflow-hidden rounded-full"
                style={{ width: 120, height: 6, background: "#2A241D" }}
              >
                <div
                  className="h-full"
                  style={{ width: `${synergyPct}%`, background: "#C9A24B" }}
                />
              </div>
              {/* "own N of top M" text */}
              <span className="font-mono" style={{ fontSize: 12, color: "#C6B79A" }}>
                own{" "}
                <strong style={{ fontWeight: 600, color: "#EDE6D8" }}>
                  {c.edhrecOwnedCount}
                </strong>{" "}
                of top {c.edhrecTotal}
              </span>
            </div>
          )}

          {/* Receipts preview (desktop) */}
          {receipts && (
            <p
              className="m-0 font-mono overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ fontSize: 11, color: "#6E6353", lineHeight: 1.4 }}
            >
              <span style={{ color: "#8E8269" }}>receipts:</span>{" "}
              {receipts}
            </p>
          )}

          {/* Per-commander degraded note (desktop) */}
          {perCmdDegraded && (
            <div
              className="flex items-center gap-[9px] rounded-[7px]"
              style={{
                background: "#211C15",
                border: "1px solid #3A3229",
                borderLeft: "2px solid #8E8269",
                padding: "9px 13px",
              }}
            >
              <span style={{ color: "#8E8269", fontSize: 13 }}>⚠</span>
              <span style={{ fontSize: 12.5, color: "#A89B84", lineHeight: 1.45 }}>
                <strong style={{ color: "#C6B79A", fontWeight: 600 }}>
                  Synergy data unavailable
                </strong>{" "}
                for this commander.{" "}
                <form action={retryRecs} className="inline">
                  <button
                    type="submit"
                    // brand focus-visible outline treatment inherited from globals.css
                    className="underline cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
                    style={{ color: "#C9A24B", fontSize: 12.5 }}
                  >
                    Retry
                  </button>
                </form>
              </span>
            </div>
          )}
        </div>

        {/* Fit column */}
        <div
          className="flex flex-col justify-center gap-[10px]"
          style={{ borderLeft: "1px solid #2A241D", paddingLeft: 20 }}
        >
          {/* Score + /100 + Fit label row */}
          <div className="flex items-baseline gap-[6px]">
            <span
              className="font-mono font-[600]"
              style={{ fontSize: 34, color: "#EDE6D8", lineHeight: 1 }}
            >
              {scoreDisplay}
            </span>
            <span className="font-mono" style={{ fontSize: 13, color: "#8E8269" }}>
              /100
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#8E8269",
                marginLeft: 2,
              }}
            >
              Fit
            </span>
          </div>

          {/* Fit bar with legend */}
          <FitBar fit={fit} legend />
        </div>
      </div>
    </Link>
  );
}
