// "On this page": one chip per screen of an About page, each a jump to its section (About visual build, plan
// `2026-10-27-about-visual.md`, PR 3, Task 3.1; handoff call 3, boards Decks-Phone and Decks-Desktop `.onp`).
//
// The chip is the ? panel's (`help-panel.tsx`'s Elsewhere chip: 34px, pill, `--border-strong` on `--surface`); the
// panel keeps its own until PR 6a retires it and the chip moves here. The chip of the section being read is lit
// (`.chip.on`: an accent border and `--fg` ink) and carries `aria-current`.

"use client";

import { useEffect, useState } from "react";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";

const ABOUT_CHIP =
  "inline-flex h-[34px] items-center whitespace-nowrap rounded-full border border-solid bg-[color:var(--surface)] px-[12px] text-[13px]";

/** How far below the window's top a section must start to still count as the one being read. */
const READ_LINE = 120;

export function OnThisPage({ sections }: { sections: readonly { id: string; name: string }[] }) {
  const [current, setCurrent] = useState(sections[0]?.id ?? null);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      let at = sections[0]?.id ?? null;
      // At the foot of the page a short last section can never reach the reading line: it is the one in view
      // (`legal-toc.tsx`'s rule).
      const atEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atEnd) {
        setCurrent(sections[sections.length - 1]?.id ?? at);
        return;
      }
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= READ_LINE) at = s.id;
      }
      setCurrent(at);
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    <nav aria-label={ABOUT_PAGE_STRINGS.onThisPage} className="flex flex-wrap items-center gap-[8px] px-[16px] pb-[4px] pt-[14px] md:px-0 md:pt-[16px]">
      <span
        aria-hidden
        className="mr-[4px] w-full font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)] md:w-auto"
      >
        {ABOUT_PAGE_STRINGS.onThisPage}
      </span>
      {sections.map((s) => {
        const on = s.id === current;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            data-about-chip={s.id}
            aria-current={on ? "location" : undefined}
            className={`${ABOUT_CHIP} ${
              on
                ? "border-[color:var(--accent)] text-[color:var(--fg)]"
                : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
            }`}
          >
            {s.name}
          </a>
        );
      })}
    </nav>
  );
}
