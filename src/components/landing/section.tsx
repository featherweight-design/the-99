import type { CSSProperties, ReactNode } from "react";

/** `.anim-gentle-in` with the shipped stagger worked out per item (not `.anim-reveal`'s opacity-only one): item n waits n beats longer. */
export const rise = (n: number): CSSProperties => ({ animationDelay: `calc(var(--motion-delay) + var(--motion-stagger) * ${n})` });

const EYEBROW = "m-0 mb-[10px] font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--accent-text)]";

/** A landing section below the numbers strip: the shared padding, eyebrow and title, one component at both widths. */
export function Section({ id, eyebrow, title, lead, children, testId }: { id: string; eyebrow: string; title: string; lead?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <section
      aria-labelledby={id}
      data-testid={testId}
      className="border-t border-solid border-t-[color:var(--border)] px-[20px] py-[40px] md:px-[90px] md:py-[64px]"
    >
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 id={id} className="m-0 font-display text-[24px] font-bold leading-[1.2] text-[color:var(--fg)] md:text-[32px]">{title}</h2>
      {lead}
      {children}
    </section>
  );
}

/** The sentence under a section title. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="m-0 mt-[10px] max-w-[620px] text-pretty text-[15px] leading-[1.6] text-[color:var(--fg-body)] md:text-[16px]">{children}</p>;
}
