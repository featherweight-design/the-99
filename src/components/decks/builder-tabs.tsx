"use client";
// BuilderTabs — the decklist and Consider as peers, per design table §1.
//
// Sits in the main column, not a rail: the whole point of the overhaul is that
// discovery is a room you walk into rather than a drawer beside the deck. The
// counts live in the accessible names as well as the text, because "99" beside
// "Consider" is only a number until you know what it counts.

import { addPanelCopy } from "../../lib/copy/decks-builder";

export type BuilderView = "deck" | "consider";

interface BuilderTabsProps {
  view: BuilderView;
  onViewChange: (view: BuilderView) => void;
  deckCount: number;
  considerCount: number;
  /** The desktop toolbar rides the same row, pushed right. Mobile draws it below. */
  children?: React.ReactNode;
}

function Tab({
  id, panelId, label, count, selected, onSelect, accessibleName,
}: {
  id: string;
  panelId: string;
  label: string;
  count: number;
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
      aria-controls={panelId}
      aria-label={accessibleName}
      onClick={onSelect}
      // The idle border is transparent rather than absent so selecting a tab
      // does not shift the bar by 2px.
      className={`flex items-baseline gap-[6px] min-h-[44px] pb-[8px] md:pb-[10px] bg-transparent cursor-pointer border-0 border-b-2 border-solid ${
        selected ? "border-b-[color:var(--brass)]" : "border-b-transparent"
      }`}
    >
      <span
        className={`text-[13.5px] md:text-[14px] ${
          selected ? "font-semibold text-[color:var(--fg)]" : "font-medium text-[color:var(--fg-faint)]"
        }`}
      >
        {label}
      </span>
      <span
        aria-hidden
        className={`font-mono text-[11px] md:text-[12px] tabular-nums ${
          // A zero count is never brass, even on the active tab: brass is the
          // colour of something worth walking over to.
          selected && count > 0 ? "text-[color:var(--brass)]" : "text-[color:var(--fg-faint)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export function BuilderTabs({
  view, onViewChange, deckCount, considerCount, children,
}: BuilderTabsProps) {
  return (
    <div
      className="px-[16px] pt-[10px] md:px-[30px] md:pt-[12px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-baseline gap-[16px] md:gap-[22px]" role="tablist">
        <Tab
          id="tab-deck"
          panelId="panel-deck"
          label={addPanelCopy.tabs.deck}
          count={deckCount}
          selected={view === "deck"}
          onSelect={() => onViewChange("deck")}
          accessibleName={addPanelCopy.tabs.deckAria(deckCount)}
        />
        <Tab
          id="tab-consider"
          panelId="panel-consider"
          label={addPanelCopy.tabs.consider}
          count={considerCount}
          selected={view === "consider"}
          onSelect={() => onViewChange("consider")}
          accessibleName={addPanelCopy.tabs.considerAria(considerCount)}
        />
        {/* Desktop only: the toolbar shares the tab row, pushed right. At phone
            width it draws as its own row inside the panel body instead. */}
        {children && <div className="hidden md:flex ml-auto items-center gap-[12px] pb-[8px]">{children}</div>}
      </div>
    </div>
  );
}
