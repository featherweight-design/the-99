"use client";
// Home's welcome-credits strip (welcome credits R2, boards `R2-Placement` and `R2-States`): one line in the About line's
// family. The lot's mark carrying what is left, the state's line, `Where they work` opening the sheet, and a bare ✕
// that closes it for good, per account (`dismissWelcomeStripAction`). In the page, never over it: no motion, no focus
// grab, no live region. First-run Home: under the About line. Dashboard: heading the main column, over Ready to build.
//
// Expiring turns the border, the mark and the count `--warning`, never `--danger`. Used up says so, with the teaser as its
// link while `teaser`, else `Your free credit comes back each day.`, and no `Where they work`. The date is the reader's own
// day, drawn after hydration (`useLocalDay`).

import Link from "next/link";
import { useRef, useState } from "react";
import { dismissWelcomeStripAction } from "../../app/welcome-actions";
import { stripDay, welcomeCreditsCopy, type LeadLine } from "../../lib/copy/welcome-credits";
import type { WelcomeFacts, WelcomeSheet } from "../../lib/payments/welcome-sheet";
import { HOME_HEADING_ID } from "../home/home-heading";
import { PendingReporter } from "../shell/pending-reporter";
import { useLocalDay, WhereCreditsWork } from "./where-credits-work";

const c = welcomeCreditsCopy.strip;

/**
 * Closed by a press in this document. ✕ writes the dismissal and the next load draws nothing, but a client navigation
 * back to Home re-mounts the payload the router already holds, so the press is remembered here too. A write that fails
 * takes it back out. Only ever written by a press, so the server's copy of the module stays false.
 */
let closedHere = false;

/** Tests only: forget a press made in an earlier test. */
export function resetWelcomeStripClosed(): void {
  closedHere = false;
}

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
const LINK =
  "relative whitespace-nowrap rounded-[3px] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] " +
  "underline-offset-[3px] hover:decoration-[color:var(--fg)] after:absolute after:-inset-x-[6px] after:-inset-y-[12px] after:content-[''] " + RING;

/** The state's sentence, its bold lead first. Used up has no lead. */
export function stripLine(facts: WelcomeFacts, day: string): LeadLine | string {
  if (facts.lot === "usedUp") return c.usedUp(facts.units);
  if (facts.lot === "expiring") return c.expiring(facts.left, facts.days, day);
  if (facts.lot === "held") return c.held(facts.left, day);
  return c.partly(facts.left, facts.units, day);
}

/** The lot's mark: a 22px turned square holding what is left (the pack card's diamond, at the strip's size). */
function Mark({ n, warn, dim }: { n: number; warn: boolean; dim: boolean }) {
  return (
    <span aria-hidden className={`flex h-[30px] w-[30px] flex-none items-center justify-center ${dim ? "opacity-45 saturate-[.3]" : ""}`}>
      <i
        className={`flex h-[22px] w-[22px] rotate-45 items-center justify-center rounded-[3px] border-[1.5px] border-solid not-italic ${
          warn
            ? "border-[color:var(--warning)] bg-[color:color-mix(in_srgb,var(--warning)_12%,var(--surface))]"
            : "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface))]"
        }`}
      >
        <b className={`-rotate-45 font-display text-[11px] font-bold leading-none [font-variant-numeric:lining-nums] [text-box:trim-both_cap_alphabetic] ${warn ? "text-[color:var(--warning)]" : "text-[color:var(--accent-text)]"}`}>{n}</b>
      </i>
    </span>
  );
}

export function WelcomeStrip({
  facts,
  sheet,
  place,
  afterAbout = false,
}: {
  /** The lot, or null: no lot, expired, or closed (`stripFacts`). */
  facts: WelcomeFacts | null;
  /** The sheet's list, or null with every row off: then no `Where they work`. */
  sheet: WelcomeSheet | null;
  /** First-run Home sits the strip in the checklist's gutter; the dashboard's column has its own. */
  place: "first-run" | "dashboard";
  /** First-run only: the About line is drawn just above, so the strip sits 8px under it rather than under the heading. */
  afterAbout?: boolean;
}) {
  const [closed, setClosed] = useState(closedHere);
  const [open, setOpen] = useState(false);
  const where = useRef<HTMLButtonElement>(null);
  const day = useLocalDay(facts?.expiresAtMs ?? 0, stripDay);
  if (!facts || closed) return null;

  const warn = facts.lot === "expiring";
  const usedUp = facts.lot === "usedUp";
  const line = stripLine(facts, day.text);

  const close = () => {
    closedHere = true;
    setClosed(true);
    document.getElementById(HOME_HEADING_ID)?.focus();
    // Hidden on the press; a write that fails leaves the strip for the next load.
    void dismissWelcomeStripAction().catch(() => {
      closedHere = false;
    });
  };

  const margin =
    place === "first-run" ? `mx-[16px] sm:mx-[28px] ${afterAbout ? "mt-[8px] sm:mt-[10px]" : "mt-[14px] sm:mt-[18px]"}` : "";

  return (
    <section
      aria-label={welcomeCreditsCopy.region}
      data-welcome-strip={facts.lot}
      className={`${margin} flex min-h-[52px] items-center gap-[12px] rounded-[12px] border border-solid py-[7px] pl-[12px] pr-[4px] text-[13.5px] leading-[1.45] text-[color:var(--fg-body)] bg-[color:var(--surface)] ${
        warn ? "border-[color:color-mix(in_srgb,var(--warning)_60%,var(--border-strong))]" : "border-[color:var(--accent-dim)]"
      }`}
    >
      <Mark n={facts.left} warn={warn} dim={usedUp} />
      <p className={`m-0 min-w-0 flex-1 [text-wrap:pretty] ${usedUp || day.ready ? "" : "invisible"}`}>
        {typeof line === "string" ? (
          line
        ) : (
          <>
            <b className={`font-semibold ${warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]"}`}>{line.lead}</b>
            {line.rest}
          </>
        )}{" "}
        {usedUp ? (
          facts.teaser ? (
            <Link href="/credits" data-welcome-more className={LINK}>
              {c.more}
              <PendingReporter href="/credits" />
            </Link>
          ) : (
            c.freeBack(facts.free)
          )
        ) : sheet ? (
          <button
            ref={where}
            type="button"
            data-welcome-where
            onClick={() => setOpen(true)}
            className={`${LINK} cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] leading-[inherit]`}
          >
            {c.where}
          </button>
        ) : null}
      </p>
      <button
        type="button"
        aria-label={c.dismiss}
        data-welcome-dismiss
        onClick={close}
        className={`flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] sm:mr-[4px] sm:h-[32px] sm:w-[32px] ${RING}`}
      >
        <span aria-hidden>✕</span>
      </button>
      {open && sheet ? (
        <WhereCreditsWork facts={facts} sheet={sheet} teaser={facts.teaser} onClose={() => setOpen(false)} returnFocusRef={where} />
      ) : null}
    </section>
  );
}
