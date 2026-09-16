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
import { ContentsRail } from "./contents-rail";
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
  const inset = entry.width === "inset" && Figure;
  return (
    // No per-entry rule below the wide stop — a rule per entry turns a chapter
    // into a table. The chapter's own hairline stays at both widths.
    <li className="pt-[14px] min-[1000px]:border-t min-[1000px]:border-solid min-[1000px]:border-[color:var(--border)]">
      {/* Title and route on ONE line, which is where the handoff puts them: the
          route is part of the entry's name — "Browse what you own /collection"
          — rather than a footnote under its keys. It wraps below the title on a
          phone instead of squeezing both. */}
      <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <h3 className="font-display text-[15px] text-[color:var(--fg)] min-[1000px]:text-[16px]">
          {entry.title}
          {marked && <NewMark />}
        </h3>
        <Link
          href={entry.route}
          className="font-mono text-[11px] text-[color:var(--accent)] hover:underline"
        >
          {entry.route}
        </Link>
        {entry.opens && (
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{entry.opens}</span>
        )}
      </div>

      {inset ? (
        <div className="mt-[6px] flex flex-col gap-[10px] min-[1000px]:flex-row min-[1000px]:items-start min-[1000px]:gap-[20px]">
          <div className="order-2 min-w-0 flex-1 min-[1000px]:order-2">
            <p className="text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {entry.caption}
            </p>
          </div>
          <div className="order-1 min-[1000px]:order-1 min-[1000px]:w-[300px] min-[1000px]:flex-none">
            <Figure width={entry.width} />
          </div>
        </div>
      ) : (
        <p className="mt-[6px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
          {entry.caption}
        </p>
      )}

      {Figure && !inset && <Figure width={entry.width} />}

      {/* NUMBERED keys. "Annotation is a numeral and a line" is the handoff's
          grammar, and the lines shipped without the numerals — which is the
          half that ties a line to the part of the figure it describes. The
          numeral is drawn here whether or not the figure carries its twin yet;
          an entry with no figure still reads as an ordered key rather than a
          loose stack of mono sentences. */}
      {entry.keys.length > 0 && (
        <ol className="mt-[8px] list-none space-y-[5px] p-0">
          {entry.keys.map((key, i) => (
            <li key={key} className="flex items-start gap-[8px]">
              <span
                aria-hidden
                className="mt-[1px] flex h-[14px] w-[14px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] font-mono text-[9px] text-[color:var(--accent)]"
              >
                {i + 1}
              </span>
              <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)]">
                {key}
              </span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

export function AboutPage({ seen, next }: { seen: number; next?: string }) {
  const behind = seen < ABOUT_VERSION;
  const newCount = aboutEntries.filter((e) => isNew(e, seen)).length;
  // Validated here as well as in the action: the page PRINTS the destination,
  // and printing an unvalidated value is its own small problem.
  const destination = safeNext(next);
  // Counted here, where `seen` is known — the rail is a client component and
  // has no business reading the reader's acknowledged version.
  const newPerChapter = Object.fromEntries(
    CHAPTERS.map((n) => [n, aboutEntries.filter((e) => e.chapter === n && isNew(e, seen)).length]),
  );
  const destinationClause =
    destination === "/"
      ? aboutCopy.dismissDestinationHome
      : aboutCopy.dismissDestination(destination);

  return (
    // Not a <main>: the shell already opens one (shell.tsx:43) and /about
    // always renders inside it, so a second would give the document two main
    // landmarks and leave a screen reader with no single "skip to content".
    // Two columns from the wide stop: the reading column, and the rail beside
    // it. Below it the rail is gone and the in-flow list carries the same four
    // links, because at 390px a 220px rail is a third of the screen.
    <div className="mx-auto flex w-full max-w-[1060px] items-start gap-[40px] px-[16px] py-[20px] min-[1000px]:px-[34px] min-[1000px]:py-[28px]">
      <article className="min-w-0 flex-1 max-w-[760px]">
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

      {/* IN FLOW at compact width only. Above the wide stop the same list is
          the sticky rail beside the column — see `AboutPage`. The rail was
          declined twice on the strength of Design's own cost note offering it
          as a cut; that was a call about the reader's experience taken from a
          note about effort, and thirty-four entries over nine screens is
          exactly the page that needs to say where you are. */}
      <nav
        aria-label={aboutCopy.contentsLabel}
        className="mt-[18px] min-[1000px]:hidden"
      >
        <p className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {aboutCopy.contentsLabel}
        </p>
        <ol className="mt-[6px] list-none p-0">
          {CHAPTERS.map((n) => {
            const entries = aboutEntries.filter((e) => e.chapter === n);
            const chapterNew = entries.filter((e) => isNew(e, seen)).length;
            return (
              <li key={n}>
                <a
                  href={`#chapter-${n}`}
                  className="flex min-h-[44px] items-center justify-between gap-[12px] border-b border-solid border-[color:var(--border)] text-[14px] text-[color:var(--accent)]"
                >
                  <span>
                    <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{n}</span>{" "}
                    {aboutCopy.chapters[n].title}
                  </span>
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
        <section
          key={n}
          id={`chapter-${n}`}
          className="mt-[28px] border-t border-solid border-[color:var(--border)] pt-[18px] scroll-mt-[20px]"
        >
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

      <ContentsRail chapters={CHAPTERS} newPerChapter={newPerChapter} />
    </div>
  );
}
