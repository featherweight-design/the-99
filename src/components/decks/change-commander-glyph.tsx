// The swap mark Change commander draws on its door and in its failed state (handoff R3-E: two
// arrows, stroked in `currentColor`, so it inks with whatever carries it in every theme).

export function SwapGlyph({ size = 15, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      className="block flex-none"
    >
      <path
        d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
