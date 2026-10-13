/**
 * The magnifier every search field draws: the one copy. `currentColor`, so the
 * field's text colour sets it. The handle starts clear of the lens (the lens's
 * outer edge plus the round cap sit short of its first point), so the two never
 * touch at any size; the old drawing's handle began inside the stroke and read
 * as one smear at 14px.
 */
export function SearchIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
      data-search-icon
    >
      <circle cx="8.4" cy="8.4" r="5.8" />
      <path d="M14 14L18 18" />
    </svg>
  );
}
