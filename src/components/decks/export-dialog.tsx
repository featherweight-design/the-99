"use client";
// ExportDialog — modal (desktop) / bottom sheet (mobile), two tabs: Decklist + Shopping list.
// Task 10. Reuses useDialogA11y for focus trap, Escape, focus-return.

import { useRef, useState, useEffect } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { downloadTextFile } from "../../lib/decks/download";
import {
  buildDecklistText,
  buildShoppingText,
  decklistFilename,
  shoppingFilename,
} from "../../lib/decks/export-helpers";
import { ExportCopyButton } from "./export-copy-button";

type Tab = "decklist" | "shopping";

interface ExportDialogProps {
  deckName: string;
  commanderName: string;
  /** Body cards (commander excluded). */
  decklistCards: { name: string; quantity: number }[];
  /** Unowned cards only. */
  shoppingCards: { name: string; role?: string }[];
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({
  deckName,
  commanderName,
  decklistCards,
  shoppingCards,
  open,
  onClose,
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const [tab, setTab] = useState<Tab>("decklist");
  const [status, setStatus] = useState("");

  // Focus trap, Escape, focus-return
  useDialogA11y(dialogRef, onClose);

  // Body scroll lock while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!open) return null;

  const decklistText = buildDecklistText({ deckName, commanderName, cards: decklistCards });
  const shoppingText = buildShoppingText(shoppingCards);
  const activeText = tab === "decklist" ? decklistText : shoppingText;

  // Parse decklist lines for colored rendering
  const decklistLines = decklistText.split("\n");

  function getLineColor(line: string): string {
    if (line.startsWith("#")) return "#8E8269"; // comment line (deckName)
    if (line.startsWith("//")) return "#3A3229"; // separator
    // Check if it's the commander line: second non-comment line = "1 ${commanderName}"
    if (line === `1 ${commanderName}`) return "#C9A24B"; // brass
    return "#C6B79A"; // body lines
  }

  const isCommanderLine = (line: string) => line === `1 ${commanderName}`;
  const isSeparatorLine = (line: string) => line.startsWith("//");
  const isCommentLine = (line: string) => line.startsWith("#");

  return (
    <>
      {/* Overlay dim */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(8,6,4,0.60)" }}
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet (mobile) / Modal (desktop) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Export deck"
        className="fixed z-50 left-0 right-0 bottom-0 md:left-auto md:right-auto md:bottom-auto md:top-1/2 md:left-1/2"
        style={{
          // Mobile: bottom sheet
          background: "#1A160F",
          borderTop: "1px solid #3A3229",
          borderRadius: "22px 22px 0 0",
          boxShadow: "0 -20px 50px rgba(0,0,0,0.5)",
          height: 590,
          // We can't toggle between mobile/desktop shapes with inline styles alone;
          // desktop overrides applied via a nested absolutely-positioned container below.
        }}
      >
        {/* Desktop modal container override — renders on top of mobile sheet */}
        <div
          className="hidden md:flex md:flex-col"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 560,
            background: "#1A160F",
            border: "1px solid #3A3229",
            borderRadius: 16,
            boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          <DialogContent
            deckName={deckName}
            tab={tab}
            setTab={setTab}
            activeText={activeText}
            shoppingCards={shoppingCards}
            decklistLines={decklistLines}
            isCommentLine={isCommentLine}
            isCommanderLine={isCommanderLine}
            isSeparatorLine={isSeparatorLine}
            getLineColor={getLineColor}
            status={status}
            setStatus={setStatus}
            preRef={preRef}
            onClose={onClose}
            isMobile={false}
          />
        </div>

        {/* Mobile content */}
        <div className="flex flex-col md:hidden h-full">
          <DialogContent
            deckName={deckName}
            tab={tab}
            setTab={setTab}
            activeText={activeText}
            shoppingCards={shoppingCards}
            decklistLines={decklistLines}
            isCommentLine={isCommentLine}
            isCommanderLine={isCommanderLine}
            isSeparatorLine={isSeparatorLine}
            getLineColor={getLineColor}
            status={status}
            setStatus={setStatus}
            preRef={preRef}
            onClose={onClose}
            isMobile={true}
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner content — shared between mobile and desktop layouts
// ---------------------------------------------------------------------------

interface DialogContentProps {
  deckName: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  activeText: string;
  shoppingCards: { name: string; role?: string }[];
  decklistLines: string[];
  isCommentLine: (line: string) => boolean;
  isCommanderLine: (line: string) => boolean;
  isSeparatorLine: (line: string) => boolean;
  getLineColor: (line: string) => string;
  status: string;
  setStatus: (s: string) => void;
  preRef: React.RefObject<HTMLPreElement | null>;
  onClose: () => void;
  isMobile: boolean;
}

function DialogContent({
  deckName,
  tab,
  setTab,
  activeText,
  shoppingCards,
  decklistLines,
  isCommentLine,
  isCommanderLine,
  isSeparatorLine,
  getLineColor,
  status,
  setStatus,
  preRef,
  onClose,
  isMobile,
}: DialogContentProps) {
  // Body lines (non-commander, non-separator, non-comment) for two-column layout
  const bodyLines = decklistLines.filter(
    (l) => !isCommentLine(l) && !isCommanderLine(l) && !isSeparatorLine(l)
  );

  return (
    <>
      {/* aria-live status (sr-only) */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>

      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: isMobile ? "8px 18px 14px" : "20px 24px 16px",
          borderBottom: "1px solid #2A241D",
        }}
      >
        <div>
          <p
            className="font-display font-bold m-0"
            style={{
              fontSize: isMobile ? 19 : 22,
              color: "#EDE6D8",
            }}
          >
            Export deck
          </p>
          {/* Desktop-only subtitle */}
          {!isMobile && (
            <p
              className="font-mono m-0"
              style={{ fontSize: 11, color: "#8E8269", marginTop: 3 }}
            >
              Plain text · Moxfield · Archidekt ready
            </p>
          )}
        </div>
        {/* Dismiss button */}
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
            style={{ color: "#8E8269", fontSize: 17, background: "none", border: "none" }}
            aria-label="Close export dialog"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "#221D16",
              border: "1px solid #3A3229",
              color: "#A89B84",
              fontSize: 14,
              cursor: "pointer",
            }}
            aria-label="Close export dialog"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab pills */}
      <div
        className="flex"
        style={{
          gap: 8,
          padding: isMobile ? "14px 18px 0" : "0 24px 16px",
        }}
      >
        {/* Decklist tab */}
        <button
          type="button"
          onClick={() => setTab("decklist")}
          className="font-sans font-semibold text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          style={{
            borderRadius: isMobile ? 999 : 8,
            padding: isMobile ? "6px 15px" : "8px 16px",
            color: tab === "decklist" ? "#14110E" : "#A89B84",
            background: tab === "decklist" ? "#C9A24B" : "transparent",
            border: tab === "decklist" ? "none" : "1px solid #3A3229",
            fontWeight: tab === "decklist" ? 600 : 500,
            cursor: "pointer",
          }}
        >
          Decklist
        </button>
        {/* Shopping list tab */}
        <button
          type="button"
          onClick={() => setTab("shopping")}
          className="font-sans text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          style={{
            borderRadius: isMobile ? 999 : 8,
            padding: isMobile ? "6px 15px" : "8px 16px",
            color: tab === "shopping" ? "#14110E" : (isMobile ? "#E0913C" : "#A89B84"),
            background: tab === "shopping" ? "#E0913C" : "transparent",
            border: tab === "shopping"
              ? "none"
              : isMobile
              ? "1px solid #4A3A24"
              : "1px solid #3A3229",
            fontWeight: tab === "shopping" ? 600 : 500,
            cursor: "pointer",
          }}
        >
          Shopping list
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === "decklist" ? (
          /* Decklist tab body */
          <div style={{ margin: isMobile ? "14px 18px" : "0 24px" }}>
            <pre
              ref={preRef}
              className="font-mono"
              style={{
                fontSize: isMobile ? 11.5 : 12.5,
                lineHeight: isMobile ? 1.85 : 1.8,
                color: "#C6B79A",
                background: isMobile ? "#14110E" : "#100D0A",
                border: "1px solid #2A241D",
                borderRadius: 10,
                padding: isMobile ? "14px 16px" : "16px 18px",
                height: isMobile ? undefined : 250,
                overflow: "hidden",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {/* Comment line: # deckName */}
              <span style={{ color: "#8E8269" }}>
                {decklistLines[0]}
                {"\n"}
              </span>
              {/* Commander line: 1 commanderName */}
              <span style={{ color: "#C9A24B" }}>
                {decklistLines[1]}
                {"\n"}
              </span>
              {/* Separator line: // */}
              <span style={{ color: "#3A3229" }}>
                {decklistLines[2]}
                {"\n"}
              </span>
              {/* Body lines (desktop: two columns) */}
              <span
                style={
                  !isMobile
                    ? { columns: 2, columnGap: 36, display: "block" }
                    : {}
                }
              >
                {bodyLines.map((line, i) => (
                  <span key={i} style={{ color: getLineColor(line) }}>
                    {line}
                    {i < bodyLines.length - 1 ? "\n" : ""}
                  </span>
                ))}
              </span>
            </pre>
          </div>
        ) : (
          /* Shopping tab body */
          <div>
            {/* Info callout */}
            <div
              className="flex items-center"
              style={{
                gap: 9,
                margin: "0 24px 10px",
                background: "#181410",
                border: "1px solid #2A241D",
                borderRadius: 8,
                padding: "9px 12px",
              }}
            >
              {/* "i" info icon */}
              <div
                className="flex items-center justify-center flex-none font-mono"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "1.5px solid #8E8269",
                  color: "#8E8269",
                  fontSize: 10,
                }}
              >
                i
              </div>
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "#8E8269" }}
              >
                Names only. Pricing is a planned add — see release notes.
              </span>
            </div>

            {/* Count meta */}
            <p
              className="font-mono"
              style={{
                fontSize: 11,
                color: "#8E8269",
                padding: isMobile ? "0 20px" : "0 26px 8px",
                margin: 0,
              }}
            >
              {shoppingCards.length} cards · unowned
            </p>

            {/* Mobile "names only" note */}
            {isMobile && (
              <p
                className="font-mono"
                style={{
                  fontSize: 9.5,
                  color: "#6E6353",
                  padding: "0 20px 2px",
                  margin: 0,
                }}
              >
                names only · pricing planned
              </p>
            )}

            {/* Item rows */}
            <div>
              {shoppingCards.map((card, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{
                    gap: isMobile ? 10 : 12,
                    padding: isMobile ? "8px 10px" : "9px 16px",
                    borderBottom: `1px solid ${isMobile ? "#1E1A15" : "#1A160F"}`,
                  }}
                >
                  {/* Quantity — shopping list shows 1x always (unowned) */}
                  <span
                    className="font-mono"
                    style={{ fontSize: 12, color: "#8E8269" }}
                  >
                    1
                  </span>
                  {/* Unowned dot (desktop) */}
                  {!isMobile && (
                    <div
                      className="flex-none"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: "transparent",
                        border: "1px dashed #6E6353",
                      }}
                    />
                  )}
                  {/* Card name */}
                  <span
                    className="font-sans flex-1"
                    style={{
                      fontSize: isMobile ? 13 : 14,
                      color: "#EDE6D8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {card.name}
                  </span>
                  {/* Role chip (desktop) */}
                  {!isMobile && card.role && (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "#8E8269",
                        background: "#221D16",
                        borderRadius: 5,
                        padding: "2px 8px",
                      }}
                    >
                      {card.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-[8px]"
        style={{
          padding: isMobile ? "14px 18px" : "16px 24px",
          borderTop: "1px solid #2A241D",
        }}
      >
        {/* Copy to clipboard — primary */}
        <ExportCopyButton
          text={activeText}
          onStatus={setStatus}
          preRef={preRef}
        />

        {/* Download .txt — secondary (BOTH tabs, BOTH breakpoints) */}
        <button
          type="button"
          onClick={() => {
            const filename =
              tab === "decklist"
                ? decklistFilename(deckName)
                : shoppingFilename(deckName);
            downloadTextFile(filename, activeText);
          }}
          className="font-sans font-semibold text-[14px] rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          style={{
            color: "#EDE6D8",
            background: "transparent",
            border: "1px solid #3A3229",
            padding: isMobile ? "12px 16px" : "11px 18px",
            cursor: "pointer",
          }}
        >
          {/* Mobile label: ".txt", desktop: "Download .txt" */}
          <span className="md:hidden">.txt</span>
          <span className="hidden md:inline">Download .txt</span>
        </button>

        {/* Desktop: "Moxfield · Archidekt ready" note (inline with footer, ml-auto) */}
        {!isMobile && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "#8E8269", marginLeft: "auto" }}
          >
            Moxfield · Archidekt ready
          </span>
        )}
      </div>
    </>
  );
}
