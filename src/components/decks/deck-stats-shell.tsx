import type { ReactNode } from "react";

/** One Stats card's chrome: the figure role and its label, the header with its rule, and the denominator. */
export function Shell({ title, id, label, denom, info, describedBy, children }: { title: string; id: string; label?: string; denom?: string; info?: ReactNode; describedBy?: string; children?: ReactNode }) {
  return (
    <section
      role="figure"
      aria-label={label ?? title}
      aria-describedby={describedBy}
      data-stats-card={id}
      className="flex flex-col gap-[16px] rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[14px] py-[16px] md:px-[22px] md:py-[20px]"
    >
      <header className="relative flex items-baseline gap-[10px] border-b border-b-[color:var(--border)] pb-[10px]">
        <h3 className="whitespace-nowrap font-serif text-[17px] text-[color:var(--fg)] md:text-[19px]">{title}</h3>
        {info}
        <span className="flex-1" />
        {denom ? <span className="whitespace-nowrap text-right font-mono text-[10.5px] text-[color:var(--fg-faint)]">{denom}</span> : null}
      </header>
      {children}
    </section>
  );
}
