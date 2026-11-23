"use client";
// The collection's Find a deck call-out (tool discovery call 1, `Find.dc.html` F0 to F2): the to-do card row as a
// statement, under you-have-it R3's shell. On All it is the door to Availability › Free (`Show them`); on Free alone
// it says what the button beside each card does. A bare ✕ closes it for good, per account.

import { useAuth } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { closeFindADeckAction } from "../../app/collection/find-a-deck-actions";
import { findADeckCopy as copy } from "../../lib/copy/find-a-deck";
import { FitsGlyph } from "../cards/fits-door";

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

/**
 * The account that closed it in this page's life: a remount (a view switch, a filter that unmounts the list, a route
 * cache that still holds the open state) does not bring it back. Keyed on the account, since a sign-out and a sign-in
 * as someone else happen without a page load.
 */
let closedFor: string | null = null;

/** Test seam: a fresh module per test is what the app gets per page load. */
export function resetFindADeckCalloutForTest() {
  closedFor = null;
}

export function FindADeckCallout({
  count,
  free,
  rows,
  onShow,
}: {
  /** The Free count the Availability menu already reads. */
  count: number;
  /** The list is narrowed to Free alone: no `Show them`, and the body points at the buttons. */
  free: boolean;
  /** The row view: from md its button sits beside the card, so the line says `beside`. */
  rows: boolean;
  onShow: () => void;
}) {
  const { userId } = useAuth();
  const [closedNow, setClosed] = useState(false);
  const closed = closedNow || (userId != null && closedFor === userId);
  const section = useRef<HTMLElement>(null);
  if (closed) return null;

  const close = () => {
    // Focus goes to the first control after the call-out, never to <body> when the ✕ unmounts.
    const next = section.current?.nextElementSibling?.querySelector<HTMLElement>("button, a[href]");
    closedFor = userId ?? null;
    setClosed(true);
    next?.focus();
    // Hidden on the press; a write that fails leaves it hidden in this mount and draws it again on the next one.
    void closeFindADeckAction().catch(() => {
      closedFor = null;
    });
  };

  const body = !free ? (
    copy.bodyAll
  ) : rows ? (
    <>
      <span className="md:hidden">{copy.bodyFree}</span>
      <span className="hidden md:inline">{copy.bodyFreeRows}</span>
    </>
  ) : (
    copy.bodyFree
  );

  return (
    <section
      ref={section}
      aria-label={copy.eyebrow}
      data-find-a-deck-callout={free ? "free" : "all"}
      className="mx-[12px] mt-[8px] overflow-hidden rounded-[10px] bg-[color:var(--surface-rail)] [border:1px_solid_var(--border)] md:mx-[34px] md:mt-[12px]"
    >
      <div className="flex items-center justify-between pl-[14px] pr-[2px] md:pl-[16px]">
        <p className="m-0 pb-[2px] pt-[9px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          {copy.eyebrow}
        </p>
        <button
          type="button"
          aria-label={copy.dismiss}
          data-find-a-deck-dismiss=""
          onClick={close}
          className={`flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] md:h-[32px] md:w-[32px] ${RING}`}
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
      <div className="grid grid-cols-[30px_1fr] items-center gap-x-[11px] gap-y-[10px] px-[14px] py-[11px] [border-top:1px_solid_var(--border)] md:grid-cols-[30px_1fr_auto] md:px-[16px] md:py-[10px]">
        <span
          aria-hidden
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--bg))]"
        >
          <FitsGlyph />
        </span>
        <div className="min-w-0 md:flex md:flex-wrap md:items-baseline md:gap-x-[12px]">
          <p className="m-0 text-[13.5px] font-semibold leading-[1.4] text-[color:var(--fg)]">{copy.title(count)}</p>
          <p className="m-0 mt-[2px] text-[12px] leading-[1.5] text-[color:var(--fg-muted)] md:mt-0 md:text-[12.5px]">{body}</p>
        </div>
        {free ? null : (
          <button
            type="button"
            data-find-a-deck-show=""
            onClick={onShow}
            className={`col-start-2 flex h-[44px] cursor-pointer items-center justify-center rounded-[8px] bg-transparent px-[16px] font-sans text-[12.5px] font-semibold text-[color:var(--fg)] transition-colors [border:1px_solid_var(--border-strong)] hover:[border-color:var(--accent)] justify-self-start md:col-start-3 md:row-start-1 md:h-[36px] md:w-[132px] ${RING}`}
          >
            {copy.show}
          </button>
        )}
      </div>
    </section>
  );
}
