"use client";
// Page Header — /commanders list (§Page Header — /commanders list).
// Mobile: padding 20px 18px 12px, border-bottom 1px solid #2A241D.
// #35 dropped this header's own account avatar: the shell's MobileHeader renders
// on every signed-in route, so below sm the page showed two account triggers.
// Desktop: padding 28px 34px 0, no border-bottom.
// Title: Cinzel 700, 22px mobile / 30px desktop, #EDE6D8.
// Subtitle: IBM Plex Mono, 11px mobile / 12px desktop, #8E8269, margin-top 2/4px.
// Row 7.5 appends the ranking clause to the shipped `N cards scanned` line. The
// canvas draws a commander count there instead ("24 generals · ranked by fit");
// changing that leading noun is a separate question from the availability ask.

import { availabilityCopy } from "../../lib/copy/availability";

type PageHeaderProps = {
  uniqueCardsRead: number;
  /** Omitted where nothing is ranked, which drops the clause entirely. */
  avail?: "all" | "free";
};

export function PageHeader({ uniqueCardsRead, avail }: PageHeaderProps) {
  const scanned = `${uniqueCardsRead.toLocaleString("en-US")} cards scanned`;
  const subtitle = avail
    ? `${scanned} · ${
        avail === "free"
          ? availabilityCopy.ranking.subtitleFree
          : availabilityCopy.ranking.subtitleAll
      }`
    : scanned;

  return (
    <>
      {/* ── Mobile header ── */}
      <div
        className="sm:hidden flex items-center justify-between"
        style={{
          padding: "20px 18px 12px",
          borderBottom: "1px solid #2A241D",
        }}
      >
        <div>
          {/* Title */}
          <h1
            className="font-display font-bold m-0"
            style={{ fontSize: 22, color: "#EDE6D8" }}
          >
            Commanders
          </h1>
          {/* Subtitle */}
          <p
            className="font-mono m-0"
            style={{
              fontSize: 11,
              color: "#8E8269",
              marginTop: 2,
            }}
          >
            {subtitle}
          </p>
        </div>

      </div>

      {/* ── Desktop header ── */}
      <div
        className="hidden sm:flex items-end justify-between"
        style={{ padding: "28px 34px 0" }}
      >
        <div>
          {/* Title */}
          <h1
            className="font-display font-bold m-0"
            style={{ fontSize: 30, color: "#EDE6D8" }}
          >
            Commanders
          </h1>
          {/* Subtitle */}
          <p
            className="font-mono m-0"
            style={{
              fontSize: 12,
              color: "#8E8269",
              marginTop: 4,
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </>
  );
}
