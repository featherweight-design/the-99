/**
 * The Notes mark: two stacked note slips, no card and no brackets (R4). The back slip is raised and
 * outlined; the front one is accent-tinted with three lines, the first one selected and the second with
 * an accent bar for a tag. Drawn from tokens only, so it follows every theme. Decorative.
 */
export function NotesMark({ size = 100 }: { size?: number }) {
  const h = (size * 74) / 100;
  const off = (size * 16) / 100;
  return (
    <svg width={size + off} height={h + off} viewBox={`0 0 ${size + off} ${h + off}`} aria-hidden focusable="false">
      <rect x={off} y={off} width={size} height={h} rx={size * 0.08} fill="var(--elevated)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <rect x={0.75} y={0.75} width={size - 1.5} height={h - 1.5} rx={size * 0.08} fill="color-mix(in srgb, var(--accent) 12%, var(--bg))" stroke="var(--accent)" strokeWidth={1.5} />
      {[0, 1, 2].map((i) => {
        const y = h * (0.26 + i * 0.24);
        return (
          <g key={i}>
            <rect x={size * 0.12} y={y - size * 0.045} width={size * 0.09} height={size * 0.09} rx={size * 0.02} fill={i === 0 ? "var(--accent)" : "none"} stroke="var(--accent)" strokeWidth={1.2} />
            <rect x={size * 0.28} y={y - size * 0.012} width={size * (i === 1 ? 0.36 : 0.5)} height={size * 0.03} rx={size * 0.015} fill="var(--fg-faint)" />
            {i === 1 && <rect x={size * 0.66} y={y - size * 0.012} width={size * 0.14} height={size * 0.03} rx={size * 0.015} fill="var(--accent)" />}
          </g>
        );
      })}
    </svg>
  );
}
