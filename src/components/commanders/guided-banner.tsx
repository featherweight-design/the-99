// Guided First-Run Banner (§Guided First-Run Banner).
// Desktop: gradient card with XCIX ring seal, step label, 3-diamond progress crumb, heading, body.
// Mobile: ribbon style (left brass border) with step label + crumb, heading, body.
// Shown when firstRun===true, above the list.
//
// Richness pass (Surfaces v2 §Commanders): "crab joins the XCIX crumb row,
// copy: '1,418 cards read. 24 can lead. I ranked them — you're welcome.'"
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
          background: "#1E1A15",
          border: "1px solid #2A241D",
          borderLeft: "3px solid #C9A24B",
        }}
      >
        {/* Step label + progress crumb row */}
        <div className="flex items-center justify-between">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "#C9A24B" }}
          >
            Step 2 of 3
          </span>

          {/* Progress diamonds */}
          <div className="flex items-center gap-[5px] ml-auto">
            {/* Step 1 — done */}
            <span
              className="block"
              style={{ width: 6, height: 6, background: "#6FA368", transform: "rotate(45deg)" }}
            />
            {/* Step 2 — active */}
            <span
              className="block"
              style={{ width: 8, height: 8, background: "#C9A24B", transform: "rotate(45deg)" }}
            />
            {/* Step 3 — locked */}
            <span
              className="block"
              style={{ width: 6, height: 6, background: "#3A3229", transform: "rotate(45deg)" }}
            />
          </div>
        </div>

        {/* Heading */}
        <h2
          className="font-display m-0"
          style={{ fontSize: 15, fontWeight: 600, color: "#EDE6D8", marginTop: 7 }}
        >
          Review your commanders
        </h2>

        {/* Body. No mark of any kind: this is an inline directive banner, not
            an empty state, and its mark is the 3px accent left border it
            already carries. */}
        <div style={{ marginTop: 3 }}>
          <p className="m-0" style={{ fontSize: 12.5, color: "#C6B79A", lineHeight: 1.5 }}>
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
          background: "linear-gradient(120deg, #221D14, #1A160F 60%)",
          border: "1px solid #3A3229",
        }}
      >
        {/* XCIX ring seal */}
        <div
          className="flex-none flex items-center justify-center rounded-full"
          style={{
            width: 52,
            height: 52,
            border: "2px solid #C9A24B",
          }}
        >
          <span
            className="font-display font-[700]"
            style={{ fontSize: 13, color: "#C9A24B", letterSpacing: "0.06em" }}
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
              style={{ fontSize: 10, letterSpacing: "0.16em", color: "#C9A24B" }}
            >
              Guided setup · step 2 of 3
            </span>

            {/* Progress diamonds */}
            <div className="flex items-center gap-[6px]">
              {/* Step 1 — done */}
              <span
                className="block"
                style={{ width: 7, height: 7, background: "#6FA368", transform: "rotate(45deg)" }}
              />
              {/* Step 2 — active */}
              <span
                className="block"
                style={{ width: 9, height: 9, background: "#C9A24B", transform: "rotate(45deg)" }}
              />
              {/* Step 3 — locked */}
              <span
                className="block"
                style={{ width: 7, height: 7, background: "#3A3229", transform: "rotate(45deg)" }}
              />
            </div>
          </div>

          {/* Heading */}
          <h2
            className="font-display m-0"
            style={{ fontSize: 23, fontWeight: 700, color: "#EDE6D8", marginTop: 6 }}
          >
            Meet your commanders
          </h2>

          {/* Body */}
          <p
            className="m-0"
            style={{
              fontSize: 14,
              color: "#C6B79A",
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
