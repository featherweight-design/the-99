// The table glyph (Rule 0 handoff): a table and its four seats, drawn in the ink around it. The pod row tints it accent
// at 18px; the game log's from line draws it at 16px in the line's own ink (plan §PR 8).
export function TableGlyph({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="10" cy="10.5" rx="5.2" ry="3.4" />
      <circle cx="10" cy="3.4" r="1.6" />
      <circle cx="10" cy="17.6" r="1.6" />
      <circle cx="2.6" cy="10.5" r="1.6" />
      <circle cx="17.4" cy="10.5" r="1.6" />
    </svg>
  );
}
