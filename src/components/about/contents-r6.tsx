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
import { howItWorksLinksCopy } from "../../lib/copy/how-it-works-links";
import { GhostButton } from "../ui/button";
import { SearchField } from "../ui/text-field";
import { CURRENT_BAND, type RailChapter } from "./contents-rail";
import { CHEVRON_CLASS } from "../ui/chevron";

export type ContentsEntry = { id: string; title: string; isNew: boolean };
export type ContentsChapter = RailChapter & { entries: ContentsEntry[] };
/**
 * "How the app reaches its answers", a group after the chapters (plan 2026-09-28, PR C). Its own
 * shape rather than a fifth chapter: chapters are keyed on `AboutChapter`, and a row is not an entry.
 */
export type ContentsAppendix = { id: string; title: string; rows: { id: string; title: string }[] };

const copy = aboutCopy.contents;

/**
 * Where the reader is: the first chapter, and the first entry, in document
 * order that sits in the upper band. Accumulated across callbacks, because an
 * observer reports only what CHANGED (see `useCurrentChapter`).
 */
function useCurrentPlace(chapters: readonly ContentsChapter[], appendix?: ContentsAppendix) {
  const [place, setPlace] = useState<{ chapter: AboutChapter | null; entry: string | null }>({
    chapter: chapters[0]?.id ?? null,
    entry: null,
  });
  const onScreen = useRef(new Map<string, boolean>());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const chapterIds = chapters.map((c) => `chapter-${c.id}`);
    // The appendix's section, then its rows, after the entries: document order, which `findLast`
    // below relies on. A row, or the section's head, is a place in no chapter.
    const appendixIds = appendix ? [appendix.id, ...appendix.rows.map((r) => r.id)] : [];
    const entryIds = [...chapters.flatMap((c) => c.entries.map((e) => e.id)), ...appendixIds];
    const chapterOf = new Map(chapters.flatMap((c) => c.entries.map((e) => [e.id, c.id] as const)));
    const targets = [...chapterIds, ...entryIds]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver((hits) => {
      for (const hit of hits) onScreen.current.set(hit.target.id, hit.isIntersecting);
      const chapter = chapterIds.find((id) => onScreen.current.get(id));
      // The LAST entry in the band, not the first. Entries are short, so the band
      // usually holds the tail of the one above as well as the one the reader is
      // on, and a jump lands its entry 20px down with the previous entry's last
      // lines above it. First-in-order marked that previous entry.
      const entry = entryIds.findLast((id) => onScreen.current.get(id)) ?? null;
      // The entry decides the chapter when there is one. At a chapter boundary
      // the previous section's tail can share the band with the next chapter's
      // first entry, and opening the section's chapter would hide that entry.
      setPlace((prev) => ({
        chapter:
          entry && appendixIds.includes(entry)
            ? null
            : ((entry ? chapterOf.get(entry) : undefined) ??
              (chapter ? (chapter.replace("chapter-", "") as AboutChapter) : prev.chapter)),
        entry,
      }));
    }, CURRENT_BAND);
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [chapters, appendix]);

  return place;
}

function useSearch(
  chapters: readonly ContentsChapter[],
  list: React.RefObject<HTMLDivElement | null>,
  appendix?: ContentsAppendix,
) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const result = useMemo(() => {
    const found = filterChapters(chapters, query);
    // Row titles are searched too, and count in both halves of "N of M".
    const rows = appendix ? appendix.rows.filter((r) => matchTitle(r.title, query).matched) : [];
    return {
      ...found,
      rows,
      count: found.count + rows.length,
      total: found.total + (appendix?.rows.length ?? 0),
    };
  }, [chapters, query, appendix]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
    } else if (e.key === "Enter" && searching) {
      e.preventDefault();
      const first = result.chapters[0]?.entries[0] ?? result.rows[0];
      if (!first) return;
      // Press the row rather than set the hash: setting the hash the address
      // already carries does nothing at all, so a second Enter on the same
      // query would neither scroll nor re-land the jump mark. A click on the
      // row's own link does both, same hash or not.
      const row = [...(list.current?.querySelectorAll<HTMLAnchorElement>("a[data-entry-row]") ?? [])].find(
        (a) => a.getAttribute("href") === `#${first.id}`,
      );
      if (row) row.click();
      else window.location.hash = first.id;
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
      clearLabel={copy.clear}
      onClear={() => setQuery("")}
      trailing={
        <>
          {/* The count is the live region (§R2), so a reader who cannot see the
              list hears how many titles their query reached. */}
          <span aria-live="polite" className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {searching ? copy.count(result.count, result.total) : ""}
          </span>
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
export function ContentsRailR6({
  chapters,
  appendix,
}: {
  chapters: readonly ContentsChapter[];
  appendix?: ContentsAppendix;
}) {
  const place = useCurrentPlace(chapters, appendix);
  const list = useRef<HTMLDivElement>(null);
  const search = useSearch(chapters, list, appendix);
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
                        : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
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
                        // Not gated on the search: a pressed result keeps the
                        // query and the results (§R4) and takes the current fill.
                        const current = entry.id === place.entry;
                        return (
                          <li key={entry.id}>
                            <a
                              data-entry-row=""
                              href={`#${entry.id}`}
                              aria-current={current ? "true" : undefined}
                              className={`flex items-baseline rounded-[6px] py-[4px] pr-[10px] pl-[30px] text-[12.5px] leading-[1.35] ${
                                current
                                  ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                                  : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
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
            {appendix && (!searching || result.rows.length > 0) && (
              <li className="mt-[8px] border-t border-solid border-[color:var(--border)] pt-[8px]">
                <a
                  href={`#${appendix.id}`}
                  aria-current={place.entry === appendix.id ? "true" : undefined}
                  className={`flex items-center rounded-[6px] px-[10px] py-[7px] text-[13px] ${
                    place.entry === appendix.id
                      ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                      : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
                  }`}
                >
                  <span className="min-w-0 truncate">{appendix.title}</span>
                </a>
                <ol className="list-none p-0">
                  {(searching ? result.rows : appendix.rows).map((row) => {
                    const current = row.id === place.entry;
                    return (
                      <li key={row.id}>
                        <a
                          data-entry-row=""
                          href={`#${row.id}`}
                          aria-current={current ? "true" : undefined}
                          className={`flex items-baseline rounded-[6px] py-[4px] pr-[10px] pl-[30px] text-[12.5px] leading-[1.35] ${
                            current
                              ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                              : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <Title title={row.title} query={query} />
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </li>
            )}
          </ol>
        )}
      </div>
    </nav>
  );
}

/** In flow, below the wide stop (§Q4–Q7). Chapters are disclosures, closed at first. */
export function ContentsListR6({
  chapters,
  appendix,
}: {
  chapters: readonly ContentsChapter[];
  appendix?: ContentsAppendix;
}) {
  const place = useCurrentPlace(chapters, appendix);
  const list = useRef<HTMLDivElement>(null);
  const search = useSearch(chapters, list, appendix);
  const [appendixOpen, setAppendixOpen] = useState(false);
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
                <li key={chapter.id} className="border-b border-b-[color:var(--border)] border-solid border-[color:var(--border)]">
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
                        // Only while the panel exists: a closed chapter's list is
                        // unmounted, and a reference to nothing dangles.
                        aria-controls={open ? panel : undefined}
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
                          className={`${CHEVRON_CLASS} text-[color:var(--fg-faint)] ${open ? "rotate-180" : ""}`}
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
            {appendix && (!searching || result.rows.length > 0) && (
              <AppendixListRow
                appendix={appendix}
                rows={searching ? result.rows : appendix.rows}
                open={searching || appendixOpen}
                searching={searching}
                current={place.entry !== null && place.chapter === null}
                query={query}
                onToggle={() => setAppendixOpen((o) => !o)}
              />
            )}
          </ol>
        )}
      </div>
    </nav>
  );
}

/** The phone list's fifth row: the appendix, a disclosure like a chapter's, opened by a match. */
function AppendixListRow({
  appendix,
  rows,
  open,
  searching,
  current,
  query,
  onToggle,
}: {
  appendix: ContentsAppendix;
  rows: { id: string; title: string }[];
  open: boolean;
  searching: boolean;
  current: boolean;
  query: string;
  onToggle: () => void;
}) {
  const panel = `contents-entries-${appendix.id}`;
  const figure = searching ? String(rows.length) : howItWorksLinksCopy.groupCount(appendix.rows.length);
  return (
    <li className="border-t border-b border-solid border-t-[color:var(--border-strong)] border-b-[color:var(--border)]">
      <div className="flex items-stretch">
        <a
          href={`#${appendix.id}`}
          aria-current={current ? "true" : undefined}
          className="flex min-h-[44px] min-w-0 flex-1 items-center text-[14px] text-[color:var(--accent)]"
        >
          <span>{appendix.title}</span>
        </a>
        {searching ? (
          <span className="flex min-h-[44px] flex-none items-center font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {figure}
          </span>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? panel : undefined}
            aria-label={copy.toggle(appendix.title)}
            onClick={onToggle}
            className="flex min-h-[44px] min-w-[44px] flex-none items-center justify-end gap-[8px]"
          >
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{figure}</span>
            <span aria-hidden className={`${CHEVRON_CLASS} text-[color:var(--fg-faint)] ${open ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
        )}
      </div>
      {open && (
        <ol id={panel} className="list-none p-0 pb-[6px]">
          {rows.map((row) => (
            <li key={row.id}>
              <a
                data-entry-row=""
                href={`#${row.id}`}
                className="flex min-h-[44px] items-center pl-[26px] text-[13.5px] text-[color:var(--fg-body)]"
              >
                <span className="min-w-0 flex-1">
                  <Title title={row.title} query={query} />
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
