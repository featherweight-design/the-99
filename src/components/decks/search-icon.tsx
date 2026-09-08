/**
 * The magnifier drawn beside every Decks search field: 14px in the desktop
 * column, 16px in the phone sheet and header. `currentColor` rather than a
 * token, so one icon serves all three without the caller naming a colour.
 */
export function SearchIcon({ size }: { size: 14 | 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="5.4" />
      <path d="m13.2 13.2 3.3 3.3" />
    </svg>
  );
}
