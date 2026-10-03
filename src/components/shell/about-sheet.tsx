"use client";

import { useEffect, useRef, useState } from "react";
import { setAboutSheetUp } from "./about-sheet-presence";
import { usePathname } from "next/navigation";
import type { SheetState } from "../../lib/about/sheet-state";
import { aboutSheetCopy as copy } from "../../lib/copy/about";
import { howItWorksLinksCopy } from "../../lib/copy/how-it-works-links";
import { GhostButton, PrimaryButton } from "../ui/button";
import { usePendingPush } from "./pending-push";

/** How many titles the card lists (STATES-about-r6 §N1, §N2): all of them up to
 *  four, otherwise three and "and N more", so "and 1 more" is never printed. */
export function sheetTitles(n: number): { shown: number; more: number } {
  return n <= 4 ? { shown: n, more: 0 } : { shown: 3, more: n - 3 };
}

/** The page reserves the card's height at its foot on a phone (§N5), read by
 *  `Shell`'s `<main>` as `var(--about-sheet-h, 0px)`. */
const RESERVE = "--about-sheet-h";

/**
 * The one-time About sheet (About R6 §N): a non-modal notice over whatever page
 * a document load opened. No scrim, no focus grab, no scroll lock, and not
 * `ui/sheet.tsx`, which is all three.
 *
 * ALWAYS MOUNTED by `Shell` while the switch is on, and it LATCHES the state it
 * was first rendered with. Only a document load carries the proxy's header, and
 * the root layout also re-renders on `router.refresh()` and on every Server
 * Action that revalidates. Those re-renders hand this `none`, and a sheet that
 * took them at their word would vanish unread while its cookie already says
 * "shown". A fresh document load mounts a fresh one.
 *
 * Later and Escape close it and write nothing (§N7). Show me closes it and goes
 * to `/about`, whose own effect records the visit. Reaching `/about` any other
 * way closes it too.
 */
export function AboutSheet({ state }: { state: SheetState }) {
  const [shown] = useState(state);
  const [open, setOpen] = useState(shown.kind !== "none");
  const [announce, setAnnounce] = useState("");
  const { go } = usePendingPush();
  const onAbout = usePathname() === "/about";
  // Reaching /about by ANY route answers the sheet, not only by Show me: a
  // reader who opens About The 99 from the account menu has read what it points
  // to, and the page records the visit. Latched closed here, during render
  // rather than in an effect, so the card cannot flash back onto the next page.
  if (onAbout && open) setOpen(false);
  const card = useRef<HTMLDivElement>(null);
  const drawn = open && !onAbout && shown.kind !== "none";

  const heading =
    shown.kind === "behind" ? copy.heading(shown.entries.length) : copy.firstRunHeading;

  // Announced once, politely, after the region exists (§N10). Setting the text
  // after mount is what makes a live region speak; text present at mount is not
  // announced.
  useEffect(() => {
    if (!drawn) return;
    // A tick later rather than in the effect body, so the live region is in the
    // accessibility tree, empty, before its text arrives.
    const t = window.setTimeout(() => setAnnounce(heading), 0);
    return () => window.clearTimeout(t);
  }, [drawn, heading]);

  // The tab bar's locked-slot note waits while this is up (H1): both sit in the
  // same place on a phone, and this one holds it.
  useEffect(() => {
    if (!drawn) return;
    setAboutSheetUp(true);
    return () => setAboutSheetUp(false);
  }, [drawn]);

  useEffect(() => {
    const el = card.current;
    const root = document.documentElement;
    if (!drawn || !el) return;
    const write = () => root.style.setProperty(RESERVE, `${el.offsetHeight + 10}px`);
    write();
    // Guarded, as `card-modal.tsx` guards it: a runtime without the API still
    // draws the card, and re-measures on a window resize instead.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(write);
    observer?.observe(el);
    if (!observer) window.addEventListener("resize", write);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", write);
      root.style.removeProperty(RESERVE);
    };
  }, [drawn]);

  if (!drawn) return null;

  const firstRun = shown.kind === "firstRun";
  const titles = shown.kind === "behind" ? shown.entries : [];
  const { shown: count, more } = sheetTitles(titles.length);

  return (
    <div
      ref={card}
      data-about-sheet
      role="region"
      aria-label={firstRun ? copy.regionLabelFirstRun : copy.regionLabel}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className={
        "anim-sheet-in fixed z-40 box-border rounded-[14px] border border-solid " +
        "border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] " +
        "px-[18px] pt-[16px] pb-[14px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] " +
        // Phone (§N5): full width, above the tab bar.
        "inset-x-[12px] bottom-[calc(var(--tabbar-h)+10px)] " +
        // From the shell's md, 20px beside the rail (§N4, audit E8). The rail is 62px beside a
        // pointer and 88px on touch (desktop nav labels), so the offset reads its width.
        "md:right-auto md:left-[calc(var(--rail-w)+20px)] md:bottom-[20px] md:w-[340px]"
      }
    >
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
      <div className="flex items-center gap-[10px]">
        <span
          aria-hidden="true"
          className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[8px]"
          style={{
            background: "color-mix(in srgb, var(--accent) 16%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
          }}
        >
          <span className="h-[9px] w-[9px] rotate-45 bg-[color:var(--accent)]" />
        </span>
        <h2 className="font-display text-[17px] leading-[1.2] font-bold text-[color:var(--fg)]">
          {heading}
        </h2>
      </div>

      {firstRun ? (
        <p className="mt-[10px] text-[13.5px] leading-[1.4] text-[color:var(--fg-body)] max-md:text-[14px]">
          {copy.firstRunLine}
        </p>
      ) : (
        <ul className="mt-[8px]">
          {titles.slice(0, count).map((t) => (
            <li
              key={t.id}
              className="border-t border-solid border-[color:var(--border)] py-[8px] text-[13.5px] leading-[1.4] text-[color:var(--fg-body)] max-md:text-[14px]"
            >
              {t.title}
            </li>
          ))}
          {more > 0 && (
            <li className="border-t border-solid border-[color:var(--border)] py-[8px] font-mono text-[11px] text-[color:var(--fg-muted)]">
              {copy.more(more)}
            </li>
          )}
          {shown.kind === "behind" && shown.appendix && (
            <li
              data-appendix-line=""
              className="border-t border-solid border-[color:var(--border)] py-[8px] text-[13.5px] leading-[1.4] text-[color:var(--fg-muted)] max-md:text-[14px]"
            >
              {howItWorksLinksCopy.sheetLine}
            </li>
          )}
        </ul>
      )}

      <div className="mt-[12px] flex gap-[8px]">
        <PrimaryButton
          className="h-[36px] px-[18px] text-[13px] max-md:h-[44px] max-md:flex-1"
          onClick={() => {
            setOpen(false);
            // Reported like a link, so a slow arrival reaches the navigation screen.
            go("/about");
          }}
        >
          {copy.show}
        </PrimaryButton>
        <GhostButton
          className="h-[36px] px-[18px] text-[13px] max-md:h-[44px] max-md:flex-1"
          onClick={() => setOpen(false)}
        >
          {copy.later}
        </GhostButton>
      </div>

      <p className="mt-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.where}</p>
    </div>
  );
}
