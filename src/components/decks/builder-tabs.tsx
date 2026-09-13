"use client";
// BuilderTabs — the decklist, Consider and Games as peers, per design table §1.
//
// Sits in the main column, not a rail: the whole point of the overhaul is that
// discovery is a room you walk into rather than a drawer beside the deck. The
// counts live in the accessible names as well as the text, because "99" beside
// "Consider" is only a number until you know what it counts.

import Link from "next/link";

// Declared outside this module so a server route can read the URL parameter that
// names a tab without importing a client module to do it.
export type { BuilderView } from "../../lib/decks/builder-view";
import type { BuilderView } from "../../lib/decks/builder-view";

export interface BuilderTabSpec {
  id: BuilderView;
  label: string;
  /** Omitted when there is nothing to count. A bare label renders instead. */
  count?: number;
  accessibleName: string;
}

/** A cell in the tab row that is a ROUTE rather than a panel — #389's version
 *  history. It reads as a peer of the three tabs and behaves as a link, which is
 *  why it renders outside the tablist: the roving tabindex and `aria-controls`
 *  are contracts about panels in this document, and a fourth `role="tab"`
 *  pointing at another page would make both of them lie. */
export interface BuilderTabLink {
  href: string;
  label: string;
  /** Omitted when there is nothing to count, exactly as a tab's is. */
  count?: number;
  accessibleName: string;
  /** The cell for the page being read. Only `BuilderRouteTabs` sets it: on the
   *  builder itself no link cell is ever the current page. */
  current?: boolean;
}

interface BuilderTabsProps {
  tabs: readonly BuilderTabSpec[];
  view: BuilderView;
  onViewChange: (view: BuilderView) => void;
  /** Empty or absent draws nothing — a cell offering a route to a page with
   *  nothing on it is the defect `ClearAutoButton` documents at its own zero. */
  links?: readonly BuilderTabLink[];
  /** The desktop toolbar rides the same row, pushed right. Mobile draws it below. */
  children?: React.ReactNode;
}

function Tab({
  id, panelId, label, count, selected, onSelect, accessibleName,
}: {
  id: string;
  panelId: string;
  label: string;
  count?: number;
  selected: boolean;
  onSelect: () => void;
  accessibleName: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={selected}
      // Only the selected tab names a panel. The other panels are unmounted while
      // this one is up, so a standing aria-controls would point every inactive
      // tab at an element that is not in the document.
      aria-controls={selected ? panelId : undefined}
      aria-label={accessibleName}
      // Roving tabindex: the tablist is one tab stop and the arrows move within
      // it, which is the ARIA tabs contract. Dropping the inactive tab from the
      // tab order without the arrows would leave it unreachable by keyboard.
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      // The idle border is transparent rather than absent so selecting a tab
      // does not shift the bar by 2px.
      className={`flex items-baseline gap-[6px] min-h-[44px] pb-[8px] md:pb-[10px] bg-transparent cursor-pointer border-0 border-b-2 border-solid ${
        selected ? "border-b-[color:var(--accent)]" : "border-b-transparent"
      }`}
    >
      <span
        className={`text-[13.5px] md:text-[14px] ${
          selected ? "font-semibold text-[color:var(--fg)]" : "font-medium text-[color:var(--fg-faint)]"
        }`}
      >
        {label}
      </span>
      {typeof count === "number" && (
        <span
          aria-hidden
          className={`font-mono text-[11px] md:text-[12px] tabular-nums ${
            // A zero count is never accent, even on the active tab: accent is the
            // colour of something worth walking over to.
            selected && count > 0 ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function LinkCell({ link }: { link: BuilderTabLink }) {
  return (
    <Link
      href={link.href}
      aria-label={link.accessibleName}
      aria-current={link.current ? "page" : undefined}
      // The same transparent idle border the tabs carry, so the cell sits on
      // the same baseline as them rather than 2px below it.
      className={`flex items-baseline gap-[6px] min-h-[44px] pb-[8px] md:pb-[10px] no-underline border-0 border-b-2 border-solid ${
        link.current ? "border-b-[color:var(--accent)]" : "border-b-transparent"
      }`}
    >
      <span
        className={`text-[13.5px] md:text-[14px] ${
          link.current
            ? "font-semibold text-[color:var(--fg)]"
            : "font-medium text-[color:var(--fg-faint)]"
        }`}
      >
        {link.label}
      </span>
      {typeof link.count === "number" && (
        <span
          aria-hidden
          className={`font-mono text-[11px] md:text-[12px] tabular-nums ${
            // A zero count is never accent, on a link cell for the same reason it
            // is never accent on the active tab.
            link.current && link.count > 0
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--fg-faint)]"
          }`}
        >
          {link.count}
        </span>
      )}
    </Link>
  );
}

/** The same row, drawn on a route that is not the builder — every cell a link,
 *  one of them the page being read. There is no tablist and no roving tabindex,
 *  because nothing here controls a panel in this document: the cells are four
 *  links, and the browser's own tab order is the right one for links. */
export function BuilderRouteTabs({ cells }: { cells: readonly BuilderTabLink[] }) {
  return (
    <div
      className="px-[16px] pt-[10px] md:px-[30px] md:pt-[12px] overflow-hidden"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-baseline gap-[16px] md:gap-[22px]">
        {cells.map((cell) => (
          <LinkCell key={cell.href} link={cell} />
        ))}
      </div>
    </div>
  );
}

export function BuilderTabs({ tabs, view, onViewChange, links, children }: BuilderTabsProps) {
  return (
    <div
      className="px-[16px] pt-[10px] md:px-[30px] md:pt-[12px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* The row, of which the tablist is one part: the version link and the
          toolbar are peers of it rather than children, because a tablist owns
          exactly the tabs that control this document's panels. */}
      <div className="flex items-baseline gap-[16px] md:gap-[22px]">
        <div
          className="flex items-baseline gap-[16px] md:gap-[22px]"
          role="tablist"
          // Selection follows focus, which is the pattern's default for panels
          // that are all cheap to render.
          onKeyDown={(e) => {
            // Guarded rather than assumed: the handler is on the container, so any
            // focusable thing nested inside a tab would send its own arrow and
            // Home/End keys through here. Only a tab's keys are the tablist's to
            // act on.
            const tab = e.target as HTMLElement;
            if (tab.getAttribute("role") !== "tab") return;
            // The key came from a tab, so that tab is where the move starts —
            // reading the index off `view` instead would leave it at -1 for any
            // caller whose tabs do not contain the selected view.
            const current = tabs.findIndex((t) => `tab-${t.id}` === tab.id);
            if (current < 0) return;
            let next: number;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % tabs.length;
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = tabs.length - 1;
            else return;

            e.preventDefault();
            const id = tabs[next].id;
            onViewChange(id);
            document.getElementById(`tab-${id}`)?.focus();
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              id={`tab-${tab.id}`}
              panelId={`panel-${tab.id}`}
              label={tab.label}
              count={tab.count}
              selected={view === tab.id}
              onSelect={() => onViewChange(tab.id)}
              accessibleName={tab.accessibleName}
            />
          ))}
        </div>
        {links?.map((link) => (
          <LinkCell key={link.href} link={link} />
        ))}
        {/* Desktop only: the toolbar shares the tab row, pushed right. At phone
            width it draws as its own row inside the panel body instead. */}
        {children && <div className="hidden md:flex ml-auto items-center gap-[12px] pb-[8px]">{children}</div>}
      </div>
    </div>
  );
}
