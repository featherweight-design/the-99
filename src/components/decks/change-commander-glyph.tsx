// The swap mark Change commander draws on its door and in its failed state.

/** The swap mark: two arrows, inline so it inks with `currentColor` in every theme. */
export function SwapGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path
        d="M2 5h10.5M9.5 2l3 3-3 3M14 11H3.5M6.5 8l-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
