import { Crown } from "./crown";

/**
 * A sheet's loading block (swap tools README, "Loading": the shipped LoadingScreen scaled into the sheet, the pulsing
 * crown over a display heading and a mono status). It GROWS to fill what is left of the sheet's body (`flex-1`), so on
 * the phone, where the sheet stands at its full height, the loader is that height too rather than a 250px block over
 * empty sheet (Hugh, 2026-10-27). `ModalPanel`'s body carries the flex chain down to the sheet's own column; the
 * minimum height is the handoff's, for a sheet that hugs its content.
 *
 * `compact` is the stacked Fits picker's smaller draw (230px, a narrower glow), as it shipped.
 */
export function SheetLoading({ heading, status, compact = false }: { heading: string; status?: string | null; compact?: boolean }) {
  return (
    <div
      role="status"
      className={`flex flex-1 flex-col items-center justify-center rounded-[10px] px-[20px] text-center ${compact ? "min-h-[230px] py-[24px]" : "min-h-[250px] py-[28px]"}`}
      style={{
        background: compact
          ? "radial-gradient(380px 200px at 50% 70%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)"
          : "radial-gradient(420px 220px at 50% 70%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)",
      }}
    >
      <Crown pulse />
      <h3 className="m-0 mt-[20px] w-full font-display font-bold text-[18px] leading-[1.25] [text-wrap:balance]" style={{ color: "var(--fg)" }}>
        {heading}
      </h3>
      {status ? (
        <p className="m-0 mt-[8px] font-mono text-[12px]" style={{ color: "var(--fg-faint)" }}>{status}</p>
      ) : null}
    </div>
  );
}
