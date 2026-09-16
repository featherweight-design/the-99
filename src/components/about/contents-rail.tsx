"use client";

// The sticky contents rail — desktop only, and the page's only interactive part.
//
// It exists because thirty-four entries run about nine screens: an in-flow list
// at the top answers "what is here" once and then scrolls away, and the reader
// spends the rest of the page with no way to tell where they are or to jump.
// Design drew this rail and then offered it as a cut in their own cost note; it
// was taken, twice, and that was the wrong call to make from a note about
// effort.
//
// A client component, and it has to be: "which chapter am I in" is a fact about
// scroll position. The page around it stays a server component — this is the
// only thing here that observes anything.

import { useEffect, useState } from "react";
import { aboutCopy, aboutEntries, type AboutChapter } from "../../lib/copy/about";

export function ContentsRail({
  chapters,
  newPerChapter,
}: {
  chapters: readonly AboutChapter[];
  /** Counted on the server, where `seen` is known. */
  newPerChapter: Record<string, number>;
}) {
  const [current, setCurrent] = useState<AboutChapter>(chapters[0]);

  useEffect(() => {
    // Guarded rather than assumed. Without an observer the rail still draws
    // every link and still marks the first chapter — a page that cannot say
    // where you are is a smaller loss than a page that throws, and jsdom is
    // one environment that has no IntersectionObserver.
    if (typeof IntersectionObserver === "undefined") return;

    const sections = chapters
      .map((n) => document.getElementById(`chapter-${n}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // The TOPMOST section whose heading has passed the reader, rather than the
    // first one intersecting: with four long chapters, two are on screen at
    // once for most of the page, and "first intersecting" flickers between them
    // on every small scroll. A rootMargin that only admits the upper strip of
    // the viewport makes the answer stable.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0]?.target.id.replace("chapter-", "");
        if (first) setCurrent(first as AboutChapter);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <nav
      aria-label={aboutCopy.contentsLabel}
      className="sticky top-[24px] hidden w-[220px] flex-none min-[1000px]:block"
    >
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-[color:var(--fg-faint)] uppercase">
        {aboutCopy.contentsLabel}
      </p>
      <ol className="mt-[10px] list-none p-0">
        {chapters.map((n) => {
          const entries = aboutEntries.filter((e) => e.chapter === n);
          const isCurrent = n === current;
          return (
            <li key={n}>
              <a
                href={`#chapter-${n}`}
                // `aria-current` is the whole reason this is worth being a
                // client component: the fill says where you are to someone
                // looking, and this says it to someone who is not.
                aria-current={isCurrent ? "true" : undefined}
                className={`flex items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[8px] text-[13px] ${
                  isCurrent
                    ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                    : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
                }`}
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{n}</span>{" "}
                  {aboutCopy.chapters[n].title}
                </span>
                <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                  {newPerChapter[n] > 0 ? aboutCopy.newInChapter(newPerChapter[n]) : entries.length}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
