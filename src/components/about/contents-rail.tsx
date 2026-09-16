"use client";

// The contents navigation, in two placements that share one rule.
//
// Thirty-four entries run about nine screens: a list at the top answers "what
// is here" once and then scrolls away, and the reader spends the rest of the
// page with no way to tell where they are or to jump. Design drew the rail and
// then offered it as a cut in their own cost note; it was taken, twice, and
// that was the wrong call to make from a note about effort.
//
// `useCurrentChapter` lives here rather than in either component because both
// need it. The rail had it and the compact list did not, which made
// `aria-current` desktop-only — a screen-reader user on a phone got four links
// and no answer to which chapter they were in, on the width where the page is
// longest. Two observers over four elements is cheaper than a provider.

import { useEffect, useRef, useState } from "react";
import { aboutCopy, type AboutChapter } from "../../lib/copy/about";

export type RailChapter = {
  id: AboutChapter;
  title: string;
  count: number;
  newCount: number;
};

/** Which chapter the reader is in, or the first before anything has scrolled. */
function useCurrentChapter(chapters: readonly RailChapter[]): AboutChapter | null {
  const [current, setCurrent] = useState<AboutChapter | null>(chapters[0]?.id ?? null);
  // Which sections are on screen, ACCUMULATED across callbacks. The observer
  // hands over only the entries whose state CHANGED, never the full set — so
  // scrolling from 01 into 02 delivers one entry, 02, while 01 is still
  // intersecting and simply absent. A "topmost of this callback's entries"
  // reading therefore answers "whichever chapter most recently entered the
  // band", which is the opposite of the question.
  const onScreen = useRef(new Map<string, boolean>());

  useEffect(() => {
    // Guarded rather than assumed. Without an observer the navigation still
    // draws every link and still marks the first chapter — a page that cannot
    // say where you are is a smaller loss than a page that throws.
    if (typeof IntersectionObserver === "undefined") return;

    const ids = chapters.map((c) => c.id);
    const sections = ids
      .map((id) => document.getElementById(`chapter-${id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onScreen.current.set(entry.target.id.replace("chapter-", ""), entry.isIntersecting);
        }
        // The first chapter in DOCUMENT order that is on screen. Order comes
        // from the chapter list rather than from measured rectangles, which
        // makes the answer the same in a browser and in a test.
        const first = ids.find((id) => onScreen.current.get(id));
        if (first) setCurrent(first);
      },
      // Only the upper strip of the viewport counts as "here". With four long
      // chapters two are on screen for most of the page, and a full-viewport
      // root makes the first-in-order answer stick on chapter 01 far past the
      // point a reader has left it.
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [chapters]);

  return current;
}

function Figure({ chapter }: { chapter: RailChapter }) {
  return (
    <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
      {chapter.newCount > 0
        ? aboutCopy.newInChapter(chapter.newCount)
        : aboutCopy.entriesInChapter(chapter.count)}
    </span>
  );
}

/** Sticky beside the reading column, from the app's wide stop up. */
export function ContentsRail({ chapters }: { chapters: readonly RailChapter[] }) {
  const current = useCurrentChapter(chapters);
  return (
    <nav
      aria-label={aboutCopy.contentsLabel}
      className="sticky top-[24px] hidden w-[220px] flex-none min-[1000px]:block"
    >
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-[color:var(--fg-faint)] uppercase">
        {aboutCopy.contentsLabel}
      </p>
      <ol className="mt-[10px] list-none p-0">
        {chapters.map((chapter) => {
          const isCurrent = chapter.id === current;
          return (
            <li key={chapter.id}>
              <a
                href={`#chapter-${chapter.id}`}
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
                  <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                    {chapter.id}
                  </span>{" "}
                  {chapter.title}
                </span>
                <Figure chapter={chapter} />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** In flow, below the wide stop, where it is the only navigation there is. */
export function ContentsList({ chapters }: { chapters: readonly RailChapter[] }) {
  const current = useCurrentChapter(chapters);
  return (
    <nav aria-label={aboutCopy.contentsLabel} className="mt-[18px] min-[1000px]:hidden">
      <p className="font-mono text-[11px] text-[color:var(--fg-faint)]">
        {aboutCopy.contentsLabel}
      </p>
      <ol className="mt-[6px] list-none p-0">
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#chapter-${chapter.id}`}
              aria-current={chapter.id === current ? "true" : undefined}
              // 44px at every width: a contents row is one of four things a
              // thumb aims at here, and the others are links inside prose.
              className="flex min-h-[44px] items-center justify-between gap-[12px] border-b border-solid border-[color:var(--border)] text-[14px] text-[color:var(--accent)]"
            >
              <span>
                <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
                  {chapter.id}
                </span>{" "}
                {chapter.title}
              </span>
              <Figure chapter={chapter} />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
