// The /about reference page.
//
// An entry whose subject is a MARK carries a figure: the app's own component,
// mounted with fixture props from `lib/about/fixtures.ts`. An entry whose
// subject is a workflow carries its words, which is a finished answer —
// `FIGURES` is a partial map on purpose.
//
// Copy: src/lib/copy/about.ts. Handoff: design/design_handoff_the99_about/
// (R4 canvas §3 for the page, §4 for the behind and current readers).
//
// A server component, and it has to be: the acknowledged version decides what
// is marked and whether the dismiss draws at all, and neither is a reading
// preference a client should be guessing at before hydration.

import Link from "next/link";
import { PrimaryButton } from "../ui/button";
import { dismissAbout } from "../../app/about/actions";
import { safeNext } from "../../lib/about/gate";
import { FIGURES } from "./figures";
import {
  ABOUT_VERSION,
  aboutCopy,
  aboutEntries,
  type AboutChapter,
  type AboutEntry,
} from "../../lib/copy/about";

const CHAPTERS: AboutChapter[] = ["01", "02", "03", "04"];

/**
 * An entry is new when the reader has seen a previous version of the page and
 * this entry was not in it. `seen > 0` is the rule rather than an edge case: a
 * reader at 0 has never been here, so marking every `since: 1` entry would
 * mark the whole page and teach them nothing.
 */
function isNew(entry: AboutEntry, seen: number): boolean {
  return seen > 0 && entry.since > seen;
}

function NewMark() {
  return (
    <span
      className="ml-[8px] inline-flex items-center rounded-[4px] px-[6px] py-[1px] align-middle font-mono text-[9.5px] font-semibold tracking-[0.08em]"
      style={{ background: "var(--accent)", color: "var(--bg)" }}
    >
      <span aria-hidden>{aboutCopy.newBadge}</span>
      <span className="sr-only">{aboutCopy.newBadgeSr}</span>
    </span>
  );
}

function Entry({ entry, marked }: { entry: AboutEntry; marked: boolean }) {
  const Figure = FIGURES[entry.id];
  return (
    // No per-entry rule below `min-[1000px]:`: the chapter hairline is the only one the
    // compact state draws, and a rule per entry turned a chapter into a table.
    <li className="pt-[14px] min-[1000px]:border-t min-[1000px]:border-solid min-[1000px]:border-[color:var(--border)]">
      <h3 className="font-display text-[15px] min-[1000px]:text-[16px]" style={{ color: "var(--fg)" }}>
        {entry.title}
        {marked && <NewMark />}
      </h3>

      <p className="mt-[6px] text-[13.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
        {entry.caption}
      </p>

      {Figure && <Figure width={entry.width} />}

      {entry.keys.length > 0 && (
        <ul className="mt-[8px] list-none space-y-[4px] p-0">
          {entry.keys.map((key) => (
            <li
              key={key}
              className="font-mono text-[11px] leading-[1.5]"
              style={{ color: "var(--fg-faint)" }}
            >
              {key}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-[8px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
        <Link href={entry.route} className="text-[color:var(--accent)] underline">
          {entry.route}
        </Link>
        {entry.opens ? ` · ${entry.opens}` : ""}
      </p>
    </li>
  );
}

export function AboutPage({ seen, next }: { seen: number; next?: string }) {
  const behind = seen < ABOUT_VERSION;
  const newCount = aboutEntries.filter((e) => isNew(e, seen)).length;
  // Validated here as well as in the action: the page PRINTS the destination,
  // and printing an unvalidated value is its own small problem.
  const destination = safeNext(next);
  const destinationClause =
    destination === "/"
      ? aboutCopy.dismissDestinationHome
      : aboutCopy.dismissDestination(destination);

  return (
    // Not a <main>: the shell already opens one (shell.tsx:43) and /about
    // always renders inside it, so a second would give the document two main
    // landmarks and leave a screen reader with no single "skip to content".
    <article className="mx-auto w-full max-w-[760px] px-[16px] py-[20px] min-[1000px]:px-[34px] min-[1000px]:py-[28px]">
      {/* The eyebrow exists ONLY when the reader is behind: it is the reason
          they are looking at this page instead of the one they asked for, so
          it is a count and not an apology. */}
      {behind && newCount > 0 && (
        <p className="mb-[6px] font-mono text-[11px]" style={{ color: "var(--accent)" }}>
          {aboutCopy.newSinceEyebrow(newCount)}
        </p>
      )}

      <h1 className="font-display text-[24px] min-[1000px]:text-[30px]" style={{ color: "var(--fg)" }}>
        {aboutCopy.pageTitle}
      </h1>
      <p className="mt-[6px] text-[13.5px] leading-[1.55]" style={{ color: "var(--fg-muted)" }}>
        {aboutCopy.pageIntro}
      </p>

      <nav aria-label={aboutCopy.contentsLabel} className="mt-[18px]">
        <p className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {aboutCopy.contentsLabel}
        </p>
        {/* In flow at BOTH widths. The handoff drew a 216px sticky rail on
            desktop and then cut it in its own readiness note, unchanged from
            R2 through R4: it is the only behaviour in the design and the only
            thing on the page a pointer can touch, and the in-flow list is
            complete without it. */}
        <ol className="mt-[6px] list-none p-0">
          {CHAPTERS.map((n) => {
            const entries = aboutEntries.filter((e) => e.chapter === n);
            const chapterNew = entries.filter((e) => isNew(e, seen)).length;
            return (
              <li key={n}>
                {/* 44px at every width. A contents row is one of four things a
                    thumb aims at on this page, and the other three are links
                    inside running prose. */}
                <a
                  href={`#chapter-${n}`}
                  className="flex min-h-[44px] items-center justify-between gap-[12px] border-b border-solid border-[color:var(--border)] text-[14px] text-[color:var(--accent)] min-[1000px]:min-h-0 min-[1000px]:border-0 min-[1000px]:py-[3px] min-[1000px]:text-[13px]"
                >
                  <span>
                    <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{n}</span>{" "}
                    {aboutCopy.chapters[n].title}
                  </span>
                  {/* A figure either way: `N new` when there is something new
                      in the chapter, the entry count otherwise. A row that
                      carried a count only when something was new would be
                      blank for every reader at launch. */}
                  <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                    {chapterNew > 0
                      ? aboutCopy.newInChapter(chapterNew)
                      : aboutCopy.entriesInChapter(entries.length)}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {CHAPTERS.map((n) => (
        <section key={n} id={`chapter-${n}`} className="mt-[28px] scroll-mt-[20px]">
          <h2 className="font-display text-[19px] min-[1000px]:text-[21px]" style={{ color: "var(--fg)" }}>
            <span className="font-mono text-[12px]" style={{ color: "var(--fg-faint)" }}>
              {n}
            </span>{" "}
            {aboutCopy.chapters[n].title}
          </h2>
          <p className="mt-[4px] text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {aboutCopy.chapters[n].sub}
          </p>

          <ul className="mt-[14px] list-none space-y-[14px] p-0">
            {aboutEntries
              .filter((e) => e.chapter === n)
              .map((entry) => (
                <Entry key={entry.id} entry={entry} marked={isNew(entry, seen)} />
              ))}
          </ul>
        </section>
      ))}

      {/* The dismiss draws only when there is something to acknowledge. A
          reader who reached this page from the account menu while current has
          nothing to press, and a control that wrote a version they already had
          would be a button with no effect. */}
      {behind && (
        <form
          action={dismissAbout}
          // Stacked and full width on a phone, inline above it. The clause is
          // a sentence, and at 390px it and a button do not share a line
          // without one of them being cut.
          className="mt-[32px] flex flex-col items-stretch gap-[10px] min-[1000px]:flex-row min-[1000px]:items-center min-[1000px]:gap-[12px]"
        >
          <input type="hidden" name="next" value={destination} />
          {/* The destination rides in the accessible name as well as beside
              the button: the clause is a sibling, so a screen-reader user
              pressing `Got it` would otherwise be told nothing about where
              they are about to land. */}
          <PrimaryButton
            type="submit"
            className="min-h-[44px] w-full min-[1000px]:w-auto"
            aria-label={`${aboutCopy.dismiss} — ${destinationClause}`}
          >
            {aboutCopy.dismiss}
          </PrimaryButton>
          <span className="text-center font-mono text-[11px] text-[color:var(--fg-faint)] min-[1000px]:text-left">
            {destinationClause}
          </span>
        </form>
      )}
    </article>
  );
}
