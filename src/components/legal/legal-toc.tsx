"use client";

import { useEffect, useState } from "react";
import type { LegalSection } from "../../lib/copy/legal/shared";
import { legalCopy } from "../../lib/copy/legal/shared";

/**
 * `On this page`: a real list of anchors, never hidden behind a toggle and never `fixed`. On the phone it is numbered
 * 44px rows in the flow; from `md` it is the sticky 220px column, with the brand diamond on the section in view.
 * The section in view is the last heading whose top has passed the reading line, 30% down the screen; before the first scroll
 * the first row is marked.
 */
export function LegalToc({ sections }: { sections: readonly LegalSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    // The last heading whose top has passed the reading line (30% down the screen), by pixels read at each scroll and resize:
    // a percentage `rootMargin` resolves against the root's own box and is unreliable across engines.
    const update = () => {
      const line = window.innerHeight * 0.3;
      let current = sections[0]?.id ?? "";
      // At the foot of the page the last, short section can never scroll up to the line: it is the one in view.
      const atEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atEnd) {
        setActive(sections[sections.length - 1]?.id ?? current);
        return;
      }
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
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
