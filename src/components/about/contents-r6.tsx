"use client";

// The contents at entry level, with a title search (About R6 §Q, §R), in the
// same two placements as `contents-rail.tsx`: a sticky rail from the page's wide
// stop, and an in-flow list below it. Drawn only under `ABOUT_SHEET_ENABLED`;
// the older pair stays exactly as it was until the switch is retired.
//
// THE RAIL OPENS ONLY THE CURRENT CHAPTER. That is R9.1's fallback, taken on
// measurement (audit E4): with all 39 entries open the list is 1,365px against
// 702px of rail at 1300x820, 51.4% visible, under the 60% bar. It collapses the
// LIST, never the page, so ruling 4 holds. A search opens every chapter that
// holds a match.
//
// THE SEARCH FILTERS THIS LIST AND NOTHING ELSE (ruling 4). It never reaches the
// page's sections: `filterChapters` knows nothing about them.

import { useEffect, useMemo, useRef, useState } from "react";
import { aboutCopy, type AboutChapter } from "../../lib/copy/about";
import { filterChapters, matchTitle } from "../../lib/about/search";
import { GhostButton } from "../ui/button";
import { SearchField } from "../ui/text-field";
import { CURRENT_BAND, type RailChapter } from "./contents-rail";

export type ContentsEntry = { id: string; title: string; isNew: boolean };
export type ContentsChapter = RailChapter & { entries: ContentsEntry[] };

const copy = aboutCopy.contents;

/**
 * Where the reader is: the first chapter, and the first entry, in document
 * order that sits in the upper band. Accumulated across callbacks, because an
 * observer reports only what CHANGED (see `useCurrentChapter`).
 */
function useCurrentPlace(chapters: readonly ContentsChapter[]) {
  const [place, setPlace] = useState<{ chapter: AboutChapter | null; entry: string | null }>({
    chapter: chapters[0]?.id ?? null,
    entry: null,
  });
  const onScreen = useRef(new Map<string, boolean>());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const chapterIds = chapters.map((c) => `chapter-${c.id}`);
    const entryIds = chapters.flatMap((c) => c.entries.map((e) => e.id));
    const targets = [...chapterIds, ...entryIds]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver((hits) => {
      for (const hit of hits) onScreen.current.set(hit.target.id, hit.isIntersecting);
      const chapter = chapterIds.find((id) => onScreen.current.get(id));
      const entry = entryIds.find((id) => onScreen.current.get(id)) ?? null;
      setPlace((prev) => ({
        chapter: chapter ? (chapter.replace("chapter-", "") as AboutChapter) : prev.chapter,
        entry,
      }));
    }, CURRENT_BAND);
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [chapters]);

  return place;
}

function useSearch(
  chapters: readonly ContentsChapter[],
  list: React.RefObject<HTMLDivElement | null>,
) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const result = useMemo(() => filterChapters(chapters, query), [chapters, query]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
    } else if (e.key === "Enter" && searching) {
      e.preventDefault();
      const first = result.chapters[0]?.entries[0];
      if (first) window.location.hash = first.id;
    } else if (e.key === "ArrowDown" && searching) {
      e.preventDefault();
      list.current?.querySelector<HTMLAnchorElement>("a[data-entry-row]")?.focus();
    }
  };

  return { query, setQuery, searching, result, onKeyDown };
}

/** A title with the matched run drawn apart (§R2): the run in `--fg`/600, the rest faint. */
function Title({ title, query }: { title: string; query: string }) {
  const m = matchTitle(title, query);
  if (!m.matched) return <>{title}</>;
  return (
    <>
      <span className="text-[color:var(--fg-faint)]">{m.before}</span>
      <span className="font-semibold text-[color:var(--fg)]">{m.hit}</span>
      <span className="text-[color:var(--fg-faint)]">{m.after}</span>
    </>
  );
}

function NewTag() {
  return (
    <span className="ml-[6px] flex-none font-mono text-[10.5px] text-[color:var(--accent)]">
      {copy.newRow}
    </span>
  );
}

function Field({
  search,
  tall,
}: {
  search: ReturnType<typeof useSearch>;
  tall: boolean;
}) {
  const { query, setQuery, searching, result, onKeyDown } = search;
  return (
    <SearchField
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={copy.searchPlaceholder}
      aria-label={copy.searchLabel}
      containerClassName={tall ? "h-[44px]" : "h-[34px]"}
      className={tall ? "text-[16px]" : "text-[13px]"}
      trailing={
        <>
          {/* The count is the live region (§R2), so a reader who cannot see the
              list hears how many titles their query reached. */}
          <span aria-live="polite" className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {searching ? copy.count(result.count, result.total) : ""}
          </span>
          {searching && (
            <button
              type="button"
              aria-label={copy.clear}
              onClick={() => setQuery("")}
              className={
                "flex flex-none items-center justify-center rounded-[6px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] " +
                (tall ? "h-[32px] w-[32px]" : "h-[22px] w-[22px]")
              }
            >
              <span aria-hidden>✕</span>
            </button>
          )}
        </>
      }
    />
  );
}

function Nothing({ query, onClear, tall }: { query: string; onClear: () => void; tall: boolean }) {
  return (
    <div className="px-[2px] py-[10px]">
      <p className="text-[13px] text-[color:var(--fg)]">{copy.none(query.trim())}</p>
      <p className="mt-[4px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
        {copy.noneNote}
      </p>
      <GhostButton
        onClick={onClear}
        className={"mt-[10px] px-[14px] text-[12.5px] " + (tall ? "h-[44px]" : "h-[32px]")}
      >
        {copy.clear}
      </GhostButton>
    </div>
  );
}

/** Sticky beside the reading column, from the page's wide stop up (§Q1–Q3). */
export function ContentsRailR6({ chapters }: { chapters: readonly ContentsChapter[] }) {
  const place = useCurrentPlace(chapters);
  const list = useRef<HTMLDivElement>(null);
  const search = useSearch(chapters, list);
  const { searching, result, query, setQuery } = search;
  const shown = searching ? result.chapters : chapters;

  // Keep the current row in view inside the list's own scroll box (§Q3). The
  // box, never the window: a scrollIntoView here would move the page too.
  useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>("[aria-current='true']");
    if (!box || !row) return;
    const top = row.offsetTop - box.offsetTop;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (top + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = top + row.offsetHeight - box.clientHeight;
  }, [place]);

  return (
    <nav
      aria-label={aboutCopy.contentsLabel}
      // Fills the viewport height below its 24px sticky top, so the list can
      // scroll inside it while the label and the field stay put (§Q1).
      className="sticky top-[24px] hidden max-h-[calc(100vh-48px)] w-[216px] flex-none flex-col min-[1000px]:flex"
    >
      <p className="font-mono text-[10.5px] tracking-[0.12em] text-[color:var(--fg-faint)] uppercase">
        {aboutCopy.contentsLabel}
      </p>
      <div className="mt-[10px]">
        <Field search={search} tall={false} />
      </div>
      <div ref={list} className="mt-[10px] min-h-0 flex-1 overflow-y-auto">
        {searching && result.count === 0 ? (
          <Nothing query={query} onClear={() => setQuery("")} tall={false} />
        ) : (
          <ol className="list-none p-0">
            {shown.map((chapter) => {
              const open = searching || chapter.id === place.chapter;
              const chapterCurrent = !searching && chapter.id === place.chapter && !place.entry;
              const figure = searching
                ? String(chapter.entries.length)
                : chapter.newCount > 0
                  ? aboutCopy.newInChapter(chapter.newCount)
                  : "";
              return (
                <li key={chapter.id}>
                  <a
                    href={`#chapter-${chapter.id}`}
                    aria-current={chapterCurrent ? "true" : undefined}
                    className={`flex items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[8px] text-[13px] ${
                      chapterCurrent
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
                    <span
                      className={`flex-none font-mono text-[10.5px] ${
                        !searching && chapter.newCount > 0
                          ? "text-[color:var(--accent)]"
                          : "text-[color:var(--fg-faint)]"
                      }`}
                    >
                      {figure}
                    </span>
                  </a>
                  {open && (
                    <ol className="list-none p-0">
                      {chapter.entries.map((entry) => {
                        const current = !searching && entry.id === place.entry;
                        return (
                          <li key={entry.id}>
                            <a
                              data-entry-row=""
                              href={`#${entry.id}`}
                              aria-current={current ? "true" : undefined}
                              className={`flex items-baseline rounded-[6px] py-[4px] pr-[10px] pl-[30px] text-[12.5px] leading-[1.35] ${
                                current
                                  ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                                  : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
                              }`}
                            >
                              <span className="min-w-0 flex-1">
                                <Title title={entry.title} query={query} />
                              </span>
                              {entry.isNew && <NewTag />}
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </nav>
  );
}

/** In flow, below the wide stop (§Q4–Q7). Chapters are disclosures, closed at first. */
export function ContentsListR6({ chapters }: { chapters: readonly ContentsChapter[] }) {
  const place = useCurrentPlace(chapters);
  const list = useRef<HTMLDivElement>(null);
  const search = useSearch(chapters, list);
  const { searching, result, query, setQuery } = search;
  // The reader's own open chapters. A search shows its matches without touching
  // this, so clearing it restores exactly what they had open (§R6).
  const [opened, setOpened] = useState<ReadonlySet<AboutChapter>>(new Set());
  const shown = searching ? result.chapters : chapters;

  const toggle = (id: AboutChapter) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav aria-label={aboutCopy.contentsLabel} className="mt-[18px] min-[1000px]:hidden">
      <p className="font-mono text-[11px] text-[color:var(--fg-faint)]">{aboutCopy.contentsLabel}</p>
      <div className="mt-[6px]">
        <Field search={search} tall />
      </div>
      <div ref={list} className="mt-[6px]">
        {searching && result.count === 0 ? (
          <Nothing query={query} onClear={() => setQuery("")} tall />
        ) : (
          <ol className="list-none p-0">
            {shown.map((chapter) => {
              const open = searching || opened.has(chapter.id);
              const panel = `contents-entries-${chapter.id}`;
              const figure = searching
                ? String(chapter.entries.length)
                : chapter.newCount > 0
                  ? aboutCopy.newInChapter(chapter.newCount)
                  : String(chapter.count);
              return (
                <li key={chapter.id} className="border-b border-solid border-[color:var(--border)]">
                  <div className="flex items-stretch">
                    <a
                      href={`#chapter-${chapter.id}`}
                      aria-current={chapter.id === place.chapter ? "true" : undefined}
                      className="flex min-h-[44px] min-w-0 flex-1 items-center text-[14px] text-[color:var(--accent)]"
                    >
                      <span>
                        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
                          {chapter.id}
                        </span>{" "}
                        {chapter.title}
                      </span>
                    </a>
                    {searching ? (
                      // The disclosures go quiet while a search holds every
                      // matching chapter open (§R2); the figure is its match count.
                      <span className="flex min-h-[44px] flex-none items-center font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                        {figure}
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panel}
                        aria-label={copy.toggle(chapter.title)}
                        onClick={() => toggle(chapter.id)}
                        className="flex min-h-[44px] min-w-[44px] flex-none items-center justify-end gap-[8px]"
                      >
                        <span
                          className={`font-mono text-[10.5px] ${
                            chapter.newCount > 0 ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"
                          }`}
                        >
                          {figure}
                        </span>
                        <span
                          aria-hidden
                          className={`text-[11px] text-[color:var(--fg-faint)] ${open ? "rotate-180" : ""}`}
                        >
                          ▾
                        </span>
                      </button>
                    )}
                  </div>
                  {open && (
                    <ol id={panel} className="list-none p-0 pb-[6px]">
                      {chapter.entries.map((entry) => (
                        <li key={entry.id}>
                          <a
                            data-entry-row=""
                            href={`#${entry.id}`}
                            className="flex min-h-[44px] items-center pl-[26px] text-[13.5px] text-[color:var(--fg-body)]"
                          >
                            <span className="min-w-0 flex-1">
                              <Title title={entry.title} query={query} />
                            </span>
                            {entry.isNew && <NewTag />}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </nav>
  );
}
