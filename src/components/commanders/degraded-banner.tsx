// Global Degraded Banner (§Global Degraded Banner).
// Amber left-border banner shown when degraded===true.
// Desktop: flex row with icon ring, text block, Retry button.
// Mobile: flex row (no ring), warning icon inline, text column, no separate button slot.
// Retry action: <form action={retryRecs}> secondary button.

import { retryRecs } from "../../app/commanders/actions";

export function DegradedBanner() {
  return (
    <>
      {/* ── Mobile ── */}
      <div
        className="sm:hidden flex gap-[10px] rounded-[10px] p-[11px_13px]"
        style={{
          background: "#211C15",
          border: "1px solid #3A3229",
          borderLeft: "3px solid #E0913C",
        }}
      >
        {/* Warning icon inline */}
        <span
          aria-hidden="true"
          style={{ color: "#E0913C", fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}
        >
          ⚠
        </span>

        <div className="flex-1 min-w-0">
          <p className="m-0" style={{ fontSize: 12.5, color: "#EDE6D8", fontWeight: 500 }}>
            Synergy data unavailable
          </p>
          <p
            className="m-0"
            style={{ fontSize: 11.5, color: "#A89B84", lineHeight: 1.5, marginTop: 2 }}
          >
            EDHREC is unreachable. Scores shown are based on pool and role coverage only.{" "}
            <form action={retryRecs} className="inline">
              <button
                type="submit"
                // brand focus-visible outline treatment inherited from globals.css
                className="underline cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
                style={{ color: "#C9A24B", fontSize: 11.5 }}
              >
                Retry
              </button>
            </form>
          </p>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div
        className="hidden sm:flex items-center gap-[16px] rounded-[12px] p-[16px_20px]"
        style={{
          margin: "20px 34px 0",
          background: "#211C15",
          border: "1px solid #3A3229",
          borderLeft: "3px solid #E0913C",
        }}
      >
        {/* Warning icon ring */}
        <div
          className="flex-none flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            background: "rgba(224,145,60,0.13)",
            border: "1px solid #4A3A24",
            color: "#E0913C",
            fontSize: 18,
          }}
          aria-hidden="true"
        >
          ⚠
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="m-0" style={{ fontSize: 15, color: "#EDE6D8", fontWeight: 600 }}>
            Synergy data unavailable
          </p>
          <p
            className="m-0"
            style={{ fontSize: 13, color: "#C6B79A", lineHeight: 1.55, marginTop: 3 }}
          >
            EDHREC is unreachable. Fit scores reflect pool and role coverage only — synergy
            receipts are hidden until the connection is restored.
          </p>
        </div>

        {/* Retry button */}
        <form action={retryRecs}>
          <button
            type="submit"
            // brand focus-visible outline treatment inherited from globals.css
            className="flex-none cursor-pointer"
            style={{
              fontFamily: "var(--font-sans), 'IBM Plex Sans', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "#EDE6D8",
              background: "transparent",
              border: "1px solid #3A3229",
              borderRadius: 8,
              padding: "10px 18px",
            }}
          >
            Retry now
          </button>
        </form>
      </div>
    </>
  );
}
