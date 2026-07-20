// Card-fan brand mark for the Issue Inspector's empty-filter state.
// Three fanned card silhouettes. Uses currentColor so the parent controls tint.

export function CardFanMark({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      role="img"
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="14"
        width="16"
        height="24"
        rx="2"
        transform="rotate(-14 18 26)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="20"
        y="12"
        width="16"
        height="24"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="30"
        y="14"
        width="16"
        height="24"
        rx="2"
        transform="rotate(14 38 26)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
