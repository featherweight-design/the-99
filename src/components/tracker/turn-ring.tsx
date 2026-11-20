// The turn ring (F03): the panel border, drawn as four paths that trace outward from the middle of the long top and bottom
// borders to the corners. Under reduced motion it is simply there (the `motion-reduce` classes drop the draw).

export function TurnRing() {
  const path = "stroke-[color:var(--accent)] [stroke-width:2] fill-none [stroke-dasharray:1] [stroke-dashoffset:0] animate-[ring-trace_.65s_cubic-bezier(.4,.1,.2,1)_both] motion-reduce:animate-none";
  return (
    <svg aria-hidden="true" data-testid="turn-ring" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <path pathLength="1" vectorEffect="non-scaling-stroke" className={path} d="M50 1 H99 V50" />
      <path pathLength="1" vectorEffect="non-scaling-stroke" className={path} d="M99 50 V99 H50" />
      <path pathLength="1" vectorEffect="non-scaling-stroke" className={path} d="M50 99 H1 V50" />
      <path pathLength="1" vectorEffect="non-scaling-stroke" className={path} d="M1 50 V1 H50" />
    </svg>
  );
}
