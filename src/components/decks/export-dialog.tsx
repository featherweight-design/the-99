"use client";
// ExportDialog — §Export Dialog / Sheet: modal (desktop) / bottom sheet (mobile), two tabs: Decklist + Shopping list.
// Task 10. Reuses useDialogA11y for focus trap, Escape, focus-return.

import { useRef, useState, type RefObject } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { OwnershipDot } from "../ui/ownership-dot";
import { downloadTextFile } from "../../lib/decks/download";
import {
  bodyLine,
  buildDecklistText,
  decklistGroups,
  commanderLines,
  buildShoppingText,
  decklistFilename,
  shoppingFilename,
  type DecklistCard,
} from "../../lib/decks/export-helpers";
import { ExportCopyButton } from "./export-copy-button";
import { GhostButton } from "@/components/ui/button";
import { ExternalLink } from "../ui/external-link";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import {
  exportDialogCopy,
  exportLinkOutCopy,
  exportShoppingCopy,
  exportTabCopy,
  overCopy,
  ownedStateCopy,
} from "../../lib/copy/decks-builder";
import { priceCopy } from "../../lib/copy/price";
import { deckBodySize } from "../../lib/decks/deck-size";

type Tab = "decklist" | "shopping";

interface ExportDialogProps {
  deckName: string;
  commanderName: string;
  /** The second commander, or null for the single-commander deck most decks are. */
  partnerName: string | null;
  /** The printing each commander's line names (deck printings): the one the deck shows, absent
      for a commander the player does not own. */
  commanderPrinting?: { setCode?: string; collectorNumber?: string } | null;
  partnerPrinting?: { setCode?: string; collectorNumber?: string } | null;
  /** Body cards (both commanders excluded), each already named by the printing
      the player owns — see `printedNameOf` at the call site. */
  decklistCards: DecklistCard[];
  /** What the Shopping filter shows: cards you do not own, plus cards you own
      whose every copy is spoken for by another deck. Never a basic land. */
  shoppingCards: { name: string; role?: string; quantity: number; owned: boolean }[];
  open: boolean;
  onClose: () => void;
  /**
   * Draw the dialog as a STATIC SPECIMEN rather than opening it — no scroll
   * lock, no focus trap, no Escape handler. `/about` is the only caller: it
   * draws this dialog as a figure, and an open dialog rendered into a
   * reference page would lock that page's own scroll and swallow the reader's
   * Tab. See `useDialogA11y`'s `inert`.
   */
  inert?: boolean;
  /**
   * Which tab the dialog opens on. Defaults to the decklist, which is what
   * every real opening wants. `/about` passes `shopping`: its entry's two key
   * lines are about that tab, and the `Buy these at Mana Pool` link they
   * describe renders there alone.
   */
  initialTab?: Tab;
  /** Where focus goes on close, when the opener knows better than the focus at mount (`useDialogA11y`). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function ExportDialog({
  deckName,
  commanderName,
  partnerName,
  commanderPrinting = null,
  partnerPrinting = null,
  decklistCards,
  shoppingCards,
  open,
  onClose,
  inert = false,
  initialTab = "decklist",
  returnFocusRef,
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [status, setStatus] = useState("");

  // Focus trap, Escape, focus-return, body scroll lock — all hooks must run
  // before any early return, so the lock tracks `open` rather than the mount.
  useDialogA11y(dialogRef, onClose, { lockScroll: open, inert, returnFocusRef });

  if (!open) return null;

  const decklistText = buildDecklistText({
    commanderName, partnerName, commanderPrinting, partnerPrinting, cards: decklistCards,
  });
  const shoppingText = buildShoppingText(shoppingCards);
  const activeText = tab === "decklist" ? decklistText : shoppingText;

  // The preview draws the commanders accented above a separator and the body
  // beneath, so it composes its own lines rather than splitting the export text
  // — that text now carries section headers, which the preview never showed.
  // Its muted `// name — count` header and separator are presentational only.
  const commanderPreviewLines = commanderLines({ commanderName, partnerName, commanderPrinting, partnerPrinting });
  // Composed through the same helper the exported text uses, so the preview
  // cannot show a line shape the copied file does not have.
  // In the copied text's order, its type groups' (the headers themselves are the text's, not drawn).
  const bodyLines = decklistGroups(decklistCards).flatMap(([, cards]) => cards.map(bodyLine));
  // The body count, which is what `built` means everywhere else — derived here
  // rather than passed in, so it cannot disagree with the preview's own header.
  const built = decklistCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalCards = commanderPreviewLines.length + built;
  // A hundred cards including the commanders, so a pair's body is 98 and the
  // overage line measures against that rather than a written-down 99.
  const bodySize = deckBodySize(partnerName !== null);

  return (
    <>
      {/* Overlay dim — 0.60 mobile / 0.68 desktop */}
      <div
        className="fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] md:bg-[color-mix(in_oklab,var(--bg)_68%,transparent)]"
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
        aria-label={exportDialogCopy.title}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        {/* Desktop modal — centered in the viewport by the flex wrapper */}
        <div
          className="hidden md:flex md:flex-col pointer-events-auto"
          style={{
            width: 560,
            // The drawing sized the modal to a short list. A 99-card decklist or
            // a long shopping list would otherwise grow it past both edges of
            // the viewport, since the centring wrapper does not clip its child.
            maxHeight: "min(85vh, 760px)",
            background: "var(--surface-rail)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
            boxShadow: "var(--modal-shadow)",
            overflow: "hidden",
          }}
        >
          <DialogContent
            deckName={deckName}
            tab={tab}
            setTab={setTab}
            activeText={activeText}
            shoppingCards={shoppingCards}
            commanderLines={commanderPreviewLines}
            bodyLines={bodyLines}
            totalCards={totalCards}
            built={built}
            bodySize={bodySize}
            setStatus={setStatus}
            onClose={onClose}
            isMobile={false}
          />
        </div>

        {/* Mobile bottom sheet */}
        <div
          className="flex flex-col md:hidden absolute left-0 right-0 bottom-0 pointer-events-auto"
          style={{
            background: "var(--surface-rail)",
            borderTop: "1px solid var(--border-strong)",
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
            commanderLines={commanderPreviewLines}
            bodyLines={bodyLines}
            totalCards={totalCards}
            built={built}
            bodySize={bodySize}
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
  shoppingCards: { name: string; role?: string; quantity: number; owned: boolean }[];
  commanderLines: string[];
  bodyLines: string[];
  totalCards: number;
  /** Matched body cards — over the body size adds one line, see
      overCopy.exportNote. */
  built: number;
  /** 99, or 98 for a pair. */
  bodySize: number;
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
  commanderLines,
  bodyLines,
  totalCards,
  built,
  bodySize,
  setStatus,
  onClose,
  isMobile,
}: DialogContentProps) {
  const shoppingUrl = manapoolAddDeckUrl(shoppingCards);

  return (
    <>
      {/* Header: border-bottom mobile only */}
      <div
        className="flex flex-none items-center justify-between"
        style={{
          padding: isMobile ? "8px 18px 14px" : "20px 24px 16px",
          borderBottom: isMobile ? "1px solid var(--border)" : undefined,
        }}
      >
        <div>
          <p
            className="font-display font-bold m-0"
            style={{
              fontSize: isMobile ? 19 : 22,
              color: "var(--fg)",
            }}
          >
            {exportDialogCopy.title}
          </p>
          {/* Desktop-only subtitle */}
          {!isMobile && (
            <p
              className="font-mono m-0"
              style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 3 }}
            >
              {exportDialogCopy.sub}
            </p>
          )}
        </div>
        {/* Dismiss button */}
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-none text-[color:var(--fg-faint)]"
            style={{ fontSize: 17 }}
            aria-label={exportDialogCopy.closeAria}
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center bg-[color:var(--surface-raised)] border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              fontSize: 14,
              cursor: "pointer",
            }}
            aria-label={exportDialogCopy.closeAria}
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab pills */}
      <div
        className="flex flex-none"
        style={{
          gap: 8,
          padding: isMobile ? "14px 18px 0" : "0 24px 16px",
        }}
      >
        {/* Decklist tab */}
        <button
          type="button"
          onClick={() => setTab("decklist")}
          className={[
            "font-sans text-[13px]",
            tab === "decklist"
              ? "font-semibold text-[color:var(--bg)] bg-[color:var(--accent)] border-none"
              : "font-medium text-[color:var(--fg-muted)] bg-transparent border border-solid border-[color:var(--border-strong)]",
          ].join(" ")}
          style={{
            borderRadius: isMobile ? 999 : 8,
            padding: isMobile ? "6px 15px" : "8px 16px",
            cursor: "pointer",
          }}
        >
          {exportTabCopy.decklist}
        </button>
        {/* Shopping list tab */}
        <button
          type="button"
          onClick={() => setTab("shopping")}
          className={[
            "font-sans text-[13px]",
            tab === "shopping"
              ? "font-semibold text-[color:var(--bg)] bg-[color:var(--warning)] border-none"
              : [
                  "font-medium bg-transparent border border-solid",
                  isMobile
                    ? "text-[color:var(--warning)] border-[color:color-mix(in_srgb,var(--accent)_30%,var(--bg))]"
                    : "text-[color:var(--fg-muted)] border-[color:var(--border-strong)]",
                ].join(" "),
          ].join(" ")}
          style={{
            borderRadius: isMobile ? 999 : 8,
            padding: isMobile ? "6px 15px" : "8px 16px",
            cursor: "pointer",
          }}
        >
          {exportTabCopy.shopping}
        </button>
      </div>

      {/* Body. min-h-0 is load-bearing: a flex item's default min-height is its
          content, so without it the body refuses to shrink and the modal's
          max-height has nothing to give. */}
      {/* `overscroll-contain` (Hugh, 2026-10-03): stops a scroll of this body at either
          end from chaining into the page behind the dialog. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {tab === "decklist" ? (
          /* Decklist tab body */
          <div style={{ margin: isMobile ? "14px 18px" : "0 24px" }}>
            {/* Over the body size: one line stating the arithmetic in the one
                place the list leaves the app. Not a warning and not a blocker —
                export stays enabled, because the player is very likely pasting
                this somewhere to do the cutting. */}
            {built > bodySize && (
              <p
                style={{
                  fontSize: isMobile ? 12 : 12.5,
                  lineHeight: 1.5,
                  color: "var(--warning)",
                  margin: "0 0 10px",
                }}
              >
                {/* The size figure is the whole list, commanders included, so it
                    agrees with the preview header a few lines down rather than
                    contradicting it. The overage is still measured off the body:
                    a Commander deck holds a hundred cards, so 105 really is five
                    over whether one card of it leads the deck or two do. */}
                {overCopy.exportNote(String(totalCards), String(built - bodySize))}
              </p>
            )}
            <pre
              className="font-mono"
              style={{
                fontSize: isMobile ? 11.5 : 12.5,
                lineHeight: isMobile ? 1.85 : 1.8,
                color: "var(--fg-body)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: isMobile ? "14px 16px" : "16px 18px",
                // No fixed height. The drawing's 250px clipped a real decklist,
                // and `overflow: auto` would not rescue it — a multi-column box
                // with a constrained height overflows sideways into further
                // columns, so it would scroll horizontally. Sizing to content
                // puts the scroll on the body, where the shopping tab's is.
                overflow: "hidden",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {/* Preview-only comment header — not part of the copied text */}
              <span aria-hidden style={{ color: "var(--fg-faint)" }}>
                {exportDialogCopy.previewHeader(deckName, totalCards)}
                {"\n"}
              </span>
              {/* Commander lines: one per commander, both for a pair */}
              {commanderLines.map((line) => (
                <span key={line} style={{ color: "var(--accent)" }}>
                  {line}
                  {"\n"}
                </span>
              ))}
              {/* Preview-only separator — not part of the copied text */}
              <span aria-hidden style={{ color: "var(--border-strong)" }}>
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
                  <span key={line} style={{ color: "var(--fg-body)" }}>
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
                background: "var(--surface-sunken)",
                border: "1px solid var(--border)",
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
                  border: "1.5px solid var(--fg-faint)",
                  color: "var(--fg-faint)",
                  fontSize: 10,
                }}
              >
                i
              </div>
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "var(--fg-faint)" }}
              >
                {priceCopy.export.pricingNote}
              </span>
            </div>}

            {/* Count meta */}
            <p
              className="font-mono"
              style={{
                fontSize: 11,
                color: "var(--fg-faint)",
                padding: isMobile ? "0 20px" : "0 26px 8px",
                margin: 0,
              }}
            >
              {exportShoppingCopy.countMeta(
                shoppingCards.reduce((sum, c) => sum + c.quantity, 0),
              )}
            </p>

            {/* Mobile "names only" note */}
            {isMobile && (
              <p
                className="font-mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--fg-locked)",
                  padding: "0 20px 2px",
                  margin: 0,
                }}
              >
                {priceCopy.export.pricingNote}
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
                    borderBottom: `1px solid ${isMobile ? "var(--surface)" : "var(--surface-rail)"}`,
                  }}
                >
                  {/* Quantity — real per-card count (basics can run multiples) */}
                  <span
                    className="font-mono"
                    style={{ fontSize: 12, color: "var(--fg-faint)" }}
                  >
                    {card.quantity}
                  </span>
                  {/* Ownership dot (desktop). The list is no longer unowned-only
                      — a spoken-for row is a card you own whose copies are all
                      claimed elsewhere — so the dot reads the row, as the
                      decklist's does, and carries the word the dot alone
                      cannot now imply. */}
                  {!isMobile && (
                    <OwnershipDot
                      owned={card.owned}
                      className="w-[7px] h-[7px]"
                      label={card.owned ? ownedStateCopy.owned : ownedStateCopy.notOwned}
                    />
                  )}
                  {/* Card name */}
                  <span
                    className="font-sans flex-1"
                    style={{
                      fontSize: isMobile ? 13 : 14,
                      color: "var(--fg)",
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
                        color: "var(--fg-faint)",
                        background: "var(--surface-raised)",
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

      {/* Footer — one hairline serves both rows; the link row adds no second
          divider of its own. */}
      <div className="flex-none" style={{ borderTop: "1px solid var(--border)" }}>
      <div
        className="flex items-center gap-[8px]"
        style={{ padding: isMobile ? "14px 18px" : "16px 24px" }}
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
          <span className="md:hidden">{exportDialogCopy.downloadShort}</span>
          <span className="hidden md:inline">{exportDialogCopy.download}</span>
        </GhostButton>

        {/* Desktop: "Moxfield · Archidekt ready" note (inline with footer, ml-auto) */}
        {!isMobile && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--fg-faint)", marginLeft: "auto" }}
          >
            {exportDialogCopy.ready}
          </span>
        )}
      </div>

      {/* Buy the shopping list at Mana Pool. Absent — not disabled — on the
          Decklist tab and when there is nothing left to buy. */}
      {shoppingUrl && tab === "shopping" && (
        <div
          className="flex items-center"
          style={{
            minHeight: isMobile ? 44 : undefined,
            padding: isMobile ? "2px 18px 10px" : "13px 24px 18px",
          }}
        >
          <ExternalLink href={shoppingUrl} label={exportLinkOutCopy.shopping} />
        </div>
      )}
      </div>
    </>
  );
}
