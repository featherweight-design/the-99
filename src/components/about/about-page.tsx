// The /about reference page.
//
// Every entry carries a figure: the app's own component, mounted with fixture
// props from `lib/about/fixtures.ts`. That is the handoff's unit — a figure
// with a caption — and `about.test.ts` holds the ledger of the ones still
// undrawn, which must shrink to empty.
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
import { KeyNumeral } from "./numeral";
import { ContentsList, ContentsRail } from "./contents-rail";
import { ContentsListR6, ContentsRailR6 } from "./contents-r6";
import { JumpMark } from "./jump-mark";
import { HowItWorks } from "./how-it-works";
import { howItWorksEnabled } from "../../lib/about/how-it-works-flag";
import { howItWorksRowsCopy, introWithAppendix } from "../../lib/copy/how-it-works";
import { entryRow, HOW_IT_WORKS_ID, howItWorksLinksCopy } from "../../lib/copy/how-it-works-links";
import { RecordVisit } from "./record-visit";
import { unseenEntries, visibleEntries, type SeenState } from "../../lib/about/visible";
import {
  ABOUT_VERSION,
  aboutCopy,
  type AboutChapter,
  type AboutEntry,
} from "../../lib/copy/about";
import { PendingReporter } from "../shell/pending-reporter";

const CHAPTERS: AboutChapter[] = ["01", "02", "03", "04"];

/**
 * An entry is new when the reader has seen a previous version of the page and
 * this entry was not in it. `seen > 0` is the rule rather than an edge case: a
 * reader at 0 has never been here, so marking every `since: 1` entry would
 * mark the whole page and teach them nothing.
 */
function isNewByVersion(entry: AboutEntry, seen: number): boolean {
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

/**
 * R6 §P0: the pill LEADS the title, and only visually. The sr-only half still
 * follows the title in the DOM, so a screen reader hears the name first and
 * "New in this version" after it, as it did before the move.
 */
function NewPill() {
  return (
    <span
      aria-hidden
      className="mr-[8px] inline-flex items-center rounded-[4px] px-[7px] py-[2px] align-middle font-mono text-[10px] font-semibold tracking-[0.08em]"
      style={{ background: "var(--accent)", color: "var(--bg)" }}
    >
      {aboutCopy.newBadge}
    </span>
  );
}

function Entry({
  entry,
  marked,
  sheetMode,
  howItWorks,
}: {
  entry: AboutEntry;
  marked: boolean;
  sheetMode: boolean;
  /** `HOW_IT_WORKS_ENABLED`: an entry the appendix explains links to its row. */
  howItWorks: boolean;
}) {
  const row = howItWorks ? entryRow[entry.id] : undefined;
  const Figure = FIGURES[entry.id];
  const inset = entry.width === "inset" && Figure;
  // R6 §P0: a new entry's top rule is 2px of accent at both widths, and on a
  // phone it is the only entry that carries a rule at all.
  const rule = !sheetMode
    ? "pt-[14px] min-[1000px]:border-t min-[1000px]:border-solid min-[1000px]:border-[color:var(--border)]"
    : marked
      ? // The 2px rule takes a pixel more than the 1px it replaces, so the padding
        // gives it back and a new entry's title sits level with the others.
        "scroll-mt-[20px] border-t-2 border-solid border-[color:var(--accent)] pt-[12px] min-[1000px]:pt-[13px]"
      : "scroll-mt-[20px] pt-[14px] min-[1000px]:border-t min-[1000px]:border-solid min-[1000px]:border-[color:var(--border)]";
  return (
    // No per-entry rule below the wide stop — a rule per entry turns a chapter
    // into a table. The chapter's own hairline stays at both widths.
    <li
      // The entry's own anchor. Chapters have had one since #673; entries had
      // none, so nothing could address a single entry — no deep link, and no
      // acceptance cell, because `contact-sheet.mjs` waits on a selector and an
      // entry below the fold offered nothing to wait for. Every feature ships an
      // entry, so every inventory hit that wall.
      //
      // NO SCROLL MARGIN with the sheet switch off. Under it (R6 §P1) the
      // margin is 20px, the drawn landing, set in `rule` above; the 80px below
      // is what that is not. The first version carried `scroll-mt-[80px]` on the
      // theory that the shell's header overlays the page. It does not:
      // `MobileHeader` is in flow (`shell/nav.tsx:303-308`), the desktop rail is
      // sticky on the LEFT, and the tab bar is fixed to the BOTTOM. Nothing sits
      // over the top of an entry at either width, so the margin bought nothing
      // and left an 80px gap above every anchor navigation.
      id={entry.id}
      className={rule}
    >
      {/* Title and route on ONE line, which is where the handoff puts them: the
          route is part of the entry's name — "Browse what you own /collection"
          — rather than a footnote under its keys. It wraps below the title on a
          phone instead of squeezing both. */}
      {/* R6 §P1: the jump mark washes THIS line, spilling into the gutter. The
          negative margin and matching padding are always on, so the wash does
          not move the text when it lands. */}
      <div
        data-entry-title={sheetMode ? "" : undefined}
        className={
          "flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]" +
          (sheetMode
            ? " -mx-[8px] rounded-[6px] px-[8px] data-[jumped]:bg-[color:var(--elevated)] min-[1000px]:-mx-[10px] min-[1000px]:px-[10px]"
            : "")
        }
      >
        <h3
          tabIndex={sheetMode ? -1 : undefined}
          className="font-display text-[15px] font-semibold text-[color:var(--fg)] focus:outline-none min-[1000px]:text-[15.5px]"
        >
          {sheetMode && marked && <NewPill />}
          {entry.title}
          {sheetMode && marked && <span className="sr-only"> {aboutCopy.newBadgeSr}</span>}
          {!sheetMode && marked && <NewMark />}
        </h3>
        <Link
          href={entry.route}
          className="font-mono text-[11px] text-[color:var(--accent)] hover:underline min-[1000px]:text-[11.5px]"
        >
          {entry.route}
          <PendingReporter href={entry.route} />
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
              <KeyNumeral n={i + 1} className="mt-[1px]" onFigure={false} />
              <span className="font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
                {key}
              </span>
            </li>
          ))}
        </ol>
      )}
      {/* The line to the appendix row that explains this entry, in the Analysis sheet opener's
          quiet tone. A plain hash link, so Back returns here. */}
      {row && (
        <div className="mt-[10px]">
          <a
            href={`#${row}`}
            data-entry-link=""
            className="inline-flex min-h-[44px] items-center gap-[8px] font-mono text-[10.5px] text-[color:var(--fg-faint)] md:min-h-0"
          >
            <span className="border-b border-dotted border-[color:var(--border-dashed)]">
              {howItWorksLinksCopy.entryLink}
            </span>
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      )}
    </li>
  );
}

/**
 * R6 §O: what is new since the reader was last here, as one list of links at
 * the top of the page. Titles and routes only (S1); every entry stays in its
 * chapter (H3), and a row is a hash link to it.
 */
function WhatsNewIndex({ entries }: { entries: AboutEntry[] }) {
  return (
    <nav
      aria-labelledby="whats-new-heading"
      className="mt-[22px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] pt-[12px] pb-[2px] min-[1000px]:px-[16px] min-[1000px]:pt-[14px] min-[1000px]:pb-[4px]"
    >
      <h2
        id="whats-new-heading"
        className="font-mono text-[11px] font-medium tracking-[0.08em] text-[color:var(--accent)]"
      >
        {aboutCopy.newSinceEyebrow(entries.length)}
      </h2>
      <ul className="mt-[8px] list-none p-0">
        {entries.map((e) => (
          <li key={e.id} className="border-t border-solid border-[color:var(--border)]">
            {/* The whole row is one link, so the route is text rather than a
                second link nested inside it. */}
            <a
              href={`#${e.id}`}
              className="flex min-h-[48px] flex-col justify-center gap-[2px] py-[6px] hover:underline min-[1000px]:min-h-[40px] min-[1000px]:flex-row min-[1000px]:items-baseline min-[1000px]:justify-start min-[1000px]:gap-[12px]"
            >
              <span className="text-[14.5px] font-medium text-[color:var(--fg)]">{e.title}</span>
              <span className="font-mono text-[11.5px] text-[color:var(--accent)]">{e.route}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AboutPage({
  seen,
  seenIds = [],
  next,
  sheetMode = false,
}: {
  seen: number;
  /** The switched entries this reader has already met, by id (`user_prefs.about_seen_ids`). */
  seenIds?: readonly string[];
  next?: string;
  /**
   * `ABOUT_SHEET_ENABLED` (About R6): no redirect reaches this page, so it
   * opens on the what's-new index, records the visit itself, and has no
   * dismiss. Off, the page renders exactly as it did.
   */
  sheetMode?: boolean;
}) {
  // Only the entries this deployment draws: one tied to a switch that is off is not on the page.
  const visible = visibleEntries();
  // "How the app reaches its answers" (plan 2026-09-28): its section, its clause in the intro,
  // and the jump mark its rows share with the entries. Off, the page is exactly as it was.
  const howItWorks = howItWorksEnabled();
  // With the sheet, "new" is the one rule the sheet and the proxy read, so the page marks exactly
  // what the sheet announced. Without it the page keeps the version rule it always had.
  const seenState: SeenState = { version: seen, ids: seenIds };
  const unseen = new Set(unseenEntries(visible, seenState).map((e) => e.id));
  const isNew = (entry: AboutEntry): boolean =>
    sheetMode ? unseen.has(entry.id) : isNewByVersion(entry, seen);
  const behind = seen < ABOUT_VERSION || (sheetMode && unseen.size > 0);
  const newCount = visible.filter((e) => isNew(e)).length;
  // Validated here as well as in the action: the page PRINTS the destination,
  // and printing an unvalidated value is its own small problem.
  const destination = safeNext(next);
  /**
   * The reader was SENT here, rather than coming to look.
   *
   * The gate redirects with `?next=<where they were going>` (`gate.ts`), and
   * nothing else puts that parameter on this URL — the account menu links to
   * a bare `/about`. So its presence is the difference between "we interrupted
   * you" and "you opened the reference", and only the first is owed a way
   * back: a reader who came to read has a nav rail and a back button, and a
   * button reading `Got it — takes you home` would send them somewhere they
   * never asked to go.
   *
   * `behind` is still required. Dismissing writes the version, and a reader
   * who is current has nothing to acknowledge.
   */
  const redirected = typeof next === "string" && next.length > 0;
  const offerDismiss = !sheetMode && behind && redirected;
  const newEntries = visible.filter((e) => isNew(e));
  // Counted here, where `seen` is known — the rail is a client component and
  // has no business reading the reader's acknowledged version.
  const railChapters = CHAPTERS.map((n) => {
    const entries = visible.filter((e) => e.chapter === n);
    return {
      id: n,
      title: aboutCopy.chapters[n].title,
      count: entries.length,
      newCount: entries.filter((e) => isNew(e)).length,
    };
  });
  // R6: the same chapters, carrying their entries for the entry-level contents.
  const contentsChapters = railChapters.map((c) => ({
    ...c,
    entries: visible
      .filter((e) => e.chapter === c.id)
      .map((e) => ({ id: e.id, title: e.title, isNew: isNew(e) })),
  }));
  // The appendix's group in the contents, only while its switch is on. Titles only: the rail is a
  // client component, and the rows' prose stays on the server.
  const contentsAppendix = howItWorks
    ? {
        id: HOW_IT_WORKS_ID,
        title: howItWorksLinksCopy.group,
        rows: howItWorksRowsCopy.rows.map((r) => ({ id: r.id, title: r.title })),
      }
    : undefined;
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
    // links, because at 390px a 216px rail is more than half the screen.
    // `justify-center` matters below the wide stop, where the rail is
    // `display:none`: without it the article sits at flex-start inside a
    // 1060px container and a 1000px window leaves ~200px of dead space on the
    // right, where the page used to be centred by its own `mx-auto`.
    //
    // The container is 1088 rather than 1060 so the reading column can actually
    // reach its 760 cap: 1088 − 68 padding − 216 rail − 40 gap = 764, four to
    // spare. At 1060 the cap was unreachable and the column silently topped out
    // at 732. The rail was 220px when this was written, which made the sum
    // exactly 760 — the arithmetic has to be re-done when either number moves,
    // and it did.
    <div className="mx-auto flex w-full max-w-[1088px] items-start justify-center gap-[40px] px-[16px] py-[20px] min-[1000px]:px-[34px] min-[1000px]:py-[28px]">
      <article className="min-w-0 max-w-[760px] flex-1">
      {/* The eyebrow exists ONLY when the reader is behind: it is the reason
          they are looking at this page instead of the one they asked for, so
          it is a count and not an apology. */}
      {!sheetMode && behind && newCount > 0 && (
        <p className="mb-[6px] font-mono text-[11px]">
          {aboutCopy.newSinceEyebrow(newCount)}
        </p>
      )}

      <h1 className="font-display text-[23px] leading-[1.2] font-bold text-[color:var(--fg)] min-[1000px]:text-[29px]">
        {aboutCopy.pageTitle}
      </h1>
      <p className="mt-[10px] text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)]">
        {howItWorks ? introWithAppendix(aboutCopy.pageIntro) : aboutCopy.pageIntro}
        {sheetMode && ` ${aboutCopy.pageIntroSheet}`}
      </p>

      {sheetMode && newEntries.length > 0 && <WhatsNewIndex entries={newEntries} />}
      {/* The appendix is recorded by the same visit, and a reader current on every entry who has
          not seen it still owes the write. Not `behind`: nothing about the appendix is NEW. */}
      {sheetMode && (
        <RecordVisit behind={behind || (howItWorks && !seenIds.includes(HOW_IT_WORKS_ID))} />
      )}
      {(sheetMode || howItWorks) && <JumpMark />}

      {sheetMode ? (
        <ContentsListR6 chapters={contentsChapters} appendix={contentsAppendix} />
      ) : (
        <ContentsList chapters={railChapters} />
      )}

      {CHAPTERS.map((n) => (
        <section
          key={n}
          id={`chapter-${n}`}
          className="mt-[28px] border-t border-solid border-[color:var(--border)] pt-[18px] scroll-mt-[20px]"
        >
          <h2 className="font-display text-[16px] font-bold text-[color:var(--fg)] min-[1000px]:text-[21px]">
            <span className="font-mono text-[12px]">
              {n}
            </span>{" "}
            {aboutCopy.chapters[n].title}
          </h2>
          <p className="mt-[4px] text-[13px] text-[color:var(--fg-muted)]">
            {aboutCopy.chapters[n].sub}
          </p>

          <ul className="mt-[14px] list-none space-y-[14px] p-0">
            {visible
              .filter((e) => e.chapter === n)
              .map((entry) => (
                <Entry
                  key={entry.id}
                  entry={entry}
                  marked={isNew(entry)}
                  sheetMode={sheetMode}
                  howItWorks={howItWorks}
                />
              ))}
          </ul>
        </section>
      ))}

      {howItWorks && <HowItWorks entries={visible} />}

      {/* The pinned bar's own height, given back to the document.
          `<main>` reserves `--tabbar-h` and nothing more, so the bar sat ON
          the last entry: at 390px the final key line of `themes` was behind
          it, readable only by a reader who knew to keep scrolling into a
          control. 67px is the bar's composition — 10 top, a 44px control, 12
          bottom, and its 1px rule — and it is spelled out here rather than
          left as a number so a change to any of those has somewhere to land.

          A spacer rather than padding on the article: the article is shared
          with the desktop layout, where this bar does not exist. */}
      {offerDismiss && <div aria-hidden className="h-[67px] min-[1000px]:hidden" />}

      {/* THE PHONE'S DISMISS. Pinned to the foot of the viewport rather than
          to the foot of the document: a reader who opened this page because a
          new feature landed should not have to scroll thirty-five entries to
          leave it. The rail carries the desktop copy — see `ContentsRail` —
          and this one is hidden from the wide stop up, so exactly one is in
          the document at any width and the control is announced once.

          `--tabbar-h` is the shell's own reserved strip at this width, so the
          bar sits ON it rather than over the tab bar's targets. */}
      {offerDismiss && (
        <form
          action={dismissAbout}
          className="fixed inset-x-0 z-30 border-t border-solid border-[color:var(--border)] bg-[color:var(--bg)] px-[16px] pt-[10px] pb-[12px] min-[1000px]:hidden"
          style={{ bottom: "var(--tabbar-h)" }}
        >
          <input type="hidden" name="next" value={destination} />
          <PrimaryButton
            type="submit"
            className="min-h-[44px] w-full px-[18px]"
            aria-label={`${aboutCopy.dismiss} — ${destinationClause}`}
          >
            {aboutCopy.dismiss}
          </PrimaryButton>
        </form>
      )}
      </article>

      {sheetMode ? (
        <ContentsRailR6 chapters={contentsChapters} appendix={contentsAppendix} />
      ) : (
        <ContentsRail
          chapters={railChapters}
          dismiss={
            offerDismiss
              ? { action: dismissAbout, destination, clause: destinationClause }
              : null
          }
        />
      )}
    </div>
  );
}
