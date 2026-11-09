"use client";
// The card modal's content column: the `card-sheet` half of what `CardModal` draws inside its dialog (demo split 5k-2).
// Pure and props-only (the landing's demo draws it from fixture data): every value, ref and handler is CardModal's,
// handed in. What writes (the wishlist box, the proxy box, the token deck box) or builds a printing region crosses as a
// node or render function built in CardModal, in the same place and under the same gate.

import React, { type ReactNode, type RefObject } from "react";
import type { BrowseCard, BrowsePrinting, PreferredPrinting } from "../../lib/collection/browse";
import { printedNameOf, WUBRG_COLOR } from "../../lib/collection/browse";
import { ArtLayer } from "../ui/art-layer";
import { identityGradient } from "../../lib/cards/gradients";
import { printingPickerCopy } from "../../lib/copy/collection";
import { printedNameCopy } from "../../lib/copy/card-surfaces";
import { cardCarouselCopy, cardSheetCopy } from "../../lib/copy/card-carousel";
import { deckPrintingsCopy } from "../../lib/copy/deck-printings";
import { ManaCost } from "./mana-pips";
import { ComboPartnersDetail } from "./combo-partners-detail";
import type { CardCombo } from "../../lib/combos/near-combos";
import { ExternalLink } from "../ui/external-link";
import { SHEET, type SheetSnap } from "./card-sheet-gesture";
import type { SheetFooterLayout } from "./card-detail-context";
import { Chevron } from "../ui/chevron";
import { OracleText } from "./oracle-text";
import { ProxyDetail, BracketFactsDetail, OwnedLine, AvailabilityDetail } from "./card-detail-blocks";

const pickerCopy = printingPickerCopy.printing;

const RARITY_LABEL: Record<BrowseCard["rarity"], string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic",
};

const IDENTITY_NAME: Record<string, string> = {
  "": "Colorless",
  W: "White", U: "Blue", B: "Black", R: "Red", G: "Green",
};

function identityName(id: string[]): string {
  if (id.length === 0) return "Colorless";
  if (id.length === 1) return IDENTITY_NAME[id[0]];
  return id.join("/");
}

// The printing region's two instances (the mobile and desktop meta blocks are parallel trees, so each needs its own id).
const REGION_MOBILE = "printings-mobile";
const REGION_DESKTOP = "printings-desktop";

export type CardModalSheetProps = {
  card: BrowseCard;
  /** The card as shown (the printing on screen). */
  preview: BrowseCard;
  resolved: BrowsePrinting | undefined;
  titleId: string;
  caption: string;
  ownedPrintings: BrowsePrinting[];
  hasPicker: boolean;
  isToken: boolean;
  tokenNoSet: boolean;
  pick: PreferredPrinting | null;
  deckScope: boolean;
  total: number;
  position: number;
  deckPage: React.ComponentProps<typeof OwnedLine>["deckPage"];
  deckName: string | null;
  buyUrl: string | null;
  buyLabel: string;
  min: boolean;
  full: boolean;
  zoomed: boolean;
  viewOpen: boolean;
  cramped: boolean;
  gentle: boolean;
  sheetFull: boolean;
  teaserHeight: number;
  closeReserve: number;
  back: string | null | undefined;
  /** Undefined off the phone, where a drag-select in the column's text must stay a drag-select. */
  onSheetPointerDown: React.PointerEventHandler<HTMLDivElement> | undefined;
  setSnap: (snap: SheetSnap) => void;
  priceTag: ReactNode;
  fromLine: (phone: boolean) => ReactNode;
  doorStrip: ReactNode;
  footer: ((layout: SheetFooterLayout, priced?: boolean) => ReactNode) | null;
  figured: boolean;
  /** The expanded printing region for one instance. The node MUST carry the given `id`: the picker trigger's `aria-controls` points at it. */
  printingRegion: (id: string) => ReactNode;
  wishlistBox: ReactNode;
  proxyBox: ReactNode;
  tokenDeckBox: ReactNode;
  openCombo: boolean | undefined;
  onOpenCombo: ((combo: CardCombo, card: BrowseCard) => void) | null | undefined;
  onSelectCard: React.ComponentProps<typeof ComboPartnersDetail>["onSelectPartner"];
  expanded: boolean;
  triggerAria: string;
  onToggleExpanded: () => void;
  /** The Find a deck door for a layout, or null where the card has none (it reads a reader's moments and targets, so it is CardModal's). */
  fitsDoor: ((layout: "row" | "column") => ReactNode) | null;
  onEditCopies: React.ComponentProps<typeof AvailabilityDetail>["onEditCopies"];
  receiptLink: React.ComponentProps<typeof AvailabilityDetail>["receiptLink"];
  onPrev: (() => void) | null | undefined;
  onNext: (() => void) | null | undefined;
  sheetRef: RefObject<HTMLDivElement | null>;
  gripRef: RefObject<HTMLButtonElement | null>;
  doorRef: RefObject<HTMLDivElement | null>;
  sheetBodyRef: RefObject<HTMLDivElement | null>;
  mobileTriggerRef: RefObject<HTMLButtonElement | null>;
  desktopTriggerRef: RefObject<HTMLButtonElement | null>;
  prevButtonRef: RefObject<HTMLButtonElement | null>;
  nextButtonRef: RefObject<HTMLButtonElement | null>;
  registerCloseRef: (el: HTMLButtonElement | null) => void;
  registerBackRef: (el: HTMLButtonElement | null) => void;
  onClose: () => void;
};

export function CardModalSheet({
  card, preview, resolved, titleId, caption, ownedPrintings, hasPicker, isToken, tokenNoSet, pick, deckScope, total, position,
  deckPage, deckName, buyUrl, buyLabel, min, full, zoomed, viewOpen, cramped, gentle, sheetFull, teaserHeight, closeReserve, back,
  onSheetPointerDown, setSnap, priceTag, fromLine, doorStrip, footer, figured, printingRegion, wishlistBox, proxyBox, tokenDeckBox,
  openCombo, onOpenCombo, onSelectCard, expanded, triggerAria, onToggleExpanded, fitsDoor,
  onEditCopies, receiptLink, onPrev, onNext, sheetRef, gripRef, doorRef, sheetBodyRef, mobileTriggerRef, desktopTriggerRef,
  prevButtonRef, nextButtonRef, registerCloseRef, registerBackRef, onClose,
}: CardModalSheetProps) {
  return (
  <div
    ref={sheetRef}
    inert={zoomed || viewOpen}
    data-testid="card-sheet"
    data-sheet={min ? "min" : full ? "full" : "teaser"}
    // The phone's alone: on the desktop this column is a column, and a drag-select in its
    // text must stay a drag-select.
    onPointerDown={onSheetPointerDown}
    className={
      "min-w-0 flex flex-col overflow-hidden md:flex-1 md:relative"
      + " max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-[2] max-md:top-[var(--sheet-drag-top,var(--sheet-top))]"
      + " max-md:rounded-t-[18px] max-md:border-t max-md:border-[color:var(--border-strong)] max-md:bg-[color:var(--surface-rail)]"
      + " max-md:shadow-[0_-14px_34px_rgba(0,0,0,0.45)]"
      + " sheet-snap"
      + (gentle ? " sheet-gentle" : "")
      // The teaser does not scroll, so a vertical drag anywhere on it is the sheet's; it fills
      // to the 34px home inset. The full sheet's body scrolls; its grip drags it, and so does
      // a pull down from the body's top, where a scroll has nowhere to go.
      // At the min snap the shelf is the grip and the title row alone, 72 tall: no home inset,
      // which would leave the title 16px of it.
      + (full ? "" : min ? " max-md:touch-none" : " max-md:touch-none max-md:pb-[34px]")
    }
    style={{
      "--sheet-top": full
        ? `${SHEET.fullTop}px`
        : `calc(100% - ${min ? SHEET.minHeight : teaserHeight}px)`,
    } as React.CSSProperties}
  >
    {/* THE GRIP (plan PR 3, engineering call 2026-10-03): a native button, so Enter and
        Space work and a reader who cannot drag has the toggle `All details` gives. Its
        label names what a press does, so it carries no `aria-expanded` beside it. */}
    {cramped ? null : (
      <button
        ref={gripRef}
        type="button"
        data-sheet-grip=""
        // At the min snap the grip is the shelf's way back up, as a tap anywhere on it is.
        onClick={() => setSnap(min ? "teaser" : sheetFull ? "teaser" : "full")}
        aria-label={min ? cardSheetCopy.grabberAriaMinimized : cardSheetCopy.grabberAria(sheetFull)}
        // The ring draws INSIDE the grip: the sheet clips everything outside its own box, so
        // the default 2px offset left a reader one stray line under the grip.
        className="md:hidden flex h-[22px] w-full flex-none cursor-grab touch-none items-center justify-center rounded-t-[18px] border-0 bg-transparent p-0 focus-visible:-outline-offset-2"
      >
        <span aria-hidden className="block h-[4px] w-[36px] rounded-[2px]" style={{ background: "var(--border-strong)" }} />
      </button>
    )}
    {/* The stand-ins door (swap tools), which sat under the retired art header: at the
        sheet's head, at both snaps, with the teaser grown by its 44px to hold it. */}
    {/* Not at the min snap, whose shelf is the title row alone: there it leaves the flow and
        the accessibility tree but keeps its box, so the teaser's height (which counts it) does
        not drop by the strip and jump back when the reader returns to the teaser. */}
    {doorStrip !== null ? (
      <div
        ref={doorRef}
        className={(min ? "invisible absolute inset-x-0 top-0" : "md:hidden") + " flex-none"}
      >
        {doorStrip}
      </div>
    ) : null}
    {/* Desktop close button — §Desktop: Close Button. Over a sheet that names itself it
        becomes the way back to that sheet, in the same slot and on the same plate. */}
    {back ? (
      <button
        type="button"
        ref={registerBackRef}
        onClick={onClose}
        aria-label={cardSheetCopy.back.a11y(back)}
        data-testid="card-modal-back"
        className="hidden md:flex absolute items-center gap-[7px] whitespace-nowrap rounded-full bg-[color:var(--surface-raised)] border border-[color:var(--border-strong)] font-mono text-[11px] text-[color:var(--fg)]"
        style={{ top: 22, right: 24, height: 34, padding: "0 14px 0 12px" }}
      >
        <span aria-hidden>←</span>
        {back}
      </button>
    ) : (
      <button
        type="button"
        ref={registerCloseRef}
        onClick={onClose}
        aria-label="Close card details"
        className="hidden md:flex absolute items-center justify-center rounded-full bg-[color:var(--surface-raised)] border border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
        style={{ top: 22, right: 24, width: 34, height: 34, fontSize: 15 }}
      >
        ✕
      </button>
    )}

    {/* `overscroll-contain` (Hugh, 2026-10-03): stops a scroll of this body at either
        end from chaining into the page behind the modal. */}
    <div
      ref={sheetBodyRef}
      className={
        "flex-1 overflow-auto overscroll-contain p-[20px] md:p-[30px_32px] max-md:pt-0"
        + (full ? "" : " max-md:flex max-md:flex-col max-md:overflow-hidden max-md:pb-0")
      }
    >
      {/* Name + type + mana pips — §Mobile: Name + Type Header.
          Right padding on desktop clears the absolutely-positioned close
          button, which otherwise sits on top of the mana pips. */}
      {/* WRAPS, so the cost moves to its own line rather than squeezing the
          name into two. Flex wraps on an item's hypothetical width — the
          name's natural one-line width, since that block is `flex-initial`
          — so the rule falls out of the measurements rather than a
          threshold: `Find // Finality` wants 241px at 29px display and its
          split cost 173px, which together burst the 388px column, while
          `Smothering Tithe` at 285px plus a 57px two-pip cost does not.
          No card loses a line it had.

          A `flex-1` here would defeat it: a zero basis makes the row shrink
          the name instead of wrapping, which is the defect, while the class
          below still reads correctly. `probe:mana-symbols` measures the
          cost's own top against the title's for that reason.

          BOTH widths: on the phone this row is the head of the sheet, at both
          snaps. */}
      <div
        className="flex flex-wrap items-start justify-between gap-[12px] md:pr-[var(--close-reserve)]"
        style={{ "--close-reserve": `${closeReserve}px` } as React.CSSProperties}
      >
        <div className="min-w-0">
          {/* 24px at the phone's regular weight, as `PhoneHero.dc.html` draws the sheet's
              head; the desktop's 29px bold is unchanged. */}
          <h3
            id={titleId}
            className="font-display font-normal md:font-bold text-[24px] md:text-[29px] m-0 leading-[1.15] md:leading-[1.1]"
            style={{ color: "var(--fg)" }}
          >
            {printedNameOf(preview)}
          </h3>
          {/* The oracle name — absent, not blank, when the printing prints
              its own name. A reserved empty line would spend 23px on every
              ordinary card to make the ordinary case look incomplete. The
              tighter gap above binds the two names into one unit; the
              looser one below keeps the type line a separate fact. */}
          {preview.printedName && (
            <p
              className="flex items-baseline gap-[6px] text-[13px] md:text-[13.5px] mt-[5px] md:mt-[6px] mb-0"
              style={{ color: "var(--fg-body)" }}
            >
              <span
                className="font-mono text-[10.5px]"
                style={{ color: "var(--fg-faint)" }}
              >
                {printedNameCopy.oracleLabel}
              </span>
              {card.name}
            </p>
          )}
          {/* Type line — §Card Type Line: 13/14px, --fg-muted, margin-top 4/6px.
              10px above when the oracle line is present: the wider gap is
              what keeps the type line from joining the name pair. */}
          <p
            className={`text-[13px] md:text-[14px] ${
              preview.printedName ? "mt-[10px]" : "mt-[4px] md:mt-[6px]"
            }`}
            style={{ color: "var(--fg-muted)" }}
          >
            {card.typeLine}
          </p>
        </div>
        <div data-testid="modal-mana-cost" className="flex-none">
          <ManaCost cost={card.manaCost} />
        </div>
      </div>

      {/* THE SHEET'S SECOND LINE, at both snaps (README R2 "Teaser price"): the shipped price
          plate, moved here from under the retired art header, beside what the reader owns. */}
      {/* Below the min shelf's title row, so out of reach there as well as out of sight. */}
      <div inert={min} className="md:hidden mt-[12px] flex flex-wrap items-center gap-[12px]">
        {priceTag && (
          <div data-testid="modal-price-mobile">
            {/* THE PLATE, as the art-wash ratification defines it: opaque `--bg` under one
                `--border-strong` hairline at radius 7, with the `from` figure inside it. */}
            <span
              className="inline-flex items-center gap-[6px] rounded-[7px] p-[2px]"
              style={{ background: "var(--bg)", border: "1px solid var(--border-strong)" }}
            >
              <span data-testid="modal-price-tag-mobile">{priceTag}</span>
              {fromLine(true)}
            </span>
          </div>
        )}
        {resolved && (
          <span data-testid="teaser-set" className="font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>
            {cardSheetCopy.printing(resolved.setCode, resolved.collectorNumber)}
          </span>
        )}
        {/* A token has no owned count here (its holding is the deck row's own mark). */}
        {isToken ? null : <OwnedLine card={card} deckPage={deckPage} />}
      </div>

      {/* THE TEASER (README R2): three lines of oracle text under a fade, then `All details`,
          pinned above the home inset. A short text leaves its slack above the button, which
          is also the keyboard's and the screen reader's way to the rest. */}
      {!full && (
        <div inert={min} className="md:hidden flex min-h-0 flex-1 flex-col">
          {card.oracleText && (
            <div
              data-testid="teaser-oracle"
              // Two lines, not three, when the sheet's footer takes one for its note (call 9).
              className={"mt-[12px] min-h-0 overflow-hidden text-[13.5px] leading-[1.6] " + (footer ? "max-h-[44px]" : "max-h-[64px]")}
              style={{
                color: "var(--fg-body)",
                WebkitMaskImage: "linear-gradient(180deg, #000 55%, transparent)",
                maskImage: "linear-gradient(180deg, #000 55%, transparent)",
              }}
            >
              <OracleText text={card.oracleText} keywords={card.keywords} />
            </div>
          )}
          {footer ? (
            // A STACKED STAND-IN (stacked sheets R1, call 9): its note in the oracle's third
            // line, then a foot row shared 1 : 1.35 between All details and the sheet's action,
            // so the teaser stays 280 and the card keeps its 320.
            <>
              <div data-testid="teaser-footer-note" className="mt-auto pb-[6px] min-w-0">{footer("teaserNote", figured)}</div>
              <div className="-mx-[20px] grid min-h-[44px] flex-none grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] border-t border-[color:var(--border)]">
                <button
                  type="button"
                  onClick={() => setSnap("full")}
                  className="flex cursor-pointer items-center justify-center gap-[8px] border-0 border-r border-r-[color:var(--border)] bg-transparent p-0 text-[13.5px] text-[color:var(--fg-body)] focus-visible:-outline-offset-2"
                >
                  {cardSheetCopy.expand}
                  {/* Outside the chevron rule (Hugh, 2026-10-15): this lifts the sheet to full height, which neither
                      opens a list nor unfolds content in place, so it stays pointing up. */}
                  <Chevron open style={{ color: "var(--fg-faint)" }} />
                </button>
                <div data-testid="teaser-footer-action" className="flex items-center justify-center px-[12px]">{footer("teaserAction")}</div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSnap("full")}
              className="-mx-[20px] mt-auto flex min-h-[44px] flex-none cursor-pointer items-center justify-center gap-[8px] border-t border-[color:var(--border)] bg-transparent p-0 text-[13.5px] text-[color:var(--fg-body)] focus-visible:-outline-offset-2"
            >
              {cardSheetCopy.expand}
              {/* Outside the chevron rule, like the teaser's button above: it lifts the sheet. */}
              <Chevron open style={{ color: "var(--fg-faint)" }} />
            </button>
          )}
        </div>
      )}

      {/* The shipped details column. Always at desktop; on the phone, only in the full sheet. */}
      <div className={full ? undefined : "max-md:hidden"}>
        {/* Oracle text block — §Oracle Text Block: bg --bg, border 1px --border, radius 10px, padding 14px 16px / 18px 20px, margin-top 16/22px, 13.5/15px, --fg-body, line-height 1.6/1.65 */}
        {card.oracleText && (
          <div
            className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px] text-[13.5px] md:text-[15px] leading-[1.6] md:leading-[1.65]"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--fg-body)",
            }}
          >
            <OracleText text={card.oracleText} keywords={card.keywords} />
          </div>
        )}

        <BracketFactsDetail card={card} />
        {/* SECOND IN THE STACK: card fact, then PAIR fact, then copy facts. This block is
            the hinge where the reader crosses from what the card IS to what they HAVE,
            which is exactly what a pair fact is. */}
        <ComboPartnersDetail
          // The card as shown: the line's press names its printing, as the sheet it opens does.
          card={preview}
          deckName={deckName}
          onSelectPartner={onSelectCard}
          initiallyExpanded={openCombo}
          onOpenCombo={onOpenCombo ? (combo) => onOpenCombo(combo, preview) : null}
        />
        <AvailabilityDetail card={card} deckPage={deckPage} onEditCopies={onEditCopies} receiptLink={receiptLink} />
        <ProxyDetail card={card} />

        {/* Social R2 PR 5: the Wishlist box, its own box at the same place whatever opened the card (a deck's
            Shopping view included), after what the reader HAS and before the deck-scoped box. Absent while the
            switch is off for this reader. A write stales the provider's cached copy, as a proxy write does. */}
        {wishlistBox}

        {/* Deck-scoped, and absent without a deck: opened from `/collection`
            there is nothing for it to be about. */}
        {proxyBox}

        {/* A token's own deck box: its hand mark, the cards that make it and its printing line. */}
        {tokenDeckBox}

        {/* MOBILE meta grid — §Mobile: Meta 2×2 Grid. At 2+ printings the Set cell is
            promoted out of the grid into a full-width row below Rarity and Identity, so
            the disclosure and its region are last in the column and the grid is not
            pushed off-screen the moment you expand. */}
        {tokenNoSet ? null : (
        <div
          className="md:hidden mt-[16px] grid grid-cols-2 rounded-[10px] overflow-hidden"
          style={{ background: "var(--border)", gap: 1, border: "1px solid var(--border)" }}
        >
          {!hasPicker && (
            // Set + collector number of the printing on screen (§Phase 5) — the art is a
            // specific printing now, so the caption names it. A token's details draw this cell
            // alone, across the grid, since a token has no rarity, identity or owned count here.
            <MetaCell label="Set" value={caption} span={isToken ? 2 : undefined} />
          )}
          {isToken ? null : (
            <>
              <MetaCell label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
              <MetaCell label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
              <MetaCell
                label="You own"
                value={`×${card.quantity}`}
                quantity
                span={hasPicker ? 2 : undefined}
              />
            </>
          )}
        </div>
        )}

        {hasPicker && (
          <div className="md:hidden mt-[12px]">
            <MobileSetRow
              ref={mobileTriggerRef}
              controls={REGION_MOBILE}
              caption={caption}
              count={ownedPrintings.length}
              picked={pick === null ? null : deckScope ? deckPrintingsCopy.picker.pinned : pickerCopy.triggerPicked}
              expanded={expanded}
              expandAria={triggerAria}
              imageUri={resolved?.imageUri ?? null}
              colorIdentity={card.colorIdentity}
              onClick={onToggleExpanded}
            />
            {printingRegion(REGION_MOBILE)}
          </div>
        )}

        {/* DESKTOP meta flex row — §Desktop: Meta Fields */}
        <div className="hidden md:flex flex-wrap gap-[26px] mt-[24px]">
          {hasPicker ? (
            <PickerTrigger
              ref={desktopTriggerRef}
              controls={REGION_DESKTOP}
              caption={caption}
              count={ownedPrintings.length}
              picked={pick === null ? null : deckScope ? deckPrintingsCopy.picker.pinned : pickerCopy.triggerPicked}
              expanded={expanded}
              expandAria={triggerAria}
              onClick={onToggleExpanded}
            />
          ) : tokenNoSet ? null : (
            <MetaField label="Set" value={caption} />
          )}
          {isToken ? null : (
            <>
              <MetaField label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
              <MetaField label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
              <MetaField label="You own" value={`×${card.quantity} ${card.quantity === 1 ? "copy" : "copies"}`} quantity />
            </>
          )}
        </div>

        {hasPicker && <div className="hidden md:block">{printingRegion(REGION_DESKTOP)}</div>}

        {/* MOBILE link-out — in flow at the end of the scrolling column, not
            pinned. The hairline is load-bearing: it separates the link from
            the printings disclosure so it never reads as "buy this
            printing". Above md: the link lives in the pinned nav row. */}
        {/* Nothing to hold (an unpriced token, with no Fits door) draws no hairline either. */}
        {footer || (!buyUrl && !fitsDoor) ? null : (
          <div
            className="md:hidden flex flex-col mt-[14px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {buyUrl ? (
              <div className="flex items-center min-h-[44px]">
                <ExternalLink href={buyUrl} label={buyLabel} />
              </div>
            ) : null}
            {fitsDoor ? (
              fitsDoor("column")
            ) : null}
          </div>
        )}
      </div>
    </div>


    {/* DESKTOP Prev/Next — §Desktop: Prev/Next Navigation. With nothing to hold (an unpriced
        token opened alone) the row and its hairline are not drawn at all. */}
    <div
      className={`${footer || fitsDoor || buyUrl || total > 1 ? "hidden md:flex" : "hidden"} items-center gap-[16px] flex-none mx-[32px] mb-[30px] pt-[20px]`}
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {/* The link is first in the DOM because the focus trap follows DOM order
          from wherever focus starts. That start is now named — the dialog
          focuses the ✕ that has layout, since the art became a button and would
          otherwise have taken it — but the order after it is still this one. */}
      {footer ? footer("row") : fitsDoor ? (
        <span className="flex flex-col gap-[8px] min-w-0">
          {buyUrl ? <ExternalLink href={buyUrl} label={buyLabel} /> : null}
          {fitsDoor("row")}
        </span>
      ) : buyUrl ? <ExternalLink href={buyUrl} label={buyLabel} /> : null}
      {/* One / two (handoff decision 6): a list of one drops the whole counter and
          both dead controls, so the link beside it stands alone. */}
      {total > 1 ? (
        <span className="ml-auto flex items-center gap-[14px] flex-none">
          <button
            ref={prevButtonRef}
            type="button"
            onClick={onPrev ? () => onPrev() : undefined}
            // `aria-disabled`, never `disabled` (decision 5): the native attribute
            // takes the control out of the tab order, which is how a reader who
            // paged to an end lost focus to the body. `onClick` is already undefined
            // there, so the press itself is already a no-op.
            aria-disabled={!onPrev}
            aria-label={cardCarouselCopy.prevAria}
            className={
              "cursor-pointer text-[15px] text-[color:var(--fg-faint)]"
              + (onPrev ? "" : " opacity-40")
            }
          >
            ‹ Prev
          </button>
          <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
            {cardCarouselCopy.position(position, total)}
          </span>
          <button
            ref={nextButtonRef}
            type="button"
            onClick={onNext ? () => onNext() : undefined}
            aria-disabled={!onNext}
            aria-label={cardCarouselCopy.nextAria}
            className={
              "cursor-pointer text-[15px] text-[color:var(--accent-text)]"
              + (onNext ? "" : " opacity-40")
            }
          >
            Next ›
          </button>
        </span>
      ) : null}
    </div>
    {/* In the full sheet the sheet's action pins to its foot (call 9); the teaser draws its own. */}
    {footer && full ? <div data-testid="sheet-footer-foot" className="md:hidden flex-none">{footer("foot", figured)}</div> : null}
  </div>
  );
}

function MetaCell({
  label, value, identity, quantity, rarity, span,
}: {
  label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean;
  /** 2 when the Set cell has been promoted out and an odd cell would leave a hole. */
  span?: 2;
}) {
  return (
    // §Mobile: Meta Cell: bg --surface, padding 11px 14px
    <div
      className={span === 2 ? "p-[11px_14px] col-span-2" : "p-[11px_14px]"}
      style={{ background: "var(--surface)" }}
    >
      <div
        className="font-mono uppercase text-[9.5px] tracking-[0.12em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-[6px] mt-[3px]">
        {identity && identity.length > 0 && (
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: 12, height: 12,
              background: identity.length === 1
                ? WUBRG_COLOR[identity[0]] ?? "var(--fg-faint)"
                : "var(--fg-faint)",
            }}
          />
        )}
        <span
          className={quantity || rarity ? "font-mono" : ""}
          style={{
            color: quantity || rarity ? "var(--accent-text)" : "var(--fg)",
            fontSize: 13,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function MetaField({
  label, value, identity, quantity, rarity,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean }) {
  return (
    <div>
      {/* §Meta Label desktop: mono 10px, letter-spacing 0.14em, uppercase, --fg-faint */}
      <div
        className="font-mono uppercase text-[10px] tracking-[0.14em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-[6px] mt-[5px]">
        {identity && identity.length > 0 && (
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: 13, height: 13,
              background: identity.length === 1
                ? WUBRG_COLOR[identity[0]] ?? "var(--fg-faint)"
                : "var(--fg-faint)",
            }}
          />
        )}
        <span
          className={quantity || rarity ? "font-mono text-[14px]" : "text-[14px]"}
          style={{ color: quantity || rarity ? "var(--accent-text)" : "var(--fg)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * The third line both triggers share: `N printings you own ▾` before a pick, and the brand
 * diamond + `Your pick · of N ▾` after one.
 */
function TriggerHint({ count, picked, expanded }: { count: number; picked: string | null; expanded: boolean }) {
  const chevron = <Chevron kind="disclosure" open={expanded} />;
  if (picked === null) {
    return (
      <div className="font-mono text-[11px] mt-[4px]" style={{ color: "var(--accent-text)" }}>
        {pickerCopy.triggerCount(count)} {chevron}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[5px] mt-[4px]">
      <span aria-hidden className="rotate-45" style={{ width: 7, height: 7, background: "var(--accent)" }} />
      <span
        className="font-mono uppercase text-[10px] tracking-[0.14em]"
        style={{ color: "var(--accent-text)" }}
      >
        {picked}
      </span>
      <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
        {pickerCopy.triggerPickedOf(count)} {chevron}
      </span>
    </div>
  );
}

/**
 * Desktop: the shipped `Set` MetaField wrapped in a disclosure button. The negative margin
 * cancels the padding so the meta row's 26px gap rhythm is unchanged.
 */
function PickerTrigger({
  ref, controls, caption, count, picked, expanded, onClick, expandAria,
}: {
  ref: React.Ref<HTMLButtonElement>;
  controls: string;
  caption: string;
  count: number;
  /** The pinned line's label when a pick stands, else null. */
  picked: string | null;
  expanded: boolean;
  onClick: () => void;
  /** The button's label while the region is closed. */
  expandAria: string;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      // The region is unmounted while collapsed, so the reference goes with it — a trigger
      // pointing at a missing element is a broken relationship, not an empty one.
      aria-controls={expanded ? controls : undefined}
      aria-label={expanded ? pickerCopy.triggerCollapseAria : expandAria}
      className="cursor-pointer text-left rounded-[8px] p-[8px_12px] m-[-8px_-12px] bg-[color:var(--elevated)] border border-[color:var(--border-dashed)]"
    >
      <div className="font-mono uppercase text-[10px] tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {pickerCopy.triggerLabel}
      </div>
      <div className="mt-[5px] text-[14px]" style={{ color: "var(--fg)" }}>{caption}</div>
      <TriggerHint count={count} picked={picked} expanded={expanded} />
    </button>
  );
}

/**
 * Mobile: the Set cell promoted out of the 2×2 grid into a full-width row. The 40×56 thumbnail
 * identifies the current printing beside art that is already showing it — it is not a
 * substitute for the art panel.
 */
function MobileSetRow({
  ref, controls, caption, count, picked, expanded, imageUri, colorIdentity, onClick, expandAria,
}: {
  ref: React.Ref<HTMLButtonElement>;
  controls: string;
  caption: string;
  count: number;
  /** The pinned line's label when a pick stands, else null. */
  picked: string | null;
  expanded: boolean;
  imageUri: string | null;
  colorIdentity: string[];
  onClick: () => void;
  expandAria: string;
}) {
  // The identity is the ground; the art, when there is one, fades in over it (`ArtLayer`).
  const thumbStyle: React.CSSProperties = { background: identityGradient(colorIdentity) };
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      // The region is unmounted while collapsed, so the reference goes with it — a trigger
      // pointing at a missing element is a broken relationship, not an empty one.
      aria-controls={expanded ? controls : undefined}
      aria-label={expanded ? pickerCopy.triggerCollapseAria : expandAria}
      className="cursor-pointer w-full text-left flex items-center gap-[12px] p-[11px_14px] bg-[color:var(--elevated)] border border-[color:var(--border-dashed)]"
      style={{
        minHeight: 62,
        // Square-bottomed while open so the region reads as a continuation of this row.
        borderRadius: expanded ? "10px 10px 0 0" : 10,
      }}
    >
      <span
        aria-hidden
        className="relative flex-none overflow-hidden rounded-[5px]"
        style={{ width: 40, height: 56, ...thumbStyle, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
      >
        {imageUri ? <ArtLayer src={imageUri} style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block font-mono uppercase text-[9.5px] tracking-[0.12em]"
          style={{ color: "var(--fg-faint)" }}
        >
          {pickerCopy.triggerLabel}
        </span>
        <span className="block mt-[3px] text-[13px]" style={{ color: "var(--fg)" }}>{caption}</span>
        <TriggerHint count={count} picked={picked} expanded={expanded} />
      </span>
    </button>
  );
}
