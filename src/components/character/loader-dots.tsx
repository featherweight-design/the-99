// Three brass dots, staggered. Pairs with the crab on loading surfaces —
// the richness handoff names loading as the primary home for motion.

export function LoaderDots({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`flex gap-[6px] ${className ?? ""}`}>
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          className="anim-dots block rounded-full w-[7px] h-[7px]"
          style={{ background: "var(--brass)", animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}
