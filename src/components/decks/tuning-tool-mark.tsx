// The four Tuning tool marks (tuning hub handoff R1, `TuningToolMark.dc.html`; design table
// `TuningToolMark`). One ink, `currentColor`, always beside the tool's name and never in place of
// it, so `aria-hidden`. Geometric for Suggested changes, Mana Balance and History; Proposed cuts
// takes the glyph (Hugh, R1 feedback 3). The canvas draws the geometric marks as percentage
// boxes; here they are the same boxes in a 24-unit viewBox, with the stroke converted from the
// canvas's pixel widths so a mark reads the same at every size in use (14, 16, 20).

export type TuningTool = "suggested" | "mana" | "cuts" | "history";

/** The canvas's stroke steps, in px: 1.5 under 18, 2 from 18, 2.5 from 28. */
function strokePx(size: number): number {
  return size >= 28 ? 2.5 : size >= 18 ? 2 : 1.5;
}

export function TuningToolMark({ tool, size }: { tool: TuningTool; size: number }) {
  // Pixels to viewBox units: the viewBox is 24 wide whatever the box measures.
  const unit = 24 / size;
  const sw = strokePx(size) * unit;
  const thin = (size >= 18 ? 1.5 : 1) * unit;
  const radius = 2 * unit;
  return (
    <svg
      aria-hidden="true"
      data-tool-mark={tool}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="block flex-none"
      fill="currentColor"
    >
      {tool === "suggested" ? (
        <>
          {/* Outlined card, diamond, filled card: a swap. */}
          <rect x={0.96 + sw / 2} y={3.36 + sw / 2} width={8.16 - sw} height={17.28 - sw} rx={radius} fill="none" stroke="currentColor" strokeWidth={sw} />
          <rect x={10.56} y={10.44} width={3.12} height={3.12} transform="rotate(45 12.12 12)" />
          <rect x={14.88} y={3.36} width={8.16} height={17.28} rx={radius} />
        </>
      ) : tool === "mana" ? (
        <>
          {/* Two pips on a beam over a diamond fulcrum: a balance. */}
          <circle cx={4.8} cy={7.68} r={3.36} />
          <circle cx={19.2} cy={7.68} r={3.36} />
          <rect x={0.96} y={12.48} width={22.08} height={sw} />
          <rect x={9.36} y={14.64} width={5.28} height={5.28} transform="rotate(45 12 17.28)" />
        </>
      ) : tool === "cuts" ? (
        // A solid card split by one diagonal gap: the 16-grid glyph, scaled to 24.
        <g transform="scale(1.5)">
          <path d="M4 1.5 H12 V5.2 L4 10 Z" />
          <path d="M12 7.6 V14.5 H4 V12.4 Z" />
        </g>
      ) : (
        <>
          {/* Three ruled lines, each led by a diamond, the newest filled: a ledger. */}
          <rect x={1.92} y={3} width={3.6} height={3.6} transform="rotate(45 3.72 4.8)" />
          <rect x={8.64} y={4.8 - sw / 2} width={14.4} height={sw} />
          <rect x={1.92 + thin / 2} y={10.2 + thin / 2} width={3.6 - thin} height={3.6 - thin} transform="rotate(45 3.72 12)" fill="none" stroke="currentColor" strokeWidth={thin} />
          <rect x={8.64} y={12 - sw / 2} width={14.4} height={sw} />
          <rect x={1.92 + thin / 2} y={17.4 + thin / 2} width={3.6 - thin} height={3.6 - thin} transform="rotate(45 3.72 19.2)" fill="none" stroke="currentColor" strokeWidth={thin} />
          <rect x={8.64} y={19.2 - sw / 2} width={9.6} height={sw} />
        </>
      )}
    </svg>
  );
}
