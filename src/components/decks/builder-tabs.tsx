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
      // Only the selected tab names a panel. The other panel is unmounted while
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
      <div
        className="flex items-baseline gap-[16px] md:gap-[22px]"
        role="tablist"
        // Selection follows focus, which is the pattern's default for two
        // panels that are both cheap to render.
        onKeyDown={(e) => {
          // The desktop toolbar rides this row, so its sort <select> is a
          // descendant and its own arrow/Home/End keys bubble through here.
          // Only a tab's keys are the tablist's to act on.
          if ((e.target as HTMLElement).getAttribute("role") !== "tab") return;
          const next =
            e.key === "ArrowRight" || e.key === "ArrowDown"
              ? "consider"
              : e.key === "ArrowLeft" || e.key === "ArrowUp"
                ? "deck"
                : e.key === "Home"
                  ? "deck"
                  : e.key === "End"
                    ? "consider"
                    : null;
          if (!next) return;
          e.preventDefault();
          onViewChange(next);
          document.getElementById(`tab-${next}`)?.focus();
        }}
      >
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
