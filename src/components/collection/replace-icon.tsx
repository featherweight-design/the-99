// The upload mark every collection surface draws (collection edit R1, "Icons"): 14px beside 13px
// text, 16px on a line, 18px in a tile. Never the ↻ glyph. Shared by the place head and the
// Add cards sheet, which both used to need their own copy.

/* The handoff spells this mark as the "↻" glyph, but glyph metrics render it
   noticeably smaller than the label it sits beside and no font stack agrees on
   its size. Same mark, drawn at an explicit 14px so it matches the 13px text. */
export function ReplaceIcon({
  size = 14,
  className = "inline-block align-[-2px] mr-[6px]",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.16" />
      <path d="M13.5 1.5v3.2h-3.2" />
    </svg>
  );
}
