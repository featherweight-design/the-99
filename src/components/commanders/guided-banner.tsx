// Guided First-Run Banner (§Guided First-Run Banner).
// Desktop: gradient card with XCIX ring seal, step label, 3-diamond progress crumb, heading, body.
// Mobile: ribbon style (left accent border) with step label + crumb, heading, body.
// Shown when firstRun===true, above the list.
//
// Richness pass (Surfaces v2 §Commanders): "a mark joins the XCIX crumb row,
// copy: '1,418 cards read. 24 can lead. I ranked them — you're welcome.'"
// That quotation is the SPEC's, kept as written. The shipped line takes a
// period where the spec has the dash — rule 4 applies to this project as of
// 2026-09-13, and the spec has not been reissued.
// The mark itself was retired by the theme handoff (decision 8) — the banner's
// 3px accent left border is the whole of its identity now.
// That line *replaces* the v1 body copy rather than joining it — the v1 body
// said the same thing in a straight register ("N cards → M legal commanders"),
// and shipping both would put two strings with identical content on one surface.

import { commandersCopy } from "../../lib/copy/commanders";

type GuidedBannerProps = {
  uniqueCardsRead: number;
  candidateCount: number;
};

export function GuidedBanner({ uniqueCardsRead, candidateCount }: GuidedBannerProps) {
  return (
    <>
      {/* ── Mobile ribbon style ── */}
      <div
        className="sm:hidden rounded-[10px] p-[12px_14px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        {/* Step label + progress crumb row */}
        <div className="flex items-center justify-between">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--accent)" }}
          >
            {commandersCopy.guidedBanner.step}
          </span>

          {/* Progress diamonds */}
          <div className="flex items-center gap-[5px] ml-auto">
            {/* Step 1 — done */}
            <span
              className="block"
              style={{ width: 6, height: 6, background: "var(--success)", transform: "rotate(45deg)" }}
            />
            {/* Step 2 — active */}
            <span
              className="block"
              style={{ width: 8, height: 8, background: "var(--accent)", transform: "rotate(45deg)" }}
            />
            {/* Step 3 — locked */}
            <span
              className="block"
              style={{ width: 6, height: 6, background: "var(--border-strong)", transform: "rotate(45deg)" }}
            />
          </div>
        </div>

        {/* Heading */}
        <h2
          className="font-display m-0"
          style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", marginTop: 7 }}
        >
          {commandersCopy.guidedBanner.reviewTitle}
        </h2>

        {/* Body. No mark of any kind: this is an inline directive banner, not
            an empty state, and its mark is the 3px accent left border it
            already carries. */}
        <div style={{ marginTop: 3 }}>
          <p className="m-0" style={{ fontSize: 12.5, color: "var(--fg-body)", lineHeight: 1.5 }}>
            {commandersCopy.firstRun.line(uniqueCardsRead, candidateCount)}{" "}
            {commandersCopy.firstRun.directive}
          </p>
        </div>
      </div>

      {/* ── Desktop banner ── */}
      <div
        className="hidden sm:flex items-center gap-[26px] rounded-[14px] p-[22px_26px]"
        style={{
          margin: "28px 34px 0",
          background: "linear-gradient(120deg, var(--surface-raised), var(--surface-rail) 60%)",
          border: "1px solid var(--border-strong)",
        }}
      >
        {/* XCIX ring seal */}
        <div
          className="flex-none flex items-center justify-center rounded-full"
          style={{
            width: 52,
            height: 52,
            border: "2px solid var(--accent)",
          }}
        >
          <span
            className="font-display font-[700]"
            style={{ fontSize: 13, color: "var(--accent)", letterSpacing: "0.06em" }}
          >
            XCIX
          </span>
        </div>

        {/* Content block */}
        <div className="flex-1 min-w-0">
          {/* Step label + progress crumb row */}
          <div className="flex items-center gap-[16px]">
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--accent)" }}
            >
              {commandersCopy.guidedBanner.setupCrumb}
            </span>

            {/* Progress diamonds */}
            <div className="flex items-center gap-[6px]">
              {/* Step 1 — done */}
              <span
                className="block"
                style={{ width: 7, height: 7, background: "var(--success)", transform: "rotate(45deg)" }}
              />
              {/* Step 2 — active */}
              <span
                className="block"
                style={{ width: 9, height: 9, background: "var(--accent)", transform: "rotate(45deg)" }}
              />
              {/* Step 3 — locked */}
              <span
                className="block"
                style={{ width: 7, height: 7, background: "var(--border-strong)", transform: "rotate(45deg)" }}
              />
            </div>
          </div>

          {/* Heading */}
          <h2
            className="font-display m-0"
            style={{ fontSize: 23, fontWeight: 700, color: "var(--fg)", marginTop: 6 }}
          >
            {commandersCopy.guidedBanner.meetTitle}
          </h2>

          {/* Body */}
          <p
            className="m-0"
            style={{
              fontSize: 14,
              color: "var(--fg-body)",
              lineHeight: 1.55,
              marginTop: 4,
              maxWidth: 640,
            }}
          >
            {commandersCopy.firstRun.line(uniqueCardsRead, candidateCount)}{" "}
            {commandersCopy.firstRun.directive}
          </p>
        </div>
      </div>
    </>
  );
}
