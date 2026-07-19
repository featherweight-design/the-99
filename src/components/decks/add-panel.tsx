"use client";
// AddPanel — per §Add Panel design table.
// Variants:
//   "column" — desktop right-column (always visible, no chrome)
//   "inline"  — mobile, shown inline when deck is empty
//   "sheet"   — mobile, bottom-sheet chrome (focus-trap, Escape, focus-return, body-scroll-lock)

import { useState, useRef, useEffect, useMemo } from "react";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { SuggestionCard } from "./suggestion-card";
import { SearchPane } from "./search-pane";

type Tab = "suggestions" | "search";

interface AddPanelBaseProps {
  deckId: string;
  degraded: boolean;
  commanderIdentity: string[];
  suggestions: DeckSuggestion[];
  deckOracleIds: string[];
}

// Discriminated on variant — the sheet variant requires onCloseSheet.
type AddPanelProps = AddPanelBaseProps &
  (
    | { variant: "column" | "inline"; onCloseSheet?: never }
    | { variant: "sheet"; onCloseSheet: () => void }
  );

// Inner panel content (tab bar + pane) — shared between all variants.
function PanelContent({
  deckId,
  commanderIdentity,
  suggestions,
  degraded,
  deckOracleIds,
  variant,
  onCloseSheet,
}: {
  deckId: string;
  commanderIdentity: string[];
  suggestions: DeckSuggestion[];
  degraded: boolean;
  deckOracleIds: Set<string>;
  variant: "column" | "inline" | "sheet";
  onCloseSheet?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("suggestions");
  const isSheet = variant === "sheet";
  const isDesktop = variant === "column";

  // §Panel — tab bar padding: 8px 18px 0 mobile / 14px 16px 0 desktop
  // §Panel — tab bar gap: 8px mobile / 6px desktop
  const tabBarPaddingClass = isDesktop ? "pt-[14px] px-[16px]" : "pt-[8px] px-[18px]";
  const tabBarGapClass = isDesktop ? "gap-[6px]" : "gap-[8px]";

  return (
    <>
      {/* Sheet grab handle (mobile sheet only) */}
      {isSheet && (
        <div className="flex items-center justify-center" style={{ padding: "10px 0 4px" }}>
          <span
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              background: "#3A3229",
              display: "block",
            }}
          />
        </div>
      )}

      {/* §Panel — tab bar */}
      <div className={`flex ${tabBarPaddingClass} ${tabBarGapClass} flex-none`}>
        {(["suggestions", "search"] as const).map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              // §Panel — tab item (active): flex 1, center, IBM Plex Sans, fw 600, 13px, #EDE6D8, padding 9px 0, border-bottom 2px #C9A24B
              // §Panel — tab item (idle): fw 500, #8E8269, border-bottom 2px transparent
              className="flex-1 text-center font-sans text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] rounded-sm"
              style={{
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#EDE6D8" : "#8E8269",
                padding: "9px 0",
                border: "none",
                borderBottom: `2px solid ${isActive ? "#C9A24B" : "transparent"}`,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {t === "suggestions" ? "Suggestions" : "Search"}
            </button>
          );
        })}

        {/* Sheet close button */}
        {isSheet && onCloseSheet && (
          <button
            type="button"
            onClick={onCloseSheet}
            aria-label="Close add cards panel"
            className="font-mono text-[11px] px-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] rounded-sm"
            style={{ color: "#8E8269", background: "transparent", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        )}
      </div>

      {/* §Panel — Suggestions sub-caption (shown on Suggestions tab) */}
      {tab === "suggestions" && (
        <p
          // padding 14px 18px 10px mobile / 14px 16px desktop; border-bottom desktop only
          className="font-mono text-[10.5px] leading-[1.5] flex-none"
          style={{
            color: "#8E8269",
            padding: isDesktop ? "14px 16px" : "14px 18px 10px",
            borderBottom: isDesktop ? "1px solid #2A241D" : undefined,
          }}
        >
          {degraded
            ? "Based on your collection — EDHREC is offline, so suggestions are ranked by role coverage."
            : "Based on your collection and EDHREC data for this commander."}
        </p>
      )}

      {/* §Panel — cards list area: flex 1, overflow hidden, padding 6px 16px 14px mobile / 12px 14px desktop */}
      <div
        className="flex-1 overflow-hidden flex flex-col"
        style={{
          padding: isDesktop ? "12px 14px" : "6px 16px 14px",
        }}
      >
        {tab === "suggestions" ? (
          <div className="flex-1 overflow-y-auto flex flex-col gap-[8px] md:gap-[9px]">
            {suggestions.length === 0 ? (
              <p className="font-mono text-[11px] text-center pt-[20px]" style={{ color: "#6E6353" }}>
                No suggestions available.
              </p>
            ) : (
              suggestions.map((s) => (
                <SuggestionCard
                  key={s.oracleId}
                  suggestion={s}
                  deckId={deckId}
                  inDeck={deckOracleIds.has(s.oracleId)}
                />
              ))
            )}
          </div>
        ) : (
          <SearchPane
            deckId={deckId}
            commanderIdentity={commanderIdentity}
            deckOracleIds={deckOracleIds}
          />
        )}
      </div>
    </>
  );
}

// Sheet wrapper: dim overlay + bottom sheet with focus-trap + body-scroll-lock.
function SheetWrapper({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Body scroll lock when sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus trap + Escape + focus-return.
  useDialogA11y(sheetRef, onClose);

  return (
    <>
      {/* §Bottom sheet — dim overlay: position absolute, inset 0, rgba(8,6,4,0.55) */}
      <div
        className="md:hidden fixed inset-0 z-40"
        style={{ background: "rgba(8,6,4,0.55)" }}
        onClick={onClose}
        aria-hidden
      />
      {/* §Panel as bottom sheet: position absolute/fixed, left 0, right 0, bottom 0, height 640px */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add cards"
        className="md:hidden fixed left-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          height: 640,
          background: "#181410",
          borderTop: "1px solid #3A3229",
          borderRadius: "22px 22px 0 0",
          boxShadow: "0 -20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </>
  );
}

export function AddPanel(props: AddPanelProps) {
  const { deckId, commanderIdentity, suggestions, degraded, deckOracleIds: deckOracleIdsArray } = props;
  // Build a Set client-side — flips + Add ↔ ✓ In deck without server round-trips.
  const deckOracleIds = useMemo(() => new Set(deckOracleIdsArray), [deckOracleIdsArray]);

  const content = (
    <PanelContent
      deckId={deckId}
      commanderIdentity={commanderIdentity}
      suggestions={suggestions}
      degraded={degraded}
      deckOracleIds={deckOracleIds}
      variant={props.variant}
      onCloseSheet={props.variant === "sheet" ? props.onCloseSheet : undefined}
    />
  );

  if (props.variant === "sheet") {
    return <SheetWrapper onClose={props.onCloseSheet}>{content}</SheetWrapper>;
  }

  // "column" and "inline" — no extra chrome; the wrapper is provided by BuilderShell.
  return <>{content}</>;
}
