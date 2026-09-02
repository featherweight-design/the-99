// The identity crown, promoted from decoration to the app's empty/loading mark.
// It was already beside the kaiju in completion-reveal.tsx; retiring the
// character layer removes the thing standing in front of it rather than
// leaving a hole. `pulse` carries the retired LoaderDots' 1.2s stagger, so the
// loading state keeps its animation and loses a component.

const DIAMONDS = [
  { size: "w-[9px] h-[9px]", delay: 0 },
  { size: "w-[13px] h-[13px]", delay: 0.2 },
  { size: "w-[9px] h-[9px]", delay: 0.4 },
];

export function Crown({ pulse, className }: { pulse?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={["inline-flex items-center gap-[7px]", className].filter(Boolean).join(" ")}
    >
      {DIAMONDS.map(({ size, delay }, i) => (
        <span
          key={i}
          className={["block rotate-45 bg-[color:var(--brass)]", size, pulse ? "anim-dots" : ""]
            .filter(Boolean)
            .join(" ")}
          style={pulse ? { animationDelay: `${delay}s` } : undefined}
        />
      ))}
    </div>
  );
}
