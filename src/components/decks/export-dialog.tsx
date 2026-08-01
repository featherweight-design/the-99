"use client";
// ExportDialog — §Export Dialog / Sheet: modal (desktop) / bottom sheet (mobile), two tabs: Decklist + Shopping list.
// Task 10. Reuses useDialogA11y for focus trap, Escape, focus-return.

import { useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { OwnershipDot } from "../ui/ownership-dot";
import { downloadTextFile } from "../../lib/decks/download";
import {
  buildDecklistText,
  buildShoppingText,
  decklistFilename,
  shoppingFilename,
} from "../../lib/decks/export-helpers";
import { ExportCopyButton } from "./export-copy-button";
import { GhostButton } from "@/components/ui/button";

type Tab = "decklist" | "shopping";

interface ExportDialogProps {
  deckName: string;
  commanderName: string;
  /** Body cards (commander excluded). */
  decklistCards: { name: string; quantity: number }[];
  /** Unowned cards only. */
  shoppingCards: { name: string; role?: string; quantity: number }[];
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
  const [tab, setTab] = useState<Tab>("decklist");
  const [status, setStatus] = useState("");

  // Focus trap, Escape, focus-return, body scroll lock — all hooks must run
  // before any early return, so the lock tracks `open` rather than the mount.
  useDialogA11y(dialogRef, onClose, { lockScroll: open });

  if (!open) return null;

  const decklistText = buildDecklistText({ commanderName, cards: decklistCards });
  const shoppingText = buildShoppingText(shoppingCards);
  const activeText = tab === "decklist" ? decklistText : shoppingText;

  // Preview rendering: line 0 is the commander, the rest are body lines. The
  // muted `// name — count` header and separator in the preview are
  // presentational only — never part of the copied/downloaded text.
  const decklistLines = decklistText.split("\n");
  const commanderLine = decklistLines[0];
  const bodyLines = decklistLines.slice(1);
  const totalCards = 1 + decklistCards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <>
      {/* Overlay dim — 0.60 mobile / 0.68 desktop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(8,6,4,0.60)] md:bg-[rgba(8,6,4,0.68)]"
        onClick={onClose}
        aria-hidden
      />
      {/* Single aria-live status region — hoisted here so it renders exactly once regardless of layout path */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      {/* Positioning wrapper — pointer-events pass through to the overlay so
          clicking outside either layout still dismisses. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Export deck"
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        {/* Desktop modal — centered in the viewport by the flex wrapper */}
        <div
          className="hidden md:flex md:flex-col pointer-events-auto"
          style={{
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
            commanderLine={commanderLine}
            bodyLines={bodyLines}
            totalCards={totalCards}
            setStatus={setStatus}
            onClose={onClose}
            isMobile={false}
          />
        </div>

        {/* Mobile bottom sheet */}
        <div
          className="flex flex-col md:hidden absolute left-0 right-0 bottom-0 pointer-events-auto"
          style={{
            background: "#1A160F",
            borderTop: "1px solid #3A3229",
            borderRadius: "22px 22px 0 0",
            boxShadow: "0 -20px 50px rgba(0,0,0,0.5)",
            height: 590,
          }}
        >
          <DialogContent
            deckName={deckName}
            tab={tab}
            setTab={setTab}
            activeText={activeText}
            shoppingCards={shoppingCards}
            commanderLine={commanderLine}
            bodyLines={bodyLines}
            totalCards={totalCards}
            setStatus={setStatus}
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
  shoppingCards: { name: string; role?: string; quantity: number }[];
  commanderLine: string;
  bodyLines: string[];
  totalCards: number;
  setStatus: (s: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

function DialogContent({
  deckName,
  tab,
  setTab,
  activeText,
  shoppingCards,
  commanderLine,
  bodyLines,
  totalCards,
  setStatus,
  onClose,
  isMobile,
}: DialogContentProps) {
  return (
    <>
      {/* Header: border-bottom mobile only */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: isMobile ? "8px 18px 14px" : "20px 24px 16px",
          borderBottom: isMobile ? "1px solid #2A241D" : undefined,
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
            className=""
            style={{ color: "#8E8269", fontSize: 17, background: "none", border: "none" }}
            aria-label="Close export dialog"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center"
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
          className="font-sans font-semibold text-[13px]"
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
          className="font-sans text-[13px]"
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
              {/* Preview-only comment header — not part of the copied text */}
              <span aria-hidden style={{ color: "#8E8269" }}>
                {`// ${deckName} — ${totalCards} cards`}
                {"\n"}
              </span>
              {/* Commander line: 1 commanderName */}
              <span style={{ color: "#C9A24B" }}>
                {commanderLine}
                {"\n"}
              </span>
              {/* Preview-only separator — not part of the copied text */}
              <span aria-hidden style={{ color: "#3A3229" }}>
                {isMobile ? "—" : "————————————"}
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
                  <span key={line} style={{ color: "#C6B79A" }}>
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
            {/* Info callout — desktop only */}
            {!isMobile && <div
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
            </div>}

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
              {shoppingCards.reduce((sum, c) => sum + c.quantity, 0)} cards · unowned
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
              {shoppingCards.map((card) => (
                <div
                  key={card.name}
                  className="flex items-center"
                  style={{
                    gap: isMobile ? 10 : 12,
                    padding: isMobile ? "8px 10px" : "9px 16px",
                    borderBottom: `1px solid ${isMobile ? "#1E1A15" : "#1A160F"}`,
                  }}
                >
                  {/* Quantity — real per-card count (basics can run multiples) */}
                  <span
                    className="font-mono"
                    style={{ fontSize: 12, color: "#8E8269" }}
                  >
                    {card.quantity}
                  </span>
                  {/* Unowned dot (desktop) */}
                  {!isMobile && (
                    <OwnershipDot owned={false} className="w-[7px] h-[7px]" />
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
        />

        {/* Download .txt — secondary (BOTH tabs, BOTH breakpoints) */}
        <GhostButton
          onClick={() => {
            const filename =
              tab === "decklist"
                ? decklistFilename(deckName)
                : shoppingFilename(deckName);
            downloadTextFile(filename, activeText);
          }}
          className={`text-[14px] ${isMobile ? "px-[16px] py-[12px]" : "px-[18px] py-[11px]"}`}
        >
          {/* Mobile label: ".txt", desktop: "Download .txt" */}
          <span className="md:hidden">.txt</span>
          <span className="hidden md:inline">Download .txt</span>
        </GhostButton>

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
