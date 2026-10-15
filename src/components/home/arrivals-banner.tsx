"use client";

// The arrivals banner (upcoming precons, plan PR 3): handoff `design/design_handoff_the99_upcoming_precons/`,
// frames `R1 - Home-Banner`, STATES H1–H8 and rules 5–8, design table `design-tables/upcoming-precons.md`
// (`ArrivalsBanner`). In Home's flow between the header and Ready to build: never fixed, no modal, no focus grab,
// no scroll lock and no live region. The server draws it, so it is in the document when the page loads, and a
// screen reader meets it in reading order and by landmark (a labelled `<section>`).
//
// About's line (About on the banner, plan `2026-10-15-about-on-the-banner.md` PR A; `R2 - Home-About`, A1–A3):
// with `ABOUT_SHEET_ENABLED` on, About's notice is a line here instead of the one-time sheet. Drawn first: alone it
// takes the one-line shape (A1, or A3 for a first-run reader), and beside arrivals the band takes the heading
// `New in the app` with each line carrying its own link (A2). One ✕ dismisses both halves. On the first-run
// checklist the band draws About's line alone, with no ✕ (`closable={false}`): the checklist is itself the
// first-run surface.

import Link from "next/link";
import { useEffect, useState } from "react";

import { dismissArrivals } from "../../app/arrivals-actions";
import type { AboutLine } from "../../lib/about/notice";
import { arrivalsCopy as copy } from "../../lib/copy/arrivals";
import type { ArrivalsBannerData, BannerLine } from "../../lib/precons/banner";
import { sheetTitles } from "../shell/about-sheet";
import { aboutAcknowledged, arrivalsAcknowledged } from "./arrivals-seen";
import { PendingReporter } from "../shell/pending-reporter";

/** Home's `<h1>`, where focus goes once ✕ has closed the banner (H8). */
export const HOME_HEADING_ID = "home-heading";
/** Where About's Show me goes. The page records the visit itself (`RecordVisit`). */
export const ABOUT_HREF = "/about";
/** The close: a height collapse this long, instant under reduced motion. */
export const COLLAPSE_MS = 160;

/**
 * The banners dismissed by ✕ in this document, by their keys. ✕ writes the seen state and the next load draws
 * nothing, but a client navigation back to Home (Back included) re-mounts the payload the router already holds, so
 * the press records the banner here and that re-mount stays closed. A ✕ whose write fails takes its entry back out.
 * A Precons visit that acknowledged the arrivals is the other way a re-mount stays closed (`arrivals-seen.ts`).
 * Only ever written by a press, so the server's copy of the module stays empty.
 */
const dismissed = new Set<string>();

const RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
const LINK =
  "text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px] " +
  "hover:decoration-[color:var(--fg)] rounded-[3px] " + RING;
const CLOSE =
  "flex flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[color:var(--fg-faint)] " +
  "hover:text-[color:var(--fg)] rounded-[6px] " + RING;
/** One line of the A2 band. */
const LINE =
  "border-t border-solid border-[color:var(--border)] py-[9px] text-[14px] leading-[1.5] text-[color:var(--fg-body)] sm:py-[8px] sm:text-[13.5px]";
const SHELL =
  "box-border rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)]";

/** The sheet's mark, at 22 with a 7px diamond. */
function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`box-border flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] ${className}`}
      style={{
        background: "color-mix(in srgb, var(--accent) 16%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
      }}
    >
      <span className="h-[7px] w-[7px] rotate-45 bg-[color:var(--accent)]" />
    </span>
  );
}

/** One arrival: the set's name in `--fg`, then the rest of its sentence. */
function Sentence({ line }: { line: BannerLine }) {
  return (
    <>
      <span className="text-[color:var(--fg)]">{line.name}</span>
      {line.kind === "set" ? copy.announced(line.revealed) : copy.listed(line.count)}
    </>
  );
}

/** About's line: the lead in `--fg`, then the titles (A1, A2) or the first-run sentence (A3). */
function AboutSentence({ line }: { line: AboutLine }) {
  if (line.kind === "firstRun") {
    return (
      <>
        <span className="text-[color:var(--fg)]">{copy.aboutFirstRunLead}</span>
        {copy.aboutFirstRunRest}
      </>
    );
  }
  const { shown, more } = sheetTitles(line.titles.length);
  return (
    <>
      <span className="text-[color:var(--fg)]">{copy.aboutLead(line.titles.length)}</span>
      {copy.aboutRest(line.titles, shown, more)}
    </>
  );
}

function CloseButton({ onClose, className }: { onClose: () => void; className: string }) {
  return (
    <button type="button" aria-label={copy.dismiss} onClick={onClose} className={`${CLOSE} ${className}`}>
      <span aria-hidden="true">✕</span>
    </button>
  );
}

export function ArrivalsBanner({
  data,
  about = null,
  closable = true,
}: {
  /** The arrivals, or null when only About has something to say. */
  data: ArrivalsBannerData | null;
  /** About's line, or null. */
  about?: AboutLine | null;
  /** False on the first-run checklist: About's line alone, with no ✕. */
  closable?: boolean;
}) {
  const keys = data?.keys ?? [];
  const aboutIds = about?.ids ?? [];
  const id = [...keys, ...aboutIds.map((a) => `about:${a}`)].join(" ");
  // Each half on its own: a Precons visit answers the arrivals, a `/about` visit answers About's line, and either
  // leaves the other half standing.
  const arrivals = data && data.lines.length > 0 && !arrivalsAcknowledged(data.keys) ? data : null;
  const aboutShown = about && !aboutAcknowledged(about.ids) ? about : null;
  const [phase, setPhase] = useState<"open" | "closing" | "gone">(() => (dismissed.has(id) ? "gone" : "open"));

  useEffect(() => {
    if (phase !== "closing") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => {
      setPhase("gone");
      document.getElementById(HOME_HEADING_ID)?.focus();
    }, reduce ? 0 : COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "gone" || (!arrivals && !aboutShown)) return null;

  const close = () => {
    dismissed.add(id);
    setPhase("closing");
    // The banner closes on the press; a write that fails leaves both halves unseen, so the next load shows them
    // again (rule 6), and a re-mount in this document draws it again too.
    void dismissArrivals(arrivals?.keys ?? [], aboutShown?.ids ?? []).catch(() => {
      dismissed.delete(id);
    });
  };

  const closing = phase === "closing";
  // One line: About's alone (A1, A3), or one arrival alone (H2, H3). Two halves take the heading (A2).
  const single: "about" | "arrival" | null = aboutShown
    ? arrivals ? null : "about"
    : arrivals && arrivals.lines.length === 1 ? "arrival" : null;
  const lines = arrivals?.lines ?? [];
  const { shown, more } = sheetTitles(lines.length);
  const closeButton = (className: string) => (closable ? <CloseButton onClose={close} className={className} /> : null);

  return (
    // The collapse: one grid row from its height to none. `overflow-hidden` only while closing, so a focus ring
    // at the band's edge is never clipped while it is open.
    <div
      data-arrivals-banner={phase}
      className={
        "grid transition-[grid-template-rows] duration-[160ms] ease-out motion-reduce:transition-none " +
        (closing ? "grid-rows-[0fr]" : "grid-rows-[1fr]")
      }
    >
      <div className={`min-h-0 ${closing ? "overflow-hidden" : ""}`} inert={closing}>
        {single ? (
          <section
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] flex items-start gap-[10px] py-[10px] pl-[14px] ` +
              "sm:mx-[26px] sm:mt-[18px] sm:min-h-[46px] sm:items-center sm:gap-[12px] sm:py-[7px] " +
              (closable ? "pr-[4px] sm:pr-[8px]" : "pr-[14px]")
            }
          >
            <Mark className="mt-[2px] sm:mt-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-[4px] pt-[2px] sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-[14px] sm:gap-y-[2px] sm:pt-0">
              <p className="m-0 text-[14px] leading-[1.45] text-[color:var(--fg-body)]">
                {single === "about" && aboutShown ? <AboutSentence line={aboutShown} /> : <Sentence line={lines[0]!} />}
              </p>
              {single === "about" ? (
                <Link
                  href={ABOUT_HREF}
                  data-about-link
                  className={`${LINK} min-h-[24px] self-start text-[14px] leading-[1.45] sm:min-h-0 sm:self-auto sm:text-[13.5px]`}
                >
                  {copy.aboutShow}
                  <PendingReporter href={ABOUT_HREF} />
                </Link>
              ) : (
                <Link
                  href={arrivals!.href}
                  className={`${LINK} min-h-[24px] self-start text-[14px] leading-[1.45] sm:min-h-0 sm:self-auto sm:text-[13.5px]`}
                >
                  {lines[0]!.kind === "set" ? copy.seeOne : copy.seeMany}
                  <PendingReporter href={arrivals!.href} />
                </Link>
              )}
            </div>
            {closeButton("-mt-[8px] h-[44px] w-[44px] text-[14px] sm:mt-0 sm:h-[32px] sm:w-[32px] sm:text-[13px]")}
          </section>
        ) : aboutShown && arrivals ? (
          // About and arrivals (A2): the heading `New in the app` and ✕ on one row, then one line each, About's
          // first, each with its own link. Several arrivals keep `sheetTitles`' cap, and their one Precons link
          // closes the last of their lines.
          <section
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] flex flex-col pt-[2px] pr-[4px] pb-[6px] pl-[14px] ` +
              "sm:mx-[26px] sm:mt-[18px] sm:pt-[6px] sm:pr-[8px]"
            }
          >
            <div className="flex items-center gap-[10px]">
              <Mark />
              <h2 className="m-0 min-w-0 flex-1 text-[14.5px] leading-[1.4] font-semibold text-[color:var(--fg)]">
                {copy.regionLabel}
              </h2>
              {closeButton("h-[44px] w-[44px] text-[14px] sm:h-[32px] sm:w-[32px] sm:text-[13px]")}
            </div>
            <ul className="m-0 mr-[10px] ml-[32px] list-none p-0 sm:mt-[2px] sm:mr-0">
              <li className={LINE}>
                <AboutSentence line={aboutShown} />{" "}
                <Link href={ABOUT_HREF} data-about-link className={`${LINK} whitespace-nowrap`}>
                  {copy.aboutShow}
                  <PendingReporter href={ABOUT_HREF} />
                </Link>
              </li>
              {lines.slice(0, shown).map((l, i) => (
                <li key={`${l.kind}:${l.code}`} className={LINE}>
                  <Sentence line={l} />
                  {i === lines.length - 1 && (
                    <>
                      {" "}
                      <Link href={arrivals.href} className={`${LINK} whitespace-nowrap`}>
                        {l.kind === "set" ? copy.seeOne : copy.seeMany}
                        <PendingReporter href={arrivals.href} />
                      </Link>
                    </>
                  )}
                </li>
              ))}
              {more > 0 && (
                <li className={LINE}>
                  <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.more(more)}</span>{" "}
                  <Link href={arrivals.href} className={`${LINK} whitespace-nowrap`}>
                    {copy.seeMany}
                    <PendingReporter href={arrivals.href} />
                  </Link>
                </li>
              )}
            </ul>
          </section>
        ) : (
          // Several arrivals: the count heading, the lines under `sheetTitles`' cap, one link and one ✕ for all. Placed
          // on a grid so the DOM reads heading, lines, link, ✕ (Tab: the link, then ✕) while the link sits on the
          // heading line at desktop and on its own 44px line last at 390.
          <section
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[10px] pt-[6px] pr-[4px] pb-[4px] pl-[14px] ` +
              "sm:mx-[26px] sm:mt-[18px] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-[10px] sm:pt-[7px] sm:pr-[8px] sm:pb-[6px]"
            }
          >
            <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-[10px]">
              <Mark />
              <h2 className="m-0 min-w-0 flex-1 text-[14.5px] leading-[1.4] font-semibold text-[color:var(--fg)]">
                {copy.heading(lines.length)}
              </h2>
            </div>
            <ul
              className={
                "col-span-2 row-start-2 m-0 mt-[2px] mr-[10px] ml-[32px] list-none p-0 " +
                "sm:col-span-3 sm:mt-[4px] sm:mr-0 sm:grid sm:grid-cols-2 sm:gap-x-[28px]"
              }
            >
              {lines.slice(0, shown).map((l) => (
                <li
                  key={`${l.kind}:${l.code}`}
                  className="border-t border-solid border-[color:var(--border)] py-[8px] text-[14px] leading-[1.4] text-[color:var(--fg-body)] sm:text-[13.5px]"
                >
                  <Sentence line={l} />
                </li>
              ))}
              {more > 0 && (
                <li className="border-t border-solid border-[color:var(--border)] py-[8px] font-mono text-[11px] leading-[1.4] text-[color:var(--fg-muted)]">
                  {copy.more(more)}
                </li>
              )}
            </ul>
            <Link
              href={arrivals!.href}
              className={
                `${LINK} col-span-2 row-start-3 flex min-h-[44px] items-center justify-self-start pl-[32px] text-[14px] ` +
                "sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:min-h-0 sm:pl-0 sm:text-[13.5px]"
              }
            >
              {copy.seeMany}
              <PendingReporter href={arrivals!.href} />
            </Link>
            {closeButton(
              "col-start-2 row-start-1 -mt-[8px] h-[44px] w-[44px] text-[14px] sm:col-start-3 sm:mt-0 sm:h-[32px] sm:w-[32px] sm:text-[13px]",
            )}
          </section>
        )}
      </div>
    </div>
  );
}
