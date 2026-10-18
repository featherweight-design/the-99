"use client";

import { useEffect, useState } from "react";
import type { LegalSection } from "../../lib/copy/legal/shared";
import { legalCopy } from "../../lib/copy/legal/shared";

/**
 * `On this page`: a real list of anchors, never hidden behind a toggle and never `fixed`. On the phone it is numbered
 * 44px rows in the flow; from `md` it is the sticky 220px column, with the brand diamond on the section in view.
 * The section in view is the first section, in document order, whose heading is inside the top 30% of the screen
 * (`IntersectionObserver`); between bands the last one stays marked. With no observer, or before the first scroll, the first row is marked.
 */
export function LegalToc({ sections }: { sections: readonly LegalSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        // The first section (document order) with its heading inside the band wins; between bands, keep the last.
        const first = sections.find((s) => seen.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={legalCopy.onThisPage} className="md:sticky md:top-[24px] md:col-start-1 md:row-span-2 md:row-start-1 md:self-start">
      <p className="m-0 mb-[8px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">{legalCopy.onThisPage}</p>
      <ol className="m-0 flex list-none flex-col p-0 md:gap-[2px]">
        {sections.map((s, i) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="border-t border-solid border-t-[color:var(--border)] first:border-t-0 md:border-t-0">
              <a
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                className={`relative flex min-h-[44px] items-center gap-[10px] py-[6px] text-[14px] leading-[1.3] no-underline md:min-h-0 md:pl-[14px] md:text-[13px] ${
                  on ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"
                } hover:text-[color:var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]`}
              >
                {on && (
                  <span aria-hidden className="absolute left-0 top-1/2 hidden h-[6px] w-[6px] -translate-y-1/2 rotate-45 bg-[color:var(--accent)] md:block" />
                )}
                <span aria-hidden className="w-[1.4em] flex-none font-mono text-[11px] text-[color:var(--fg-faint)] md:hidden">{i + 1}</span>
                <span data-toc-title>{s.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
