// The identity crown, promoted from decoration to the app's empty/loading mark.
// It was already beside the kaiju in completion-reveal.tsx; retiring the
// character layer removes the thing standing in front of the mark rather than
// leaving a hole. `pulse` carries the retired LoaderDots' 1.2s stagger, so the
// loading state keeps its animation and loses a component.
//
// Three intensities, per the handoff's decision 6. Quiet is for a mark that
// sits inside content — an empty state, a panel, an inline row — which is most
// of them. Page is for a mark that stands for the route itself rather than for
// something missing from it: a page's own heading mark, or the loading screen.
// Loud is reserved for the 99/99 reveal, the only place in the app allowed to
// raise its voice. Only the colour separates quiet from page; loud is also the
// larger geometry.
//
// The sizes come from the canvas's §G mobile rules ("The crown does not resize.
// 8/12px quiet and 13/19px loud at both widths"), which its own renderer code
// matches. README decision 6 cites 9/13/9 and "at 2×", but it is describing the
// hand-rolled crown Phase 0 replaces, not specifying the new one.

type Tone = "quiet" | "page" | "loud";

const TONES: Record<Tone, { small: string; large: string; gap: string; color: string }> = {
  quiet: { small: "w-[8px] h-[8px]", large: "w-[12px] h-[12px]", gap: "gap-[6px]", color: "var(--border-strong)" },
  page: { small: "w-[8px] h-[8px]", large: "w-[12px] h-[12px]", gap: "gap-[6px]", color: "var(--brass-strong)" },
  loud: { small: "w-[13px] h-[13px]", large: "w-[19px] h-[19px]", gap: "gap-[9px]", color: "var(--brass)" },
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
