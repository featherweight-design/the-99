"use client";
// "N more · Show all N" under a list cut to its first rows: Home's What's new (the board: "five shown, then Show all N")
// and `/friends`' Waiting on you (Hugh, 2026-10-27), one footer so the two never drift.

import { useEffect, useRef, useState } from "react";
import { feedCopy } from "../../lib/copy/feed";

/** How many rows a cut list shows before "Show all N". */
export const FEED_SHOWN = 5;

const c = feedCopy.home;

/** The footer: what is not shown, and the press that shows the whole list in place. Nothing while nothing is hidden. */
export function ShowAllFooter({ hidden, total, onExpand }: { hidden: number; total: number; onExpand: () => void }) {
  if (hidden <= 0) return null;
  return (
    <div data-feed-footer className="flex items-center justify-between gap-[10px] [border-top:1px_solid_var(--border)] py-[4px] pr-[6px] pl-[14px]">
      <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{c.more(hidden)}</small>
      <button
        type="button"
        onClick={onExpand}
        className="flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[10px] font-sans text-[13px] font-medium text-[color:var(--fg)] md:min-h-[36px]"
      >
        {c.showAll(total)}
      </button>
    </div>
  );
}

/** A control a reader can reach: not disabled, not taken out of the tab order or the accessibility tree, and drawn. */
function reachable(el: HTMLElement): boolean {
  if (el.tabIndex < 0 || el.closest("[aria-hidden=true]")) return false;
  return typeof el.checkVisibility !== "function" || el.checkVisibility();
}

/**
 * A cut list's expanded state. Show all unmounts its own press, so the expand moves focus to the first row it REVEALS
 * (the first row not drawn before the press, since a grouped list such as Home's Today and Earlier can place a new
 * row ahead of an old one): its first reachable link or button, else the row itself. A keyboard or screen-reader reader
 * is never left on the page's top. `root` goes on the element holding the list's rows (`ul > li`).
 */
export function useShowAll() {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const before = useRef<Set<Element> | null>(null);
  const rows = () => [...(root.current?.querySelectorAll<HTMLElement>(":scope ul > li") ?? [])];
  useEffect(() => {
    const was = before.current;
    if (!was) return;
    before.current = null;
    const row = rows().find((li) => !was.has(li));
    if (!row) return;
    const press = [...row.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")].find(reachable);
    if (press) return press.focus();
    row.tabIndex = -1;
    row.focus();
  });
  return {
    expanded,
    root,
    expand: () => {
      before.current = new Set(rows());
      setExpanded(true);
    },
  };
}
