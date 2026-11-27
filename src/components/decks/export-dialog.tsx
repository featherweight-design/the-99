"use client";
// ExportDialog — §Export Dialog / Sheet: modal (desktop) / bottom sheet (mobile), two tabs: Decklist + Shopping list.
// Task 10. Reuses useDialogA11y for focus trap, Escape, focus-return.

import { useCallback, useId, useRef, useState, type RefObject } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { inertExemptProps, useInertWhileOpen } from "../../lib/a11y/inert-page";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { HoverPreviewProvider } from "./hover-preview";
import { DecklistRow } from "./decklist-row";
import type { ExportShoppingCard } from "../../lib/decks/export-data";
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
import { TOUCH_HIT } from "../ui/touch-hit";
import { manapoolAddDeckUrl } from "../../lib/manapool/links";
import { useStoreInfo } from "../stores/store-provider";
import {
  exportDialogCopy,
  exportLinkOutCopy,
  exportShoppingCopy,
  exportTabCopy,
  overCopy,
} from "../../lib/copy/decks-builder";
import { priceCopy } from "../../lib/copy/price";
import { deckBodySize } from "../../lib/decks/deck-size";

type Tab = "decklist" | "shopping";

/** The row asks for a deck id to key its owned ring on; an export is of no deck's list, so one fixed key. */
const EXPORT_DECK_ID = "export";

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
  shoppingCards: ExportShoppingCard[];
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
  // The dialog wrapper is the host; the scrim beside it stays live (exempt) so a press on it still dismisses.
  const inertRef = useInertWhileOpen(open && !inert);
  const dialogHost = useCallback((el: HTMLDivElement | null) => { dialogRef.current = el; inertRef(el); }, [inertRef]);

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
        {...inertExemptProps}
      />
      {/* Single aria-live status region — hoisted here so it renders exactly once regardless of layout path */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      {/* Positioning wrapper — pointer-events pass through to the overlay so
          clicking outside either layout still dismisses. */}
      <div
        ref={dialogHost}
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
            maxHeight: "min(85dvh, 760px)",
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
          className="flex flex-col md:hidden absolute left-0 right-0 bottom-0 pointer-events-auto anim-sheet-in-phone"
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
  shoppingCards: ExportShoppingCard[];
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
  // A whole-list link, so only for a store with a cart (store choice, call 6). The Shopping tab's list and its copy
  // button stand in for any other store, as the paste row does on the strip.
  const store = useStoreInfo();
  // Both layouts mount, so the tab ids carry the layout's own id.
  const tabIds = useId();
  const shoppingUrl = store.cart ? manapoolAddDeckUrl(shoppingCards) : null;

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
            className={`${TOUCH_HIT} bg-transparent border-none text-[color:var(--fg-faint)]`}
            style={{ fontSize: 17 }}
            aria-label={exportDialogCopy.closeAria}
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="-mr-[8px] flex h-[36px] w-[36px] cursor-pointer items-center justify-center border-none bg-transparent text-[15px] text-[color:var(--fg-muted)]"
            aria-label={exportDialogCopy.closeAria}
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-none" style={{ padding: isMobile ? "14px 18px 0" : "0 24px 16px" }}>
        <SegmentedSwitch
          kind="tabs"
          ariaLabel={exportDialogCopy.title}
          segments={[
            { value: "decklist", label: exportTabCopy.decklist },
            { value: "shopping", label: exportTabCopy.shopping },
          ]}
          value={tab}
          onChange={setTab}
          fill={isMobile}
          ids={{ tab: (v) => `${tabIds}-tab-${v}`, panel: (v) => `${tabIds}-panel-${v}` }}
        />
      </div>
      {/* Body. min-h-0 is load-bearing: a flex item's default min-height is its
          content, so without it the body refuses to shrink and the modal's
          max-height has nothing to give. */}
      {/* `overscroll-contain` (Hugh, 2026-10-03): stops a scroll of this body at either
          end from chaining into the page behind the dialog. */}
      <div
        role="tabpanel"
        id={`${tabIds}-panel-${tab}`}
        aria-labelledby={`${tabIds}-tab-${tab}`}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
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
                <span key={line} style={{ color: "var(--accent-text)" }}>
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

            {/* The pricing note: one plain line at both widths. */}
            <p
              className={`m-0 font-mono text-[color:var(--fg-locked)] ${isMobile ? "px-[20px] pb-[2px] text-[9.5px]" : "px-[26px] pb-[10px] text-[11px]"}`}
            >
              {priceCopy.export.pricingNote}
            </p>

            {/* The shipped decklist row, read only (the precon page's). */}
            <ShoppingRows cards={shoppingCards} isMobile={isMobile} />
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

      </div>

      {/* Buy the shopping list at Mana Pool, the store with a cart. Absent, not disabled, on the
          Decklist tab, when there is nothing left to buy, and for a store with no cart. */}
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

/**
 * The Shopping tab's rows: the shipped read-only `DecklistRow`, so a row here is the row the deck page draws. The row
 * needs a card-detail provider (the deck page has one, and the /decks tile menu mounts one around this dialog) and
 * the hover preview's own, which the rows borrow.
 */
function ShoppingRows({ cards, isMobile }: { cards: ExportShoppingCard[]; isMobile: boolean }) {
  return (
    <HoverPreviewProvider>
      <ul className={`m-0 flex list-none flex-col gap-[4px] ${isMobile ? "px-[14px] pb-[12px] pt-[8px]" : "px-[22px] pb-[12px] pt-[4px]"}`}>
        {cards.map((card) => (
          <li key={card.oracleId}>
            <DecklistRow deckId={EXPORT_DECK_ID} readOnly card={card} newestAsOf={null} />
          </li>
        ))}
      </ul>
    </HoverPreviewProvider>
  );
}
