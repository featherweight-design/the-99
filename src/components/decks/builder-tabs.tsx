"use client";
// BuilderTabs — the decklist, Consider, Games and Versions as peers, per design
// table §1. Every cell is a tab over a panel in this document: Versions used to
// be a link to a route of its own, which made it the one cell that took the deck
// off screen.
//
// Sits in the main column, not a rail: the whole point of the overhaul is that
// discovery is a room you walk into rather than a drawer beside the deck. The
// counts live in the accessible names as well as the text, because "99" beside
// "Consider" is only a number until you know what it counts.

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

interface BuilderTabsProps {
  tabs: readonly BuilderTabSpec[];
  view: BuilderView;
  onViewChange: (view: BuilderView) => void;
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
      className={`flex flex-none items-baseline gap-[6px] whitespace-nowrap min-h-[44px] pb-[8px] md:pb-[10px] bg-transparent cursor-pointer border-0 border-b-2 border-solid ${
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

export function BuilderTabs({ tabs, view, onViewChange, children }: BuilderTabsProps) {
  return (
    <div
      className="px-[16px] pt-[10px] md:px-[30px] md:pt-[12px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* The row, of which the tablist is one part: the version link and the
          toolbar are peers of it rather than children, because a tablist owns
          exactly the tabs that control this document's panels. */}
      <div className="flex items-baseline gap-[16px] md:gap-[22px]">
        {/* ONE LINE, ALWAYS: a label never breaks (a deck with versions at 390 pushed "Your deck
            99" onto two lines). Where five tabs are wider than the phone, the row scrolls
            sideways instead, its scrollbar hidden, so the page itself never does. A scroll box
            clips on both axes, so it pads 4px inside and gives it back outside: the focus ring
            (2px, offset 2px) is drawn whole. */}
        <div
          className="-m-[4px] flex min-w-0 items-baseline gap-[16px] overflow-x-auto p-[4px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:m-0 md:gap-[22px] md:overflow-visible md:p-0"
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
        {/* Desktop only: the toolbar shares the tab row, pushed right. At phone
            width it draws as its own row inside the panel body instead. */}
        {children && <div className="hidden md:flex ml-auto items-center gap-[12px] pb-[8px]">{children}</div>}
      </div>
    </div>
  );
}
