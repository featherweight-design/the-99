// The identity crown, promoted from decoration to the app's empty/loading mark.
// It was already beside the kaiju in completion-reveal.tsx; retiring the
// character layer removes the thing standing in front of the mark rather than
// leaving a hole. `pulse` carries the retired LoaderDots' 1.2s stagger, so the
// loading state keeps its animation and loses a component.
//
// Three intensities, per the handoff's decision 6: quiet for a mark inside a
// panel, page for a full-route empty state, and loud — the same shape at twice
// the size — reserved for the 99/99 reveal, which is the only place in the app
// allowed to raise its voice.

type Tone = "quiet" | "page" | "loud";

const TONES: Record<Tone, { small: string; large: string; gap: string; color: string }> = {
  quiet: { small: "w-[9px] h-[9px]", large: "w-[13px] h-[13px]", gap: "gap-[7px]", color: "var(--border-strong)" },
  page: { small: "w-[9px] h-[9px]", large: "w-[13px] h-[13px]", gap: "gap-[7px]", color: "var(--brass-strong)" },
  loud: { small: "w-[18px] h-[18px]", large: "w-[26px] h-[26px]", gap: "gap-[14px]", color: "var(--brass)" },
};

const DELAYS = [0, 0.2, 0.4];

export function Crown({
  tone = "page",
  pulse,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  className?: string;
}) {
  const { small, large, gap, color } = TONES[tone];
  const sizes = [small, large, small];

  return (
    <div
      aria-hidden
      className={["inline-flex items-center", gap, className].filter(Boolean).join(" ")}
    >
      {sizes.map((size, i) => (
        <span
          key={i}
          className={["block rotate-45", size, pulse ? "anim-dots" : ""].filter(Boolean).join(" ")}
          style={{ background: color, ...(pulse ? { animationDelay: `${DELAYS[i]}s` } : {}) }}
        />
      ))}
    </div>
  );
}
