"use client";

// The arrivals banner (upcoming precons, plan PR 3): handoff `design/design_handoff_the99_upcoming_precons/`,
// frames `R1 - Home-Banner`, STATES H1–H8 and rules 5–8, design table `design-tables/upcoming-precons.md`
// (`ArrivalsBanner`). In Home's flow between the header and Ready to build: never fixed, no modal, no focus grab,
// no scroll lock and no live region. The server draws it, so it is in the document when the page loads, and a
// screen reader meets it in reading order and by landmark (a labelled `<section>`).

import Link from "next/link";
import { useEffect, useState } from "react";

import { dismissArrivals } from "../../app/arrivals-actions";
import { arrivalsCopy as copy } from "../../lib/copy/arrivals";
import type { ArrivalsBannerData, BannerLine } from "../../lib/precons/banner";
import { sheetTitles } from "../shell/about-sheet";
import { PendingReporter } from "../shell/pending-reporter";

/** Home's `<h1>`, where focus goes once ✕ has closed the banner (H8). */
export const HOME_HEADING_ID = "home-heading";
/** The close: a height collapse this long, instant under reduced motion. */
export const COLLAPSE_MS = 160;

/**
 * The banners dismissed in this document, by their keys. The press writes the seen state and the next load draws
 * nothing, but a client navigation back to Home re-mounts the payload the router already holds; this keeps that
 * re-mount closed. Only ever written by a press, so the server's copy of the module stays empty.
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

function CloseButton({ onClose, className }: { onClose: () => void; className: string }) {
  return (
    <button type="button" aria-label={copy.dismiss} onClick={onClose} className={`${CLOSE} ${className}`}>
      <span aria-hidden="true">✕</span>
    </button>
  );
}

export function ArrivalsBanner({ data }: { data: ArrivalsBannerData }) {
  const id = data.keys.join(" ");
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

  if (phase === "gone" || data.lines.length === 0) return null;

  const close = () => {
    dismissed.add(id);
    setPhase("closing");
    // The banner closes on the press; a write that fails leaves the arrivals unseen, and the next load shows them
    // again (rule 6: only ✕ or a Precons visit marks seen).
    void dismissArrivals(data.keys).catch(() => {});
  };

  const closing = phase === "closing";
  const one = data.lines.length === 1 ? data.lines[0] : null;
  const { shown, more } = sheetTitles(data.lines.length);

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
        {one ? (
          <section
            aria-label={copy.regionLabel}
            className={
              `${SHELL} mx-[16px] mt-[14px] flex items-start gap-[10px] py-[10px] pr-[4px] pl-[14px] ` +
              "sm:mx-[26px] sm:mt-[18px] sm:min-h-[46px] sm:items-center sm:gap-[12px] sm:py-[7px] sm:pr-[8px]"
            }
          >
            <Mark className="mt-[2px] sm:mt-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-[4px] pt-[2px] sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-[14px] sm:gap-y-[2px] sm:pt-0">
              <p className="m-0 text-[14px] leading-[1.45] text-[color:var(--fg-body)]">
                <Sentence line={one} />
              </p>
              <Link
                href={data.href}
                className={`${LINK} min-h-[24px] self-start text-[14px] leading-[1.45] sm:min-h-0 sm:self-auto sm:text-[13.5px]`}
              >
                {one.kind === "set" ? copy.seeOne : copy.seeMany}
                <PendingReporter href={data.href} />
              </Link>
            </div>
            <CloseButton
              onClose={close}
              className="-mt-[8px] h-[44px] w-[44px] text-[14px] sm:mt-0 sm:h-[32px] sm:w-[32px] sm:text-[13px]"
            />
          </section>
        ) : (
          // Several: the count heading, the lines under `sheetTitles`' cap, one link and one ✕ for all. Placed on a
          // grid so the DOM reads heading, lines, link, ✕ (Tab: the link, then ✕) while the link sits on the heading
          // line at desktop and on its own 44px line last at 390.
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
                {copy.heading(data.lines.length)}
              </h2>
            </div>
            <ul
              className={
                "col-span-2 row-start-2 m-0 mt-[2px] mr-[10px] ml-[32px] list-none p-0 " +
                "sm:col-span-3 sm:mt-[4px] sm:mr-0 sm:grid sm:grid-cols-2 sm:gap-x-[28px]"
              }
            >
              {data.lines.slice(0, shown).map((l) => (
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
              href={data.href}
              className={
                `${LINK} col-span-2 row-start-3 flex min-h-[44px] items-center justify-self-start pl-[32px] text-[14px] ` +
                "sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:min-h-0 sm:pl-0 sm:text-[13.5px]"
              }
            >
              {copy.seeMany}
              <PendingReporter href={data.href} />
            </Link>
            <CloseButton
              onClose={close}
              className="col-start-2 row-start-1 -mt-[8px] h-[44px] w-[44px] text-[14px] sm:col-start-3 sm:mt-0 sm:h-[32px] sm:w-[32px] sm:text-[13px]"
            />
          </section>
        )}
      </div>
    </div>
  );
}
