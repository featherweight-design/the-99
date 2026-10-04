"use client";
// Card detail modal per property table §Card Detail Modal.
// - Mobile: full-screen sheet, art up top with color-identity gradient fallback
// - Desktop: 820px centered overlay, two-column (320px art + content), Prev/Next
// - Focus trap (READINESS #5): queries focusable children, wraps Tab/Shift+Tab
// - Escape closes; focus returns to the previously-focused element on close

import Link from "next/link";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import type { BrowseCard, PreferredPrinting, BrowsePrinting } from "../../lib/collection/browse";
import {
  cssUrl,
  printedNameOf,
  printingCaption,
  matchesPreference,
  resolvedPrinting,
  cardArt,
  type CardArt,
  WUBRG_COLOR,
} from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { printingPickerCopy } from "../../lib/copy/collection";
import { availabilityState, type DeckClaim } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { allocateClaims } from "../../lib/decks/allocate";
import { AvailabilityMarker } from "../ui/availability-marker";
import { clearCardArtPreference, setCardArtPreference } from "../../app/collection/actions";
import { ManaCost } from "./mana-pips";
import { CardFactMark } from "./card-fact-mark";
import { ComboPartnersDetail } from "./combo-partners-detail";
import { cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { PrintingRegion, OVERFLOW_THRESHOLD, printingEntryCount, printingKey } from "./printing-region";
import { PriceTag } from "./price-tag";
import { cheapestLiveCents, priceFor, priceKeyFor } from "../../lib/cards/price-lookup";
import { formatCents, priceOf, priceState } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { faceNames, isTwoFaced } from "../../lib/cards/faces";
import { cardZoomCopy, printedNameCopy, twoFacedCopy } from "../../lib/copy/card-surfaces";
import { ExternalLink } from "../ui/external-link";
import { manapoolCardUrl } from "../../lib/manapool/links";
import { FitsDoor } from "./fits-door";
import { cardLinkOutCopy } from "../../lib/copy/collection-browse";
import { cardCarouselCopy } from "../../lib/copy/card-carousel";
import type { SiblingCard } from "./card-detail-provider";
import { useMinWidth } from "../ui/use-min-width";
import { ProxyControl } from "../decks/proxy-control";
import { proxyCopy } from "../../lib/copy/proxies";

const pickerCopy = printingPickerCopy.printing;

// Renders oracle text with paragraph breaks, italic reminder text, and bolded keywords.
function OracleText({ text, keywords }: { text: string; keywords: string[] }) {
  const paragraphs = text.split("\n");

  // Build a regex that matches parenthesized runs and keyword occurrences.
  // Keywords are matched at word boundaries, case-insensitively, outside parens.
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  function renderParagraph(para: string, idx: number) {
    // Tokenize into: (paren runs), keyword runs, and plain text.
    // Process character by character: collect paren spans, then keyword matches on the rest.
    const parts: React.ReactNode[] = [];
    let remaining = para;
    let key = 0;

    while (remaining.length > 0) {
      // Check for parenthesized run next.
      const parenStart = remaining.indexOf("(");
      const kwPattern = escaped.length > 0
        ? new RegExp(`\\b(${escaped.join("|")})\\b`, "i")
        : null;
      const kwMatch = kwPattern ? kwPattern.exec(remaining) : null;

      // Determine which comes first: paren or keyword.
      const parenIdx = parenStart === -1 ? Infinity : parenStart;
      const kwIdx = kwMatch ? kwMatch.index : Infinity;

      if (parenIdx === Infinity && kwIdx === Infinity) {
        // Only plain text remains.
        parts.push(remaining);
        break;
      }

      if (parenIdx <= kwIdx) {
        // Flush text before paren.
        if (parenStart > 0) {
          parts.push(remaining.slice(0, parenStart));
        }
        const parenEnd = remaining.indexOf(")", parenStart);
        if (parenEnd === -1) {
          // Unclosed paren — treat rest as plain text.
          parts.push(remaining.slice(parenStart));
          break;
        }
        const parenContent = remaining.slice(parenStart, parenEnd + 1);
        parts.push(<em key={key++} className="italic">{parenContent}</em>);
        remaining = remaining.slice(parenEnd + 1);
      } else {
        // Keyword comes first — flush text before it.
        if (kwMatch!.index > 0) {
          parts.push(remaining.slice(0, kwMatch!.index));
        }
        parts.push(
          <strong key={key++} className="font-semibold" style={{ color: "var(--fg)", fontWeight: 600 }}>
            {kwMatch![0]}
          </strong>
        );
        remaining = remaining.slice(kwMatch!.index + kwMatch![0].length);
      }
    }

    return <p key={idx} className={idx > 0 ? "mt-[0.5em]" : ""}>{parts}</p>;
  }

  return <>{paragraphs.map(renderParagraph)}</>;
}

/**
 * The one place on `/collection` that names the decks holding a card, and the
 * one place those names are links. Rows and tiles are count-only, and both sit
 * inside a `role="button"` or an option row, where a nested link would be
 * invalid.
 *
 * The block is a RECEIPT and it has to add up (#353/#355). It renders the
 * collection total, then one row per claiming deck with that deck's own ask,
 * then the split those rows produce — `in use + free === owned`. Every figure
 * comes from the availability query, never from arithmetic done here, so the
 * rows and the split cannot disagree with the marker above them.
 *
 * The summary marker is `nameless` on purpose even though this surface has room
 * for a name: the rows below name every claimant, and having the marker single
 * one out would both duplicate a link and make the choice of which deck to name
 * look meaningful when it is only "first by name".
 *
 * The claiming decks' status pills are deliberately absent. Addendum 2 §3 draws
 * `×1 · ◆ none free — in Atraxa [Complete]`, but a `DeckClaim` carries maturity
 * as one bit and `statusPill()` needs that deck's built/owned/unresolved counts.
 * Deriving "Complete" from `mature` would be a guess that reads as fact, so the
 * clause ships without it. The link is the honest version of the same impulse:
 * it takes you to the pill instead of inventing one.
 */
/**
 * The decks printing this card, below the receipt's own accounting.
 *
 * ITS OWN BLOCK, not a section inside `AvailabilityDetail`, because that
 * component returns null for a card the player owns none of — and the headline
 * proxy is exactly that card. Folded in, the Ozolith case would have rendered
 * nothing at all.
 *
 * No right-hand column: `holds N` / `wants N` are quantities of cardboard and
 * there is none here, so the missing figure IS the statement.
 */
function ProxyDetail({ card }: { card: BrowseCard }) {
  const decks = card.proxiedBy ?? [];
  if (decks.length === 0) return null;
  const c = proxyCopy.receipt;
  return (
    <div
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div
        id="proxy-decks-heading"
        className="font-mono text-[10px] tracking-[0.1em] uppercase"
        style={{ color: "var(--fg-faint)" }}
      >
        {c.heading}
      </div>
      <ul aria-labelledby="proxy-decks-heading" className="m-0 mt-[6px] list-none p-0">
        {decks.map((deck) => (
          <li key={deck.id} className="py-[2px] text-[13px]" style={{ color: "var(--fg-body)" }}>
            {/* `block`, because `truncate` needs a block box to ellipsize in: an
                inline link inside this `li` keeps its own intrinsic width, and a
                deck name may be 120 characters — which then runs out of the
                sheet rather than trailing off. */}
            <Link
              href={`/decks/${deck.id}`}
              aria-label={c.deckLinkAria(deck.name)}
              className="block truncate underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current"
            >
              {deck.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-[8px] text-[13px]" style={{ color: "var(--fg-muted)" }}>
        {c.note(decks.length)}
      </p>
    </div>
  );
}

/**
 * The three standing bracket facts, spelled out.
 *
 * ITS OWN BLOCK between the oracle text and the availability receipt, because these are facts
 * about the CARD with no deck in scope — true on a tile for a card sleeved nowhere — while
 * everything below it describes this player's copies.
 *
 * The modal is the one surface with room to say the words, so it does: this is where a reader
 * who never met the key learns the vocabulary. Glyph plus name per line and nothing else.
 *
 * NO PROVENANCE. "Flagged by both sources" and its siblings are Round 2's, which designs the
 * slot for the three detection sentences — writing one here would hand that round a slot it
 * did not design. And NO EMPTY STATE: a card with no facts renders null, exactly as
 * `AvailabilityDetail` does rather than saying "nothing to report". A drawn absence would read
 * as a cleared check, and detection on two of the three is measured and partial.
 */
export function BracketFactsDetail({ card }: { card: BrowseCard }) {
  const facts = card.facts ?? [];
  if (facts.length === 0) return null;
  return (
    <div
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <h3
        className="font-mono text-[9.5px] md:text-[10px] uppercase tracking-[0.14em] mb-[10px]"
        style={{ color: "var(--fg-faint)" }}
      >
        {cardMarkCopy.modalHeading}
      </h3>
      <ul className="flex flex-col gap-[8px]">
        {facts.map((fact) => (
          <li key={fact} className="flex items-center gap-[10px]">
            {/* The name beside it IS the accessible name, so the glyph goes silent rather
                than saying it twice. */}
            <CardFactMark fact={fact} silent />
            <span className="text-[13.5px] md:text-[15px]" style={{ color: "var(--fg-body)" }}>
              {cardFactName(fact)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A claim's line: what this list asked for, and — when one copy cannot cover them all — which
 * list actually gets it.
 *
 * TWO AXES, NEVER ONE. `holds` / `wants` is commit status and stays that way: the card
 * assignments handoff (R2, vocabulary ruling 4) considered keying them on allocation and
 * rejected it, because `wants 1` would then mean "committed but lost the copy" on one row and
 * "not committed at all" on the next. Allocation is the third axis and takes the third pair
 * the same ruling defined, `gets it` / `buys it`, which is what `/decks/[id]/changes` already
 * draws for this exact question.
 *
 * The allocation half prints only while the card is contested. With copies enough for
 * everyone every committed deck gets its ask, and `gets it` on every row is a word per row
 * saying nothing.
 */
function claimLabel(claim: DeckClaim, allocated: number, contested: boolean): string {
  const c = availabilityCopy.collection;
  if (!claim.mature) return c.detailClaimWants(claim.quantity);
  const holds = c.detailClaimHolds(claim.quantity);
  if (!contested) return holds;
  if (allocated === 0) return `${holds} · ${c.detailClaimBuys}`;
  if (allocated < claim.quantity) {
    return `${holds} · ${c.detailClaimGetsPartial(allocated, claim.quantity)}`;
  }
  return `${holds} · ${c.detailClaimGets}`;
}

function AvailabilityDetail({ card, deckPage }: { card: BrowseCard; deckPage: boolean }) {
  const a = card.availability;
  if (!a) return null;
  const state = availabilityState(a);
  // A claim with copies to spare still reads as `free` — that is the state the
  // marker is right to draw — but it is exactly the case #353 was filed about,
  // so the receipt renders on claims, not on state.
  if (state === "free" && a.claims.length === 0) return null;
  const c = availabilityCopy.collection;
  // Who actually gets each copy, from the one implementation of that arithmetic — the same
  // call the arrivals receipt and the chooser's preview make. A row's verb is this and not
  // `claim.mature`: a committed deck that came second to the only copy owned holds nothing.
  const allocation = allocateClaims(a);
  const allocated = new Map(allocation.map((cl) => [cl.deckId, cl.allocated]));
  // Contested means a committed deck asked for a copy the supply could not give it. Only then
  // does saying who gets it tell the reader anything.
  const contested = allocation.some((cl) => cl.allocated < cl.quantity);
  // The brews, which no figure in this block counts. Named where a committed deck is already
  // in play; in the soft state every claimant is one and `detailSoftNote` says so already.
  const brews = a.claims.filter((cl) => !cl.mature).length;
  const note =
    state === "hard" ? c.detailHardNote
    : state === "soft" ? c.detailSoftNote(a.claims.filter((cl) => !cl.mature).length)
    // No note for `over` (H21, Hugh's walk 2026-10-02): the block above already names the
    // decks that want it and the shortfall, and the reassurance it used to add is the kind
    // of line refresh.ts's voice rule forbids.
    : null;
  return (
    // Mirrors the oracle-text block's chrome so the two read as one column.
    <div
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div
        className="font-mono text-[10px] tracking-[0.1em] uppercase"
        style={{ color: "var(--fg-faint)" }}
      >
        {c.detailHeading}
      </div>
      <div
        className="mt-[8px] flex items-center gap-[8px] text-[13px]"
        style={{ color: "var(--fg-body)" }}
      >
        {/* `a.owned`, not `card.quantity`: the two arrive from different
            queries, and the split below is `a.hard + a.free`. A total taken
            from anywhere but the availability query is how a receipt stops
            adding up. */}
        <span className="font-mono" style={{ color: "var(--accent)" }}>×{a.owned}</span>
        {state !== "free" && (
          <>
            <span aria-hidden style={{ color: "var(--fg-faint)" }}>·</span>
            {/* Row density supplies no type of its own, and this line is not a
                mono meta line either, so the canvas's 12px mono is set here. */}
            <AvailabilityMarker
              availability={a}
              density="row"
              nameless
              bareOne={deckPage}
              className="font-mono text-[12px]"
            />
          </>
        )}
      </div>
      {a.claims.length > 0 && (
        <>
          <div
            id="availability-claims-heading"
            className="mt-[14px] font-mono text-[10px] tracking-[0.1em] uppercase"
            style={{ color: "var(--fg-faint)" }}
          >
            {c.detailClaimsHeading}
          </div>
          <ul
            aria-labelledby="availability-claims-heading"
            className="m-0 mt-[6px] list-none p-0"
          >
            {a.claims.map((claim) => (
              <li
                key={claim.id}
                className="flex items-baseline justify-between gap-[12px] py-[2px] text-[13px]"
                style={{ color: "var(--fg-body)" }}
              >
                <Link
                  href={`/decks/${claim.id}`}
                  aria-label={c.detailDeckLinkAria(claim.name)}
                  className="truncate underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current"
                >
                  {claim.name}
                </Link>
                <span className="shrink-0 font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>
                  {claimLabel(claim, allocated.get(claim.id) ?? 0, contested)}
                </span>
              </li>
            ))}
          </ul>
          <div
            className="mt-[8px] font-mono text-[12px]"
            style={{ color: "var(--fg-muted)" }}
          >
            {a.free < 0 ? c.detailSplitOver(a.hard, a.owned) : c.detailSplit(a.hard, a.free)}
          </div>
          {brews > 0 && state !== "soft" && (
            <p
              className="m-0 mt-[6px] text-[12.5px] leading-[1.5]"
              style={{ color: "var(--fg-muted)" }}
            >
              {c.detailDraftsUncounted(brews)}
            </p>
          )}
        </>
      )}
      {note && (
        <p className="m-0 mt-[8px] text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

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

/**
 * How far below the top a STACKED card sheet starts on the phone: 96px, drawn by this class.
 *
 * 96 is the canvas's figure (`The 99 - Verdict Addendum.dc.html` §5a): the receipt sits at 52
 * and the card sheet 44 below it, which is the receipt's header row — its glyph, its title and
 * its count, so the reader can read what they will land on. The addendum's prose says "12px
 * lower", which leaves a hairline of chrome and no header; the drawing and the prose's own
 * reason ("a visible strip of the receipt's own chrome") both say 44.
 */
const STACKED_SHEET =
  "max-md:!h-[calc(100%-96px)] max-md:rounded-t-[14px] max-md:border-t max-md:border-[color:var(--border-strong)]";
/**
 * The swap tools' card → sheet → card path draws a third depth (audit F16): the card itself at 52
 * once a sheet opens over it, that sheet at 96, and a stand-in over the sheet at 140. The step is
 * 44, which leaves each layer's header showing above the one on top as the way back.
 */
const PHONE_TOP: Record<52 | 96 | 140, string> = {
  52: "max-md:!h-[calc(100%-52px)] max-md:rounded-t-[14px] max-md:border-t max-md:border-[color:var(--border-strong)]",
  96: STACKED_SHEET,
  140: "max-md:!h-[calc(100%-140px)] max-md:rounded-t-[14px] max-md:border-t max-md:border-[color:var(--border-strong)]",
};
/**
 * The door's rows in the desktop art column, added to the stack's reservation so the art gives
 * them room: 8 above the block, the stack's 6 gap, a 16px limit line, 8 between, and a 21px link.
 */
const DOOR_HEIGHT = 8 + 6 + 16 + 8 + 21;

/**
 * The art column's own padding (28px, matching its other three edges).
 */
const ART_COLUMN_FOOT_PADDING_PX = 28;

/**
 * How much the art width formula's `calc()` subtracts: the stack's own height, doubled (equal
 * slack above and below the art), plus the column's 28px foot padding on both sides of that
 * doubling (one for the padding the bottom half must still show, one because shrinking the art
 * only buys back half of it on each side — see the derivation at the call site).
 *
 * Exported and pure so a test can assert the wiring directly, without parsing a rendered
 * `calc()` string back out of jsdom's style attribute: jsdom drops this property rather than
 * retain a value in a syntax it cannot parse.
 */
export function artWidthReservePx(underCardHeight: number): number {
  return 2 * underCardHeight + ART_COLUMN_FOOT_PADDING_PX * 2;
}

/**
 * A desktop neighbor plate (handoff decision 2): the whole card, scaled down, on the backdrop
 * 24px off the modal, with the name under it in 12.5px `--fg-muted`. 168x235 at 63/88 — the
 * card ratio exactly, which is also how the ~1252px threshold was derived (decision 4).
 *
 * Art first, then identity, then a bare plate (handoff "Notes for engineering" §2): a sibling
 * carrying only an id draws no text at all, since there is none to draw.
 */
// The dialog's own fixed desktop geometry (`md:w-[820px]`) and the 24px gap decision 2 draws
// between it and a plate — the same two constants the 1252px threshold comment derives from.
// Kept here, beside the one place that reads them, rather than exported: nothing else needs
// them, and the threshold's own comment is free to keep stating the arithmetic in prose.
const DIALOG_HALF_WIDTH = 410;
const PLATE_GAP = 24;
const PLATE_WIDTH = 168;

const NeighborPlate = React.forwardRef<
  HTMLButtonElement,
  { sibling: SiblingCard; direction: "previous" | "next"; onPress: () => void }
>(function NeighborPlate({ sibling, direction, onPress }, ref) {
  const art = sibling.imageUri
    ? { backgroundImage: cssUrl(sibling.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : sibling.colorIdentity
    ? { background: identityGradient([...sibling.colorIdentity]) }
    : { background: "var(--elevated)" };
  // Anchored from the BACKDROP's own center rather than carried as a flex sibling of the
  // centered dialog (pre-open review, round 1): a flex sibling present on only one side
  // shifts the dialog itself by its width-plus-gap, which moved the dialog and its footer
  // controls under the reader on every page to a list's first or last card.
  const left = direction === "previous"
    ? `calc(50% - ${DIALOG_HALF_WIDTH + PLATE_GAP + PLATE_WIDTH}px)`
    : `calc(50% + ${DIALOG_HALF_WIDTH + PLATE_GAP}px)`;
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); onPress(); }}
      aria-label={cardCarouselCopy.neighborAria(direction, sibling.name)}
      className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-[6px] cursor-pointer bg-transparent border-0 p-0"
      style={{ left }}
    >
      <span
        aria-hidden="true"
        className="block rounded-[10px]"
        style={{ width: PLATE_WIDTH, height: 235, ...art, boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}
      />
      {sibling.name ? (
        <span className="font-mono text-[12.5px] truncate max-w-[168px]" style={{ color: "var(--fg-muted)" }}>
          {sibling.name}
        </span>
      ) : null}
    </button>
  );
});

export function CardModal({
  card,
  position,
  total,
  onClose,
  onPrev,
  onNext,
  onPrevPeek = null,
  onNextPeek = null,
  onAtStart,
  onAtEnd,
  prevSibling = null,
  nextSibling = null,
  enterFrom = null,
  onArtChange,
  openAtPrinting = null,
  deckId = null,
  deckName = null,
  deckPage = false,
  deckHolds = false,
  onProxyWrite,
  onSelectCard,
  stacked = false,
  backLabel,
  footer = null,
  onFindDeck = null,
  fitsOpen = false,
  door = null,
  phoneTop,
  covered = false,
  dropped = false,
}: {
  card: BrowseCard;
  /**
   * The swap tools' door (addendum §2): drawn under the price tag in the desktop art column, and as
   * a 44px strip under the phone's art header. Passed only for a card opened from a Shopping row
   * (audit F17), and never for a stand-in stacked over the sheet.
   */
  door?: ((layout: "art" | "strip") => ReactNode) | null;
  /** How far down the phone sheet starts, when this card is one layer of a stack (audit F16). */
  phoneTop?: 52 | 96 | 140;
  /**
   * A sheet is open OVER this card (the door's stand-ins sheet). The card stays mounted with its
   * scroll, under the sheet: below it in the stacking order, inert, and deaf to Escape, which peels
   * the layer on top instead.
   */
  covered?: boolean;
  /** Drawn 80px lower on desktop: a stand-in over a sheet over its original, so the original's head shows. */
  dropped?: boolean;
  /**
   * A sheet is open UNDER this one — the Analysis tab's receipt, whose addendum ruling is that
   * a card opened from it stacks rather than replaces.
   *
   * Two changes, both so a reader can see what a dismissal lands on before making it. On the
   * phone the sheet starts 96px from the top, leaving the receipt's own header visible
   * above it — the canvas's 96px against the receipt's 52. And the backdrop is not drawn: the
   * receipt has already dimmed the page, and a second wash over it would hide the one strip of
   * chrome this offset exists to show. Pressing that strip still dismisses THIS sheet, because
   * the backdrop element is still there and still takes the press.
   */
  stacked?: boolean;
  /**
   * The sheet underneath, by name. When `stacked` with one, the desktop close becomes a
   * `← {backLabel}` pill in the same slot and plate (Analysis tab handoff §3): the reader sees
   * where a dismissal lands before making it. The phone is unchanged, because there the strip of
   * the sheet behind is already the way back.
   */
  backLabel?: string;
  /**
   * The sheet underneath's own footer for this card (swap tools: a stand-in's Take). It replaces the
   * Mana Pool link, in the desktop nav row beside Prev/Next and pinned at the phone's bottom, so a
   * card opened to be chosen is chosen from where the reader already is. Drawn per layout.
   */
  footer?: ((layout: "row" | "column") => ReactNode) | null;
  /**
   * Fits your decks (swap tools, R2): the footer's `Find a deck for it →` door, under the Mana Pool
   * link. Null draws none, which is every card that is not Commander-legal, every reader with no deck,
   * and every card whose footer is a sheet's own (a stand-in's Take).
   */
  onFindDeck?: (() => void) | null;
  /** The picker the door opened is up, so its close hands focus back to the door. */
  fitsOpen?: boolean;
  /** The deck this card was opened from, which scopes the proxy control. Null
   *  everywhere but the deck page — see `CardDetailProvider.deckId`. */
  deckId?: string | null;
  deckName?: string | null;
  /** Opened on `/decks/[id]` or its `/changes`, where a one-copy shortfall reads a bare `short`
   *  (Hugh, 2026-09-28). Everywhere else it reads `short 1`. */
  deckPage?: boolean;
  /** Whether that deck holds THIS card. The provider wraps surfaces that open
   *  cards the deck does not hold — Consider, search — and the control refuses
   *  every one of them, so it must not be drawn for them. */
  deckHolds?: boolean;
  /** Invalidates this card in the provider's cache after a proxy write, so the
   *  receipt beside the control stops describing the state before the tap. */
  onProxyWrite?: () => void;
  /**
   * Opens another card IN PLACE of this one — the combo block's partner name is its only
   * caller, and it REPLACES rather than stacks, which the addendum refuses by name.
   *
   * A prop rather than reaching for the provider's context: this component is rendered BY
   * that provider and does not consume it, and the first version of this wiring wrote
   * `open(id)`, which resolved to `window.open` — it typechecked, every test passed, and it
   * would have navigated the browser instead of changing the card.
   */
  onSelectCard?: (oracleId: string) => void;
  position: number;
  total: number;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  /** The neighbor plate's own press (handoff decision 2), separate from `onPrev`/`onNext` so the
   *  provider can tell a peek from the footer button or an arrow key and restore focus to the
   *  same role across the remount (handoff "Notes for engineering" §3). Null exactly when
   *  `onPrev`/`onNext` is: the plate draws nothing at an end either. */
  onPrevPeek?: (() => void) | null;
  onNextPeek?: (() => void) | null;
  /** An arrow key pressed at the start or end of the list (decision 8): announced, nothing else
   *  moves. Undefined where there is no carousel to have an end (a list of zero or one). */
  onAtStart?: () => void;
  onAtEnd?: () => void;
  /** The cards either side of this one, carrying whatever art and identity their opener had
   *  (H23 carousel PR 1/1b). Null at a list's end, or with no list at all. */
  prevSibling?: SiblingCard | null;
  nextSibling?: SiblingCard | null;
  /** Which control led to THIS mount, captured once at construction (the carousel's own
   *  README "Notes for engineering" §1/§3): which side the art slides in from, and which
   *  control gets focus in place of the usual opening ✕. Null on a fresh open, and on any
   *  card change that is not a page. */
  enterFrom?: "prev" | "next" | "prevPeek" | "nextPeek" | null;
  /**
   * Called when the art pick is written, so a caller holding a copy of this card can
   * drop it. The write changes what the card says about itself, and a stale copy would
   * show the reader the printing they just replaced. Called twice per write, on purpose:
   * once as the write starts, and once when it lands. A card re-read during the overlap
   * answers with the preference the write has not replaced yet, so dropping the entry
   * only up front would let that pre-write answer be filed as the current one.
   *
   * It carries the art the card should now draw, resolved through the same tiers the
   * server uses, so a list behind the modal can patch its own copy rather than refetch a
   * payload measured in megabytes. Null when the card names no printing to resolve — a
   * caller that only wants the nudge ignores the argument, as the set grid does.
   *
   * `settled` says which of the two calls this is. The optimistic one is a nudge about a
   * write that has not started; only the settled one can say the server holds anything, so
   * a caller that re-READS on this signal must wait for it or spend a round trip fetching
   * the state the write is about to replace.
   */
  onArtChange?: (art: CardArt | null, settled: boolean) => void;
  /**
   * The printing this card was opened AT, when the surface that opened it was showing one
   * in particular. The set grid's cells each ARE a printing, so clicking the dashed #239
   * has to show #239 — not whichever printing the resolver would pick for the card.
   *
   * A VIEW, never a pick. It decides the art, the caption and the shown-now badge, and it
   * does not touch `pick`: the picker still marks the reader's own preference where it is,
   * and nothing is written by looking. The moment the reader picks something in this modal,
   * their choice takes over.
   */
  openAtPrinting?: (PreferredPrinting & {
    imageUri?: string | null;
    /** The target printing's own back face. Both faces travel together or a flip on a cell
     *  opened at an unowned printing draws this printing's front against the oracle row's
     *  back — the mismatch `printings.back_image_uri` exists to close. */
    backImageUri?: string | null;
    scryfallId?: string;
  }) | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // The fixed backdrop — the one ancestor the dialog and the desktop neighbor plates share.
  // The arrow-key listener below attaches here rather than to `dialogRef`, since a peek press
  // can move focus onto a plate, which sits outside the dialog.
  const backdropRef = useRef<HTMLDivElement>(null);
  // Two card modals are up at once while a card is stacked over a sheet over a card, so the
  // covered one takes its own title id: shared, the top dialog would be named by the held card's
  // heading. The top card keeps the canonical id every other reader of the modal looks for.
  const titleId = covered ? "card-modal-title-held" : "card-modal-title";
  // One trigger per breakpoint tree; only one has layout at a time, and focus() on the
  // display:none one is a no-op, so Escape hands focus to whichever is actually on screen.
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  // The zoom is a layer inside this dialog, never a dialog of its own (table §3.1).
  const [zoomed, setZoomed] = useState(false);
  // The neighbor plates' own threshold (handoff decision 4): 820 (the dialog) + 2 x (168 the
  // plate + 24 off the modal + 24 clear of the viewport edge) = 1252.
  const wideEnoughForNeighbors = useMinWidth("(min-width: 1252px)");
  // Where focus goes back to on close: the art that opened it, at whichever width
  // is actually on screen.
  const zoomTriggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const zoomFlipRef = useRef<HTMLButtonElement>(null);
  // The layer turns its own copy. `flipped` belongs to the art behind it, which the
  // reader may have turned for their own reasons.
  const [zoomFlipped, setZoomFlipped] = useState(false);
  /**
   * A face the art landed on while the zoom covered it, waiting for the zoom to
   * close. A ref rather than state: nothing renders from it, and holding it in
   * state would re-render the whole modal to record a sentence nobody can hear
   * yet.
   */
  const heldArtFace = useRef<string | null>(null);
  // The two shipped ✕ buttons, one per breakpoint tree.
  const closeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Captured ONCE, at this instance's own construction: `enterFrom` is the provider's state and
  // is cleared back to null the moment the arrival is announced (card-detail-provider.tsx), so
  // reading the prop reactively would hand this already-mounted instance's slide and focus back
  // to a fresh open partway through. `CardModal` is keyed on oracle id, so a new value here only
  // ever arrives with a new instance.
  const [enteredFrom] = useState(enterFrom);
  const prevButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevPeekRef = useRef<HTMLButtonElement | null>(null);
  const nextPeekRef = useRef<HTMLButtonElement | null>(null);
  // THE NAME BLOCK'S RESERVE follows whatever sits in the close slot. The ✕ is 34px, and 46px
  // clears it; a back pill is as wide as its label, which runs from `Game changers` to `How we
  // determined bracket 4`, so it is measured rather than assumed (readiness finding 10).
  const back = stacked && backLabel ? backLabel : null;
  const backRef = useRef<HTMLButtonElement | null>(null);
  const [closeReserve, setCloseReserve] = useState(46);
  useLayoutEffect(() => {
    const el = backRef.current;
    if (!back || !el) {
      setCloseReserve(46);
      return;
    }
    // The ✕ is 34 wide and the name keeps 46, so the reserve is the control's width plus 12.
    // Observed rather than read once: the pill is `display: none` below `md`, so a modal opened
    // on a narrow window measures 0 until the window widens.
    const measure = () => setCloseReserve(el.offsetWidth + 12);
    measure();
    // Guarded, as `use-head-collapse.ts` guards its own: an unconditional constructor throws on
    // mount in any engine without the API. The `measure()` above has already sized the reserve.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [back]);
  /**
   * Where the dialog puts focus when it opens: the ✕ that has layout.
   *
   * Named explicitly rather than left to DOM order, because the art is now a button
   * and sits before the content column — so without this the first thing a keyboard
   * reader lands on would have become "Look at … up close", which is neither where
   * focus used to go nor the same at both widths.
   *
   * A PAGED mount (`enteredFrom` non-null) focuses the same-role control instead (handoff
   * "Notes for engineering" §3): the footer button or the peek that led here, so the remount
   * this component is built around does not drop focus to the ✕ on every press. Falls back to
   * the ✕ if that control did not land — this width's footer is hidden at the peek's, say.
   */
  const initialFocusRef = useMemo(
    () => ({
      get current() {
        const paged = enteredFrom === "prev" ? prevButtonRef.current
          : enteredFrom === "next" ? nextButtonRef.current
          : enteredFrom === "prevPeek" ? prevPeekRef.current
          : enteredFrom === "nextPeek" ? nextPeekRef.current
          : null;
        if (paged && paged.getClientRects().length > 0) return paged;
        const mounted = closeRefs.current.filter((el): el is HTMLButtonElement => el !== null);
        return mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0] ?? null;
      },
    }),
    [enteredFrom],
  );
  const [announcement, setAnnouncement] = useState("");
  // No reset on card change: the provider keys this component on oracleId, so
  // Prev/Next remounts and a new card starts on its front face by construction.
  const [flipped, setFlipped] = useState(false);
  const [writing, startWrite] = useTransition();

  // The pick the user just made, before the server action's revalidate lands. Seeding it from
  // the card is only correct because the caller keys this component on oracleId — paging
  // Prev/Next remounts rather than reusing the state of the card you just left.
  const [pick, setPick] = useState<PreferredPrinting | null>(card.preferredPrinting);
  // Whether the reader has chosen a printing in THIS modal. Until they do, a card opened at
  // a particular printing shows that one; afterwards their choice wins.
  const [picked, setPicked] = useState(false);

  // A caller can hand this component a re-read of the same card, so the seed above is not
  // the last word: without this, a preference that moved on the server would be ignored for
  // as long as the modal stayed open, and the art, caption and selected tile would all keep
  // showing the printing it replaced.
  //
  // Every arriving read reconciles, not only one that reports a different printing. A write
  // can be refused — `setCardArtPreference` returns without writing when the chosen printing
  // is no longer one the reader owns — and a refusal reads back exactly the preference that
  // was already there. Reconciling on the value alone would take that for "nothing changed"
  // and leave the refused pick on screen as though it had taken.
  //
  // A write of the reader's own is the exception: its optimistic pick is the thing this state
  // exists to hold, and it is held until the write settles either way.
  const [seeded, setSeeded] = useState(card);
  if (!writing && seeded !== card) {
    setSeeded(card);
    setPick(card.preferredPrinting);
  }

  // The read the write's own eviction starts can answer before the write does, and the card
  // it brings back predates the write. Holding it while the write runs is not enough: the
  // write's second eviction starts the read that supersedes it, and nothing waits for that
  // read, so the transition ends first and the stale card reconciles a moment later — the
  // reader watches their pick revert to the printing they replaced. Marking such a card as
  // seeded on the way out of the write retires it without reconciling, so the pick stands
  // until the read taken after the write answers.
  const arrived = useRef(card);

  // What the server is known to hold, and the only safe thing to put back when a write does
  // not take. The card on screen is not that: a write's own re-read can fail, leaving the
  // reader looking at a card older than a pick the server accepted, and rolling a later
  // refusal back to it would revert past a choice that landed.
  const serverPick = useRef<PreferredPrinting | null>(card.preferredPrinting);
  const writes = useRef(0);
  const settled = useRef(0);
  /**
   * The pick currently on screen, for the art reported to `onArtChange`.
   *
   * A ref rather than `pick` read through a closure: a write settles in a callback created
   * when it STARTED, so a reader who picked again while it ran would have the older render's
   * pick reported as current and watch the list revert to a printing they had replaced.
   */
  const livePick = useRef<PreferredPrinting | null>(card.preferredPrinting);

  useEffect(() => {
    arrived.current = card;
    // A read taken while a write is outstanding predates it, so its preference is not what
    // the server holds — only the write can say that, and it does so when it settles.
    if (writes.current === settled.current) serverPick.current = card.preferredPrinting;
  }, [card]);

  // Everything the modal shows about the current printing — art, caption, shown-now badge —
  // reads from this one object, so an optimistic pick moves all three together or none.
  const preview = useMemo<BrowseCard>(() => {
    const at = picked ? null : openAtPrinting;
    if (!at) {
      const next = { ...card, preferredPrinting: pick };
      // Only once the reader has actually picked. `card.printedName` is the server's
      // answer and is right until then — recomputing it unconditionally would resolve a
      // different printing than `aggregateCollection` did and rename cards nobody touched.
      // After a pick it is stale by construction: it was resolved for the preference the
      // pick just replaced, so the art and caption moved while both headings did not.
      if (!picked) return next;
      const shown = resolvedPrinting(next);
      return { ...next, printedName: shown ? cardArt(card.name, shown).printedName : null };
    }
    // For an OWNED card `card.printings` is what the reader owns, and a holding matched by
    // name carries no collector number — so the printing the caller is showing is often
    // absent and the resolver would fall back to an unrelated set. Injected at quantity 0
    // so it resolves; the picker reads `card.printings`, not this, and never sees it.
    // A row matching by set and collector number is not necessarily carrying that
    // printing's art: `collection_items.scryfall_id` is nullable, and `aggregateCollection`
    // falls back to the set representative when the exact join is missing — so a Moxfield
    // or Archidekt holding can match here and still hold another printing's image. When the
    // caller handed over the exact art, it wins over that fallback.
    // Identity is the caller's id where it gave one, and the (set, collector number)
    // pair where it did not. The distinction matters because the pair is not unique:
    // `printings` puts no constraint on it, so a fetched row can share the pair and
    // still BE a different printing. Stamping the caller's id onto that row would put
    // one printing's price under another's art — so a row whose own id disagrees does
    // not count as the printing being opened, and the exact one is injected below.
    // A row that names no id is taken as the printing being opened only where the
    // pair names ONE catalog printing. Where the catalog gives it to two — which the
    // price snapshot has already worked out, and is the only place that knows — an
    // id-less holding could be either sibling, and stamping the caller's id onto it
    // would put the opened printing's figure under a picture that may be the other
    // one's. There the exact row is injected instead.
    const pairAmbiguous = card.prices?.ambiguousKeys.includes(priceKeyFor(at)) ?? false;
    const isTarget = (p: BrowsePrinting) =>
      at.scryfallId
        ? p.scryfallId === at.scryfallId
          || (!pairAmbiguous && p.scryfallId === undefined && matchesPreference(p, at))
        // With no id from the caller either, an ambiguous pair identifies nothing at
        // all: rewriting an owned row's art here would leave that row's id — and so
        // its price — under a picture that may belong to its sibling. The caller's
        // printing is injected instead, and prices itself or nothing.
        : !pairAmbiguous && matchesPreference(p, at);
    const known = card.printings.some(isTarget);
    // The row the caller's id names, first — whether it was already owned or has just been
    // injected. Resolution matches a preference on the (set, collector number) PAIR, and the
    // pair is not unique, so a sibling that happens to sort first wins it and the modal
    // draws, prices and turns that sibling under the identity the reader clicked. An id is
    // the one thing that settles which row is meant; without one there is nothing to put in
    // front, and the ambiguous cases below are deliberate about preferring the owned row.
    const idFirst = (rows: BrowsePrinting[]) =>
      at.scryfallId === undefined
        ? rows
        : [...rows].sort((x, y) =>
          Number(y.scryfallId === at.scryfallId) - Number(x.scryfallId === at.scryfallId));
    const printings = known
      ? idFirst(card.printings.map((p) => {
          if (!isTarget(p)) return p;
          // The caller's id names the printing exactly, and travels whether or not it
          // also handed over art: the row's own id may be absent, or dropped because
          // two holdings disagreed about it, and the price is looked up by it.
          const withId = at.scryfallId ? { ...p, scryfallId: at.scryfallId } : p;
          if (!at.imageUri) return withId;
          // The flavour name goes with the art it described — but only when the art
          // actually changes. `aggregateCollection` fills the name from the set
          // REPRESENTATIVE when a holding has no `scryfall_id`, and it is that fallback
          // the exact art replaces; where the two URLs already agree, the row is the
          // printing and its name is the right one. Clearing unconditionally took the
          // name off an owned Secret Lair whose art was never in question.
          return {
            ...withId,
            imageUri: at.imageUri,
            // The back moves with the front, on the same condition: this row is being
            // repointed at the printing the caller named, and half a repointing is the
            // two-printing pairing the column exists to prevent.
            //
            // A NULL FROM THE CALLER IS NOT AN OVERRIDE. Every printing row carries null
            // there until the catalog is re-seeded against the new column, and this row's
            // own back has already fallen through the tiers to the oracle-level image —
            // so writing the null over it would take the second face off a card that has
            // one, on exactly the printings the column has not reached yet.
            ...(at.backImageUri
              // Provenance travels WITH the override, never on its own: the caller handed
              // this row's own back art, so it is this printing's. Left alone where the
              // override is absent, so the loader's answer stands.
              ? { backImageUri: at.backImageUri, hasOwnBack: true }
              : {}),
            flavorName: at.imageUri === p.imageUri ? p.flavorName : null,
          };
        }))
      : (() => {
        const injected = {
      setCode: at.setCode,
      setName: at.setCode,
      scryfallId: at.scryfallId,
      collectorNumber: at.collectorNumber,
      releasedAt: null,
      quantity: 0,
      finishes: {},
      // `resolveImageUri`'s card-level fallback, not a hard null: a set cell whose
      // full-size art the catalog does not hold would otherwise open on the identity
      // gradient, where the modal used to show the card's own image.
      imageUri: at.imageUri ?? card.imageUri,
      backImageUri: at.backImageUri ?? card.backImageUri ?? null,
      // TRUE ONLY FOR THE CALLER'S OWN BACK, never for the card-level fallback beside it.
      // A reversible printing opened from a set page reaches the modal through here, so
      // without this the turn control is absent on exactly the path the feature was built
      // for — and the fallback's image belongs to whatever printing seeded the oracle row,
      // which is the conflation `hasOwnBack` exists to end. Raised by review.
      hasOwnBack: at.backImageUri != null,
      // The card-level back is the same fallback `imageUri` takes above, and the same one a
      // printing ingested before the column existed falls to. What it must not do is stay
      // absent: an injected row with no back reads as "this printing has no second face",
      // and `resolved?.backImageUri ?? card.backImageUri` would then pair this printing's
      // front with the oracle row's back without either of them saying so.
      flavorName: null,
        };
        // ORDER DECIDES WHICH ROW RESOLUTION FINDS, because a preference matches on the
        // (set, collector number) PAIR and the pair is not unique — which is the very case
        // this row is injected for. An owned sibling sharing the pair matches too, and
        // `find` returns whichever comes first.
        //
        // It goes first only when the caller named the printing BOTH ways — an id and its
        // art. Then this row is the one being shown and must win the pair match, or the
        // sibling that happens to sort first is drawn under the clicked cell's identity.
        //
        // With either half missing it is appended and loses, deliberately. No id and the
        // art could be the sibling's; no art and there is nothing to draw with. In both
        // cases the owned row keeps the picture, and its price, name and back stay with it
        // — one printing named by all four — which is what the ambiguous-pair cases in
        // `card-modal-price.test.tsx` pin.
        // Same rule as the owned branch, with one extra condition: this row has no art of
        // its own unless the caller sent some, and a row with no picture cannot be the one
        // being shown. With either half missing it goes last and loses, deliberately — no
        // id and the art could be the sibling's, no art and there is nothing to draw with.
        // Both are pinned by the ambiguous-pair cases in `card-modal-price.test.tsx`.
        return at.imageUri && at.scryfallId
          ? idFirst([injected, ...card.printings])
          : [...card.printings, injected];
      })();
    // The title follows the art. `printedName` is a CARD-level field, set from whichever
    // printing the collection resolved to — so left alone it would print the owned
    // holding's flavour name over the printing the cell actually opened at, which is the
    // pairing `BrowseCard` documents and this whole branch exists to keep. Derived from the
    // row the preview resolves to: the injected row carries no flavour name, so an
    // unowned target falls back to the oracle name, which is the honest answer for a
    // printing the reader has no copy of.
    const row = printings.find((p) => matchesPreference(p, at));
    // The same exact-equality rule `aggregateCollection` applies, verbatim: a printing whose
    // flavour name IS the oracle name has renamed nothing, and copying it here would print
    // the name twice and add an oracle-name line under it that says the same thing.
    // Only off a printing the reader OWNS. `catalogCard` fills `printings` with the whole
    // catalog at quantity 0 for a card nobody owns, so a renamed catalog row would put a
    // printed name on a card with no copy of it — which locked decision 2 forbids
    // (`card-detail.ts`): there is no printing in hand to print one.
    const renamed =
      row !== undefined && row.quantity > 0
      && row.flavorName != null && row.flavorName !== card.name
        ? row.flavorName
        : null;
    return { ...card, printings, preferredPrinting: at, printedName: renamed };
  }, [card, pick, picked, openAtPrinting]);
  const resolved = resolvedPrinting(preview);
  /**
   * The art a list behind this modal should draw once `next` is the card's preference.
   *
   * Resolved through `resolvedPrinting` rather than off the picked tile directly, because a
   * cleared pick falls back through the same tiers the server does — and because the pick
   * wins even when its own image is null, which only that resolver knows.
   */
  const artFor = useCallback(
    (next: PreferredPrinting | null): CardArt | null => {
      const shown = resolvedPrinting({ ...card, preferredPrinting: next });
      return shown ? cardArt(card.name, shown) : null;
    },
    [card],
  );
  // The picker is about the printings you OWN — every string it renders says so, and picking
  // one only decides which of your copies represents the card. `card.printings` is not that
  // list for an unowned card: `catalogCard` fills it with the whole catalog at quantity 0, so
  // the modal offered a pick between sixteen printings of a card the user owns none of, under
  // the heading "16 printings you own". For an owned card every row already has copies, so
  // this filter changes nothing.
  const ownedPrintings = useMemo(
    () => card.printings.filter((p) => p.quantity > 0),
    [card.printings],
  );
  const hasPicker = ownedPrintings.length > 1;
  const overflowing = printingEntryCount(ownedPrintings, pick) > OVERFLOW_THRESHOLD;
  // The 180px phone header plus a 62px row plus search plus chips leaves about one tile row on
  // an 812px phone, so past the threshold — and only there — the header collapses.
  const compactArt = hasPicker && expanded && overflowing;

  /**
   * Closing unmounts the layer.
   *
   * IT USED TO PLAY OUT over 160ms, per the motion table's exit row, and that one
   * animation cost five rounds of review: a layer that is mounted but leaving has to
   * answer Escape without restarting its own timer, ignore a keyboard press that
   * `pointer-events-none` does not stop, not steal focus back from whatever the next
   * Escape stage claimed, and not let a stale timer unmount a zoom the reader has
   * reopened. Every one of those was a real defect, and all of them were the exit's.
   *
   * The enter animation is what makes the zoom feel picked up rather than pasted in;
   * the exit was a 160ms fade nobody is waiting for. Dropping it was a deviation from
   * row 5.2 as Design drew it; Hugh ruled it on 2026-09-13 and that row now reads "no
   * exit, the layer unmounts", with E13 kept as the record of what changed.
   */
  const closeZoom = useCallback(() => {
    setZoomed(false);
    // The layer's own announcements go with it. Reopening shows the front, and a live
    // region still reading "Showing <back face>" would describe a card that is no
    // longer there.
    //
    // Unless the ART landed on a face while the layer covered it — that face is
    // what the reader is now looking at, and it has not been said yet. It REPLACES
    // the clear rather than preceding it: two `setAnnouncement` calls in one
    // handler are one render, and the last one wins.
    const held = heldArtFace.current;
    heldArtFace.current = null;
    setAnnouncement(held ?? "");
  }, []);
  const openZoom = useCallback(() => {
    // A zoom is a look, not a setting (table row 4.10): it always opens on the front,
    // whatever the last one was turned to. Its own face rather than the art's, so
    // closing the layer never reaches out and turns the card behind it back.
    setZoomFlipped(false);
    // Whatever the art behind announced belongs to the art behind. The zoom opens on
    // the front, and a region still reading "Showing <back face>" would describe it
    // wrongly from the first frame.
    setAnnouncement("");
    setZoomed(true);
  }, []);

  // Three rungs: the zoom, then the printing region (returning focus to the Set
  // field), then the dialog. The region's shipped two-stage shape with one added on
  // top rather than a new shape to learn.
  const onEscape = useCallback(() => {
    // Zoom first, then the region, then the dialog — the printing region's shipped
    // two-stage shape with one rung added rather than a new shape to learn (§3.11).
    if (covered) return;
    if (zoomed) {
      closeZoom();
      return;
    }
    if (!expanded) {
      onClose();
      return;
    }
    setExpanded(false);
    // Collapsing by Escape has to empty the live region for the same reason toggleExpanded
    // does: reopening writes the identical open string, and a live region whose text did not
    // change is silent in most screen readers.
    setAnnouncement("");
    for (const ref of [mobileTriggerRef, desktopTriggerRef]) {
      if (ref.current && ref.current.getClientRects().length > 0) {
        ref.current.focus();
        return;
      }
    }
  }, [closeZoom, covered, expanded, onClose, zoomed]);

  // Focus trap + Escape + focus-return — shared hook, shared with the export dialog.
  useDialogA11y(dialogRef, onEscape, { initialFocusRef });

  // Focus follows the layer. In: to the flip control when the card has a back face,
  // otherwise to the close (row 3.12). Out: to the art that opened it, at whichever
  // width has layout (row 3.10).
  const wasZoomed = useRef(false);
  useEffect(() => {
    // Transitions only. Without this the effect's first run — on mount, with the
    // layer closed — would take focus off whatever the dialog's own trap had just
    // given it and park it on the art.
    if (wasZoomed.current === zoomed) return;
    wasZoomed.current = zoomed;
    if (zoomed) {
      // The turn where there is a face to turn to, the close otherwise — row 3.12,
      // now that the layer has both.
      (zoomFlipRef.current ?? zoomCloseRef.current)?.focus();
      return;
    }
    // Only when nothing else has claimed focus. A close leaves focus on the button
    // that is being unmounted, so the document falls back to `body` and this runs;
    // anything else already sitting on a control inside the dialog got there on
    // purpose — the printing region's own Escape stage is the one that does — and
    // taking it back would undo that.
    const active = document.activeElement;
    if (active && active !== document.body && dialogRef.current?.contains(active)) return;
    const mounted = zoomTriggerRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    // The visible one where the environment reports layout, and the first mounted one
    // where it does not — jsdom gives every element a zero rect, so a strict
    // visibility filter would hand focus to nobody in tests while looking correct.
    const target = mounted.find((el) => el.getClientRects().length > 0) ?? mounted[0];
    target?.focus();
  }, [zoomed]);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    setAnnouncement(next ? pickerCopy.announceOpen(ownedPrintings.length) : "");
  }

  // A write the server refused and a write that never reached it leave the same thing on
  // screen: a printing the reader chose and the server does not hold.
  //
  // Only the newest write may roll anything back. Nothing stops the reader picking again while
  // a write is still running, so an older write can settle with a newer pick already painted,
  // and rolling back blindly would erase the choice the reader made last.
  function settleWrite(generation: number, wrote: boolean, written: PreferredPrinting | null) {
    settled.current++;
    setSeeded(arrived.current);
    if (wrote) serverPick.current = written;
    else if (generation === writes.current) {
      setPick(serverPick.current);
      livePick.current = serverPick.current;
    }
    // Whatever stands now, which for an older write settling under a newer pick is that
    // newer pick — untouched by this settlement and still the thing on screen.
    onArtChange?.(artFor(livePick.current), true);
  }

  function onPick(p: { setCode: string; collectorNumber: string }) {
    const written = { setCode: p.setCode, collectorNumber: p.collectorNumber };
    setPick(written);
    livePick.current = written;
    setPicked(true);
    onArtChange?.(artFor(written), false);
    const generation = ++writes.current;
    startWrite(async () => {
      let wrote = false;
      try {
        wrote = await setCardArtPreference(card.oracleId, p.setCode, p.collectorNumber);
      } catch {
        wrote = false;
      }
      settleWrite(generation, wrote, written);
    });
  }

  function onClearPick() {
    setPick(null);
    livePick.current = null;
    setPicked(true);
    onArtChange?.(artFor(null), false);
    const generation = ++writes.current;
    startWrite(async () => {
      let wrote = false;
      try {
        await clearCardArtPreference(card.oracleId);
        wrote = true;
      } catch {
        wrote = false;
      }
      settleWrite(generation, wrote, null);
    });
  }

  // Announced here rather than in the region: the string names the printing that becomes
  // current once the pick is gone, and only the resolver knows which one that is.
  function onReset() {
    onClearPick();
    const fallback = resolvedPrinting({ ...card, preferredPrinting: null });
    if (fallback) setAnnouncement(pickerCopy.announceReset(fallback.setName ?? fallback.setCode));
  }

  // The base resolves off `preview`, so it names the printing actually on screen; the count
  // is of what the reader OWNS, so an injected row is art and not a holding.
  const caption = printingCaption(preview, ownedPrintings);

  // The mobile and desktop meta blocks are parallel trees with one hidden by CSS, so the
  // region is instantiated twice and each instance needs its own id for aria-controls.
  const renderRegion = (id: string) => hasPicker && expanded ? (
    <PrintingRegion
      id={id}
      printings={ownedPrintings}
      preferred={pick}
      resolvedKey={resolved === undefined ? null : printingKey(resolved)}
      cardName={card.name}
      colorIdentity={card.colorIdentity}
      onPick={onPick}
      onReset={onReset}
      onForget={onClearPick}
      onAnnounce={setAnnouncement}
    />
  ) : null;

  const ZOOM_REGION = "card-zoom";
  const REGION_MOBILE = "printings-mobile";
  const REGION_DESKTOP = "printings-desktop";

  // Arrow-key paging (handoff decision 4): anywhere in the dialog except the printing search
  // input, the printing radiogroup, and the zoom — "a look, not a browser", decision 1. A list
  // of one or two behaves exactly as the buttons do: the missing side is simply absent.
  //
  // ATTACHED TO THE BACKDROP, not the dialog (pre-open review, round 1). A peek press moves
  // focus to the pressed plate via `initialFocusRef` on the REMOUNTED instance, and a neighbor
  // plate is a sibling of `dialogRef`'s element, outside it — a listener on the dialog alone
  // never sees a key pressed while focus sits on a plate, which stalled paging dead after the
  // first peek. The backdrop is the one ancestor both the dialog and the plates share.
  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop || total <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // A modified arrow is somebody else's shortcut — Alt+Left/Right is browser history,
      // Cmd/Ctrl+Left/Right is a text-editing jump in some inputs (pre-open review, round 2).
      // Plain Left/Right only, or the carousel silently eats a navigation the reader meant.
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        if (active.tagName === "INPUT") return;
        if (active.closest('[role="radiogroup"]')) return;
        if (active.closest(`#${ZOOM_REGION}`)) return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (onPrev) onPrev(); else onAtStart?.();
      } else {
        e.preventDefault();
        if (onNext) onNext(); else onAtEnd?.();
      }
    };
    backdrop.addEventListener("keydown", handler);
    return () => backdrop.removeEventListener("keydown", handler);
  }, [total, onPrev, onNext, onAtStart, onAtEnd]);

  // A back face to turn to, or none (#363). The image is the second condition and
  // not an afterthought: a `transform` row seeded before the back-face column
  // existed carries the layout and no art, and a control that turns to a
  // colour-identity gradient is the lie the layout gate exists to prevent.
  const backImage = resolved?.backImageUri ?? card.backImageUri ?? null;
  // TWO SIDES BY LAYOUT, OR BY THIS PRINTING'S OWN BACK ART.
  //
  // `card.layout` is ORACLE-level, and that is the wrong scope for a reversible
  // printing: `sld/2214` prints Teferi's Ageless Insight on both sides, while the
  // oracle row's layout comes from its M21 printing and says `normal`. So the art
  // was ingested (#811), stored, and unreachable — 81 printings carry their own
  // back image under a one-sided oracle layout, all of them reversibles.
  //
  // A printing's own back image is POSITIVE EVIDENCE of two-sided stock, and stronger
  // than the layout word, which describes the card in general.
  //
  // `hasOwnBack` RATHER THAN `backImageUri`, and the difference is the whole guard:
  // `resolveBackImageUri` hands a printing with no back of its own the ORACLE's image,
  // so the resolved string cannot say whose back it is. Reading it here put a turn on a
  // one-sided printing whose back belongs to another printing entirely — and the first
  // version of this gate did exactly that while passing its own test, because the
  // fixture built props by hand rather than through the loader. Raised by review.
  //
  // What excludes an ordinary split or adventure printing is its own null back art,
  // NOT the layout word: Scryfall gives those layouts one image between both halves,
  // so `card_faces[1]` carries no `image_uris` and the transform stores null. A
  // reversible printing OF an adventure card is a different thing and turns over
  // correctly — `tdm/381` prints Bloomvine Regent and Claim Territory on two sides,
  // and each side has its own art.
  const twoFaced = Boolean(backImage)
    && (isTwoFaced(card.layout) || Boolean(resolved?.hasOwnBack));
  // CLAMPED TO WHAT EXISTS, not to what the reader last asked for.
  //
  // `flipped` survives a printing pick by design — only a card change remounts this —
  // and since the turn began taking a PRINTING's own back art as its signal, a pick
  // can take that art away underneath a turned card. Turn `sld/2214` over, pick the
  // M21 printing, and `backImage` goes null: the art fell back to the colour-identity
  // gradient and `turningArt` returned nothing, so there was no control left to turn
  // back with. Exactly the lie the gate's own comment above says it prevents, reached
  // from a direction that did not exist before — a `transform` oracle always carries
  // `cards.back_image_uri` as a fallback, so `backImage` could not go null under a pick.
  //
  // The reader's intent stays in `flipped`; every drawn decision reads this instead.
  const showingBack = twoFaced && flipped;
  // The faces of the name on screen, which is the printed one when the copy in
  // hand carries a printed name. The title above and this announcement must
  // name the same card.
  const faces = faceNames(printedNameOf(preview));
  // A reversible card's two sides carry ONE name, so `faceNames` hands back the same
  // string twice and every label built from it would name the card already on screen.
  // The side is what is left to say. See `twoFacedCopy.flipToSideAria`.
  const oneName = faces.front === faces.back;
  const flipLabel = (toBack: boolean) => (oneName
    ? twoFacedCopy.flipToSideAria(toBack ? "back" : "front")
    : twoFacedCopy.flipToAria(toBack ? faces.back : faces.front));
  const shownLabel = (onBack: boolean) => (oneName
    ? twoFacedCopy.flippedSideAria(onBack ? "back" : "front")
    : twoFacedCopy.flippedAria(onBack ? faces.back : faces.front));

  function onZoomFlip() {
    const next = !zoomFlipped;
    setZoomFlipped(next);
    // Announced when the card has LANDED, not when the press happened: a reader who
    // presses twice quickly would otherwise be told about a face the card never
    // rested on. `onTransitionEnd` below carries the animated path; where there is no
    // transition to wait for — a reader who asked for less motion — the press is the
    // landing.
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setAnnouncement(shownLabel(next));
  }

  function onTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    // Only the box's own turn, not a transition bubbling from something inside it.
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    setAnnouncement(shownLabel(zoomFlipped));
  }

  function onFlip() {
    const next = !flipped;
    setFlipped(next);
    // Same rule as the zoom's turn, for the same reason, now that the art in the
    // modal turns rather than swapping: announced when the card has LANDED. The
    // reduced-motion path has no transition to wait for, so the press is the
    // landing there.
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setAnnouncement(shownLabel(next));
  }

  function onArtTurnSettled(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    const face = shownLabel(showingBack);
    // NOT while the zoom is up. A reader who turns the art and opens the zoom
    // inside the 320ms turn leaves this transition still running underneath a
    // layer that deliberately opens on the FRONT — and `openZoom` clears the
    // region for exactly that reason. Announcing here would write the art's back
    // face into it while the front is on screen.
    //
    // HELD, not dropped: when the zoom closes, that back face is what the reader
    // is looking at, and a turn nobody ever announced is a face they were never
    // told about. `closeZoom` flushes this.
    if (zoomed) {
      heldArtFace.current = face;
      return;
    }
    setAnnouncement(face);
  }

  // Art follows the resolved printing, not the card-level image: they are the same value
  // today, but an optimistic pick updates `resolved` a revalidate earlier.
  //
  // The back face follows it, through `printings.back_image_uri`. Both faces come off one
  // printing or a flip turns to another printing's back — which is what it used to do, the
  // column having been oracle-level. A printing ingested before that column existed carries
  // null and falls back to the card's, which is where every flip stood before.
  // The two faces are drawn from their own images rather than from `faceImage`,
  // which follows `flipped`: a turning card shows both at once, and a box whose
  // background swapped mid-turn would be the swap this amendment exists to replace.
  const frontStyle: React.CSSProperties = resolved?.imageUri
    ? { backgroundImage: cssUrl(resolved.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const backStyle: React.CSSProperties = backImage
    ? { backgroundImage: cssUrl(backImage), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };

  // `set · code · collector number`, and the field AND its separator go when the
  // holding carries no number — never "no number" (the printing picker's ruling).
  const zoomCaption = resolved
    ? `${cardZoomCopy.printing(
        resolved.setName ?? resolved.setCode,
        resolved.setCode,
        resolved.collectorNumber,
      )}${zoomFlipped ? cardZoomCopy.backSuffix : ""}`
    // A card with no printings at all names nothing, and ` · ` is not a caption.
    // The zoom draws the card and no line rather than a line with nothing in it.
    : null;

  const faceImage = showingBack ? backImage : resolved?.imageUri;
  const artStyleOf = (image: string | null | undefined): React.CSSProperties => image
    ? { backgroundImage: cssUrl(image), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };
  const artStyle = artStyleOf(faceImage);
  // THE ZOOM'S WASH follows the face the zoom shows, which can differ from the art behind it: the
  // zoom opens on the front and turns on its own (table row 4.10).
  const zoomWashStyle = artStyleOf(zoomFlipped ? backImage : resolved?.imageUri);

  // The figure belongs to the printing on screen, so it is resolved from the same
  // object the art and the `Set` caption read — a pick moves four things together
  // or none of them (card-detail R2, §1). `null` means draw nothing at all: either
  // no price read reached us, or the holding names no printing to ask about.
  // `{ fact: null }` is the other silence-adjacent state and is NOT silence — the
  // store answered, and the answer was that it has never carried this printing.
  const price = priceFor(card.prices, resolved);
  const priceTag = price ? (
    <PriceTag fact={price.fact} newestAsOf={card.prices?.newestAsOf ?? null} standalone />
  ) : null;

  // The other question, answered beside the first rather than instead of it.
  //
  // `/commanders/[slug]` quotes a card's CHEAPEST printing and this modal quotes
  // the printing on screen, so a reader who follows a $2.34 synergy row into a
  // $4.39 modal reads two correct figures for one card with nothing saying why.
  // The tag keeps belonging to the art; this names where the card starts.
  //
  // Drawn only where the cheapest is genuinely LOWER than what is on screen — and
  // where this printing carries no figure at all, which is the same reader with
  // the same question and no number to hold it against. Equal figures say
  // nothing: on the cheapest printing itself `from $2.34` beside `$2.34` is the
  // same number twice.
  //
  // THE COMPARISON IS AGAINST THE DRAWN FIGURE, whatever finish supplied it, and
  // the cheapest is non-foil only — so the two sides can name different finishes.
  // That asymmetry is the rule rather than a gap in it: what this line must never
  // do is sit beside a smaller number claiming the card starts higher. A foil-only
  // $1.20 with a $4.39 non-foil sibling therefore says nothing, which is silence
  // and not a false claim; a foil-only $9.80 with the same sibling says
  // `from $4.39`, which is true and is the reason a reader would look.
  const shownState = price?.fact
    ? priceState(price.fact, card.prices?.newestAsOf ?? null)
    : null;
  const shownCents =
    price?.fact && shownState ? priceOf(price.fact, shownState) : null;
  const cheapestCents = cheapestLiveCents(card.prices);
  const fromCents =
    cheapestCents !== null && (shownCents === null || cheapestCents < shownCents)
      ? cheapestCents
      : null;
  // The same split `PriceTag` makes, and for the reason recorded there: an
  // `aria-label` on a bare span lands on the generic role and is dropped, so the
  // visible words go `aria-hidden` and an `sr-only` sibling carries the sentence.
  // A COMPANION to the tag, never a replacement for it. Where `priceFor` returns
  // null the modal draws nothing at all — the holding names no printing, so the
  // store was never asked — and a cheapest figure alone there would answer a
  // question about a card under a picture of a printing nobody identified. The
  // stack keeps its silence; this line only ever qualifies a figure that is
  // already on screen.
  const fromLine = (phone: boolean) =>
    fromCents === null ? null : (
      <span
        className="flex items-center"
        data-testid={phone ? "modal-price-from-mobile" : "modal-price-from-desktop"}
      >
        <span aria-hidden="true" className="font-mono text-[10px]" style={{ color: "var(--fg-locked)" }}>
          {priceCopy.cheapest.from(formatCents(fromCents))}
        </span>
        <span className="sr-only">{priceCopy.cheapest.aria(formatCents(fromCents))}</span>
      </span>
    );

  /**
   * The art in the modal ITSELF turns now (#2). It used to swap one background
   * for another with no motion, so the only place a two-faced card behaved like
   * one object was inside the zoom — two treatments for one act, and the quieter
   * one was the surface the reader meets first.
   *
   * Both faces are drawn, both hide their own back, and this box rotates: the
   * zoom's own construction, moved to a helper so the two cannot drift. It is an
   * INNER box rather than the art element itself, because the zoom trigger is
   * stretched over the art and must not ride the rotation — on the back face it
   * would be mirrored and pointing the wrong way, which is the bug the zoom's
   * own flip control was lifted out of the turning box to avoid.
   *
   * `perspective` belongs to the art element that contains this, not here.
   */
  const turningArt = (radius: string) =>
    twoFaced ? (
      <div
        aria-hidden
        data-testid="modal-art-turn"
        data-face={showingBack ? "back" : "front"}
        className={`absolute inset-0 ${radius} anim-card-turn`}
        onTransitionEnd={onArtTurnSettled}
        style={{
          transformStyle: "preserve-3d",
          transform: showingBack ? "rotateY(180deg)" : undefined,
        }}
      >
        <CardFaces
          front={frontStyle}
          back={backStyle}
          radius={radius}
          seam="inset 0 0 0 1px rgba(0,0,0,0.3)"
          testIdPrefix="modal-art"
        />
      </div>
    ) : null;

  /**
   * What sits under the card, in one order at both widths (#3, #4): the zoom
   * hint, then the turn control, then the price.
   *
   * The ⤢ plate that used to sit in the art's bottom-left corner is gone, and
   * the turn control has come off the art with it. A glyph on the picture had to
   * be decoded; a line of words under it does not, and the two controls no
   * longer sit on top of the thing they are about.
   *
   * The hint is `aria-hidden` rather than spoken: the art's own button is
   * already named "Look at {card} up close", and a second voice saying "Click to
   * zoom" beside it would be the same instruction twice.
   */
  /**
   * How much room the stack under the art needs, in px, at DESKTOP — the width
   * whose column has a fixed height to fit inside. 10px clears the art, the hint
   * is a 15px line, and each further row is a 6px gap plus its own height: 32 for
   * the turn control, and **21** for the tag.
   *
   * 21, not 18: the tag is 10px text at the inherited 1.5 line-height, 2px of
   * padding each side and a 1px border — measured in Chromium, and the same 21px
   * the plate fix in `price-tag.tsx` was measured against. An 18px guess put the
   * reservation 3px short, which is a clipped row on a short window and nothing at
   * all on a tall one.
   *
   * A number rather than a measurement: it feeds a CSS `calc` that sizes the art,
   * and measuring the stack to size the box the stack is positioned against is a
   * loop. These are the same figures the markup below sets.
   *
   * THE TAG'S ROW IS RESERVED WHETHER OR NOT THERE IS A TAG. Row 1.14: a pick that
   * turns an absent figure into a priced one must move nothing above it — and if
   * the reservation followed `priceTag`, the art would change width under the
   * reader at the moment the tag appeared, which is the same defect one level up.
   */
  const underCardHeight = 10 + 15 + (twoFaced ? 38 : 0) + 27 + (door ? DOOR_HEIGHT : 0);

  const underCard = (phone: boolean) => (
    <>
      <p
        aria-hidden
        data-testid="modal-zoom-hint"
        className="m-0 whitespace-nowrap font-mono text-[10px]"
        style={{ color: "var(--fg-locked)" }}
      >
        {phone ? cardZoomCopy.hintPhone : cardZoomCopy.hintDesktop}
      </p>
      {twoFaced && (
        <FlipControl
          flipAria={flipLabel(!showingBack)}
          onFlip={onFlip}
          // A real 44px target on the phone. 32 on the desktop, where the column
          // below the art is 97px tall at the drawn dialog height and this stack
          // has to fit three rows inside it.
          size={phone ? 44 : 32}
        />
      )}
      {priceTag && (
        <div data-testid={phone ? "modal-price-mobile" : "modal-price-desktop"}>
          {phone ? (
            // THE PLATE, as the art-wash ratification defines it: opaque `--bg`
            // under one `--border-strong` hairline at radius 7. The phone's stack
            // sits over the blurred wash; the desktop's sits on flat `--bg` and
            // needs none, which is the one difference between the two widths.
            //
            // The `from` figure rides INSIDE the plate with the tag rather than
            // beside it: over the blurred wash a bare 10px line has nothing to be
            // legible against, and that is the whole reason the plate exists.
            <span
              className="inline-flex items-center gap-[6px] rounded-[7px] p-[2px]"
              style={{ background: "var(--bg)", border: "1px solid var(--border-strong)" }}
            >
              <span data-testid="modal-price-tag-mobile">{priceTag}</span>
              {fromLine(true)}
            </span>
          ) : (
            // One ROW, not one more row: the stack's height is reserved by
            // `underCardHeight` and a second line under the tag would need that
            // figure moved — and would put the art's width under the reader at
            // the moment a pick made the line appear, which is the defect row
            // 1.14 already forbids one level up.
            <span className="inline-flex items-center gap-[6px]">
              <span data-testid="modal-price-tag-desktop">{priceTag}</span>
              {fromLine(false)}
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    // Fixed backdrop wrapper — §Backdrop at 0.72, mixed against the canvas so the
    // dim tracks the theme; blurred collection behind is decorative and out-of-scope
    <div
      ref={backdropRef}
      className={
        "fixed inset-0 flex items-center justify-center"
        + (covered ? " z-[49]" : " z-50")
        + (stacked || phoneTop ? " max-md:items-end" : "")
      }
      inert={covered}
      role="presentation"
      onClick={covered ? undefined : onClose}
      style={{
        // A stand-in over a sheet over its original draws its own lighter scrim (addendum §3), so the
        // two layers under it read as two steps down; any other stacked card leaves the sheet's.
        background: dropped
          ? "color-mix(in oklab, var(--bg) 60%, transparent)"
          : stacked ? "transparent" : "color-mix(in oklab, var(--bg) 72%, transparent)",
      }}
      data-stacked={stacked || undefined}
    >
      {/* Positioned OFF the centering flex row, not beside it (pre-open review, round 1): a
          plate sized as a flex sibling shifts the centered dialog by its own width-plus-gap
          whenever only one side has a neighbor (a list's first or last card), moving the
          dialog and footer controls under the reader mid-page. Anchored instead from the
          backdrop's own center, by the same 820px dialog half-width and 24px gap the 1252px
          threshold is built from — so the dialog never moves, with a neighbor on one side,
          both, or neither. Hidden while the zoom is open (decision 1: "a look, not a
          browser" — a visible, clickable plate behind the zoom could still page past it). */}
      {wideEnoughForNeighbors && prevSibling && !zoomed ? (
        <NeighborPlate ref={prevPeekRef} sibling={prevSibling} direction="previous" onPress={() => onPrevPeek?.()} />
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        // Mobile: full-screen sheet (§Mobile: Full-Screen Sheet Container: bg var(--surface-sunken))
        // Desktop: 820px centered, bg --surface-rail, border 1px --border-strong, radius 16px, shadow --modal-shadow
        // Desktop height is fixed rather than h-auto: oracle text runs from one
        // line to twelve, and paging Prev/Next through the collection resized
        // the dialog under the cursor on every step. The content column scrolls
        // instead.
        // `relative` is load-bearing, not decoration: the zoom layer is absolute and
        // takes its box from the nearest positioned ancestor. Without it that ancestor
        // is the fixed backdrop, so the layer would cover the viewport — a second
        // full-screen thing over a dialog over a backdrop, and clicks outside the
        // dialog would dismiss the zoom instead of reaching the backdrop.
        className={(phoneTop ? PHONE_TOP[phoneTop] + " " : stacked ? STACKED_SHEET + " " : "")
          // 80px down, or as far as the room under a centred card allows on a short window.
          + (dropped ? "md:translate-y-[min(80px,calc((100vh-min(620px,85vh))/2-8px))] " : "")
          + "relative flex flex-col overflow-hidden w-full h-full md:h-[620px] md:max-h-[85vh] md:w-[820px] md:flex-row md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)]"}
        style={{
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {/* MOBILE art header — §Mobile: Art Header. The band and the tile inside it
            draw the same picture, and at full sharpness the two competed: the
            card's own text was legible twice over, at two sizes, one behind the
            other. The band keeps the art as atmosphere — blurred, dimmed, and
            scaled past its own edges so the blur has no transparent rim — and
            the tile is the only sharp copy. */}
        <div
          // Inert while the zoom is up: the shipped ✕ and every control under the layer
          // stay mounted for layout, and `useDialogA11y` collects every button in the
          // dialog — so without this, Tab or a screen reader reaches the covered
          // `Close card details` and dismisses the whole dialog instead of the zoom.
          inert={zoomed}
          className={`relative overflow-hidden md:hidden ${compactArt ? "flex items-end gap-[14px]" : ""}`}
          style={{
            padding: compactArt ? "44px 20px 14px" : "44px 20px 20px",
            background: "var(--surface-sunken)",
            boxShadow: "inset 0 -60px 60px -40px rgba(0,0,0,0.55)",
          }}
        >
          <div
            aria-hidden
            data-testid="mobile-art-wash"
            className="absolute inset-0 z-0"
            style={{
              ...artStyle,
              filter: "blur(22px)",
              transform: "scale(1.2)",
              opacity: 0.45,
            }}
          />
          <button
            type="button"
            ref={(el) => { closeRefs.current[0] = el; }}
            onClick={onClose}
            // Stacked over a sheet, the phone's × is the way back to it, named as the desktop pill is.
            aria-label={back ? `Back to ${back}` : "Close card details"}
            // §Mobile: Art Close Button
            className="absolute rounded-full flex items-center justify-center bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] text-[color:var(--fg)]"
            style={{ top: 22, right: 18, width: 32, height: 32, fontSize: 16 }}
          >
            ✕
          </button>
          {/* §Mobile: Art Image — 180px, aspect 63/88, radius 10px. Past the overflow
              threshold it collapses to a 72px thumbnail and the name comes with it. */}
          <div
            data-testid="modal-art-mobile"
            className={`relative z-[1] rounded-[10px] ${compactArt ? "flex-none" : "mx-auto"}`}
            style={{
              width: compactArt ? 72 : 180, aspectRatio: "63/88",
              marginTop: compactArt ? 0 : 6,
              perspective: "1400px",
              // A two-faced card paints its faces inside; this box only holds
              // them, turns them, and keeps the drop shadow. The inset seam moves
              // onto each face, or the turn would show the ring and not the card.
              ...(twoFaced ? null : artStyle),
              boxShadow: twoFaced
                ? "0 20px 40px rgba(0,0,0,0.5)"
                : "0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            {turningArt("rounded-[10px]")}
            {/* The art is the trigger — the silent affordance the builder spine and the
                commander column already use. A stretched button rather than the art
                element itself, so it sits OUTSIDE the box that turns: riding the
                rotation it would face away from the reader on the back. */}
            <button
              type="button"
              ref={(el) => { zoomTriggerRefs.current[0] = el; }}
              onClick={openZoom}
              aria-label={cardZoomCopy.zoomAria(printedNameOf(preview))}
              aria-expanded={zoomed}
              aria-controls={zoomed ? ZOOM_REGION : undefined}
              className="absolute inset-0 rounded-[10px] cursor-pointer bg-transparent border-0 p-0"
            />
          </div>
          {/* Hint, turn, price — 9px under the sharp art and centred on it. Last in
              the column, so an absent price removes its row without moving anything
              above it (table row 1.14).

              Withheld entirely on the 72px thumbnail: the collapsed header is a
              printing-picker state where the art is a locator rather than the thing
              being read, and it has the name and type line beside it instead. */}
          {!compactArt && (
            <div
              data-testid="modal-under-card"
              className="relative z-[1] mt-[9px] flex flex-col items-center gap-[8px]"
            >
              {underCard(true)}
            </div>
          )}
          {compactArt && (
            <div className="relative z-[1] min-w-0">
              {/* The dialog's accessible name still comes from the h3 below, which stays in
                  the DOM (display:none on phone) — this copy is the visual half of the same
                  heading. */}
              <div aria-hidden style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                <div className="font-display font-bold text-[22px] leading-[1.15]" style={{ color: "var(--fg)" }}>
                  {/* The same source as the h3 below it — these are two halves of one
                      heading, and reading them off different objects is how the compact
                      header ended up naming a printing the art is not showing. */}
                  {printedNameOf(preview)}
                </div>
                <p className="text-[13px] mt-[4px] m-0" style={{ color: "var(--fg-muted)" }}>
                  {card.typeLine}
                </p>
              </div>
            </div>
          )}
        </div>

        {door ? <div inert={zoomed} className="md:hidden flex-none">{door("strip")}</div> : null}

        {/* DESKTOP art column — §Desktop: Art Column: 320px, padding 28px, bg --bg */}
        <div
          inert={zoomed}
          className="hidden md:flex items-center justify-center flex-none"
          style={{ width: 320, padding: 28, background: "var(--bg)" }}
        >
          <div
            data-testid="modal-art-desktop"
            className={
              "relative rounded-[12px]"
              + (enteredFrom === "prev" || enteredFrom === "prevPeek" ? " anim-carousel-prev"
                : enteredFrom === "next" || enteredFrom === "nextPeek" ? " anim-carousel-next"
                : "")
            }
            style={{
              // THE ART GIVES BACK WHAT THE STACK NEEDS, rather than the stack
              // hanging off a fixed-size box and being clipped by the dialog's
              // `overflow-hidden`.
              //
              // The column's `items-center` centres the ART'S OWN BOX ONLY — the
              // stack hangs off it via `position: absolute`, deliberately outside
              // normal flow (so the art never moves when a door appears or a pick
              // changes the caption), which means flex centring never sees it. Both
              // halves of the column's slack come out equal, (H - artH) / 2 each,
              // and the bottom half has to hold the stack AND still leave the
              // column's own 28px of padding showing beneath it, exactly as every
              // other edge of the column does — found by a Hugh walk, reproduced by
              // measuring the real DOM: the stack ate into that padding instead of
              // sitting inside slack reserved for it, down to an 11px gap where the
              // other three edges show 28.
              //
              //   (H - artH) / 2 >= stack + 28,  H = min(620px, 85vh) - 56px
              //
              // Solving for the height gives `artH <= min(620px, 85vh) - 2 * stack
              // - 56`, the two 28s doubled out from both sides of the inequality —
              // one for the padding the bottom half must still show, one because
              // shrinking the art by any amount only buys back HALF of it on each
              // side. A derivation that stopped at `room >= stack` (no `+ 28` on
              // the right) is satisfied by the stack alone finishing exactly on the
              // column's inner edge, which is the defect this replaces.
              //
              // ONE dimension is set and the ratio derives the other, the zoom's
              // own rule: a definite width AND a height cap is how an
              // `aspect-ratio` box gets squashed. 63/88 is 0.7159, so the art is
              // 264px wherever there is room and narrower only where a tall stack
              // (the door, say) needs the column to give some back.
              // The extra 2px is the dialog's own 1px border, top and bottom: the
              // box-sizing is border-box, so `h-[620px]` is 618px of padding box —
              // the height the column actually stretches to.
              width: `min(264px, calc((min(620px, 85vh) - 2px - ${artWidthReservePx(underCardHeight)}px) * 0.7159))`,
              aspectRatio: "63/88",
              perspective: "1400px",
              ...(twoFaced ? null : artStyle),
              boxShadow: twoFaced
                ? "0 24px 50px rgba(0,0,0,0.55)"
                : "0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            {turningArt("rounded-[12px]")}
            {/* Same trigger at this width, stretched over the art and outside the box
                that turns — on the back face it would otherwise be facing away. */}
            <button
              type="button"
              ref={(el) => { zoomTriggerRefs.current[1] = el; }}
              onClick={openZoom}
              aria-label={cardZoomCopy.zoomAria(printedNameOf(preview))}
              aria-expanded={zoomed}
              aria-controls={zoomed ? ZOOM_REGION : undefined}
              className="absolute inset-0 rounded-[12px] cursor-pointer bg-transparent border-0 p-0"
            />
            {/* Hint, turn, price — 10px under the art and centred on the card (table
                row 1.1). Hung off the art's own box rather than added to the column,
                because the column centres its children: a stack joining it would lift
                the art by half its height, and row 1.14 says nothing above the tag
                moves when a pick makes it appear.

                The gap is 6px rather than the phone's 8: the column leaves ~97px under
                a 264px card at the drawn dialog height, and three rows plus the turn
                control have to live inside it. */}
            <div
              data-testid="modal-under-card"
              className="absolute top-full left-1/2 mt-[10px] flex -translate-x-1/2 flex-col items-center gap-[6px] whitespace-nowrap"
            >
              {underCard(false)}
              {door ? <div className="mt-[8px]">{door("art")}</div> : null}
            </div>
          </div>
        </div>

        {/* Content column — mobile: flex-1 padding 20px; desktop: padding 30px 32px.
            On desktop the column is a flex stack: the body scrolls, the Prev/Next
            row sits below it so it stays bottom-aligned whatever the oracle text
            length. */}
        <div inert={zoomed} className="flex-1 min-w-0 relative flex flex-col overflow-hidden">
          {/* Desktop close button — §Desktop: Close Button. Over a sheet that names itself it
              becomes the way back to that sheet, in the same slot and on the same plate. */}
          {back ? (
            <button
              type="button"
              ref={(el) => { closeRefs.current[1] = el; backRef.current = el; }}
              onClick={onClose}
              aria-label={`Back to ${back}`}
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
              ref={(el) => { closeRefs.current[1] = el; }}
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
          <div className="flex-1 overflow-auto overscroll-contain p-[20px] md:p-[30px_32px]">
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

                BOTH widths. The name block is in this row on a phone too — the
                art header only takes it when `compactArt` is true, and that wants
                the printing picker expanded. */}
            <div
              className="flex flex-wrap items-start justify-between gap-[12px] md:pr-[var(--close-reserve)]"
              style={{ "--close-reserve": `${closeReserve}px` } as React.CSSProperties}
            >
              {/* The tag survives the collapse and moves out of the art (card-detail R2,
                  table rows 2.1-2.2): a 72px thumb has no room beneath it. It lands
                  beside the mana cost, which is the one thing still drawn in this row on
                  a phone — the name and type line move into the art header, and the
                  heading there is aria-hidden, so a figure placed inside it would reach
                  no assistive technology at all (erratum E10). */}
              {compactArt && priceTag && (
                // The `from` figure comes with it. This is the state where the
                // printing PICKER is open — the one moment the reader is choosing
                // between printings — so a header that named the cheapest nowhere
                // would withhold it exactly where it is being asked for.
                <div className="md:hidden flex items-center gap-[6px]" data-testid="modal-price-compact">
                  <span data-testid="modal-price-tag-compact">{priceTag}</span>
                  {fromLine(true)}
                </div>
              )}
              <div className={compactArt ? "min-w-0 hidden md:block" : "min-w-0"}>
                <h3
                  id={titleId}
                  className="font-display font-bold text-[22px] md:text-[29px] m-0 leading-[1.15] md:leading-[1.1]"
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
              {/* The hook the compact placement's test anchors on: E12 puts the price
                  tag beside this, and a tag that drifted elsewhere in the column would
                  otherwise still satisfy a presence check. */}
              <div data-testid="modal-mana-cost" className="flex-none">
                <ManaCost cost={card.manaCost} />
              </div>
            </div>

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
              card={card}
              deckName={deckName}
              onSelectPartner={onSelectCard}
            />
            <AvailabilityDetail card={card} deckPage={deckPage} />
            <ProxyDetail card={card} />

            {/* Deck-scoped, and absent without a deck: opened from `/collection`
                there is nothing for it to be about. */}
            {deckId && deckHolds && (
              <ProxyControl
                deckId={deckId}
                deckName={deckName ?? ""}
                oracleId={card.oracleId}
                cardName={card.name}
                proxied={(card.proxiedBy ?? []).some((d) => d.id === deckId)}
                known={card.proxiedBy !== null && card.proxiedBy !== undefined}
                onSaved={onProxyWrite}
              />
            )}

            {/* MOBILE meta grid — §Mobile: Meta 2×2 Grid. At 2+ printings the Set cell is
                promoted out of the grid into a full-width row below Rarity and Identity, so
                the disclosure and its region are last in the column and the grid is not
                pushed off-screen the moment you expand. */}
            <div
              className="md:hidden mt-[16px] grid grid-cols-2 rounded-[10px] overflow-hidden"
              style={{ background: "var(--border)", gap: 1, border: "1px solid var(--border)" }}
            >
              {!hasPicker && (
                // Set + collector number of the printing on screen (§Phase 5) — the art is a
                // specific printing now, so the caption names it.
                <MetaCell label="Set" value={caption} />
              )}
              <MetaCell label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
              <MetaCell label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
              <MetaCell
                label="You own"
                value={`×${card.quantity}`}
                quantity
                span={hasPicker ? 2 : undefined}
              />
            </div>

            {hasPicker && (
              <div className="md:hidden mt-[12px]">
                <MobileSetRow
                  ref={mobileTriggerRef}
                  controls={REGION_MOBILE}
                  caption={caption}
                  count={ownedPrintings.length}
                  picked={pick !== null}
                  expanded={expanded}
                  imageUri={resolved?.imageUri ?? null}
                  colorIdentity={card.colorIdentity}
                  onClick={toggleExpanded}
                />
                {renderRegion(REGION_MOBILE)}
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
                  picked={pick !== null}
                  expanded={expanded}
                  onClick={toggleExpanded}
                />
              ) : (
                <MetaField label="Set" value={caption} />
              )}
              <MetaField label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
              <MetaField label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
              <MetaField label="You own" value={`×${card.quantity} ${card.quantity === 1 ? "copy" : "copies"}`} quantity />
            </div>

            {hasPicker && <div className="hidden md:block">{renderRegion(REGION_DESKTOP)}</div>}

            {/* MOBILE link-out — in flow at the end of the scrolling column, not
                pinned. The hairline is load-bearing: it separates the link from
                the printings disclosure so it never reads as "buy this
                printing". Above md: the link lives in the pinned nav row. */}
            {footer ? null : (
              <div
                className="md:hidden flex flex-col mt-[14px]"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <div className="flex items-center min-h-[44px]">
                  <ExternalLink href={manapoolCardUrl(card.name)} label={cardLinkOutCopy.card} />
                </div>
                {onFindDeck ? (
                  <FitsDoor cardName={card.name} onPress={onFindDeck} pickerOpen={fitsOpen} layout="column" />
                ) : null}
              </div>
            )}
          </div>


          {/* DESKTOP Prev/Next — §Desktop: Prev/Next Navigation */}
          <div
            className="hidden md:flex items-center gap-[16px] flex-none mx-[32px] mb-[30px] pt-[20px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {/* The link is first in the DOM because the focus trap follows DOM order
                from wherever focus starts. That start is now named — the dialog
                focuses the ✕ that has layout, since the art became a button and would
                otherwise have taken it — but the order after it is still this one. */}
            {footer ? footer("row") : onFindDeck ? (
              <span className="flex flex-col gap-[8px] min-w-0">
                <ExternalLink href={manapoolCardUrl(card.name)} label={cardLinkOutCopy.card} />
                <FitsDoor cardName={card.name} onPress={onFindDeck} pickerOpen={fitsOpen} layout="row" />
              </span>
            ) : <ExternalLink href={manapoolCardUrl(card.name)} label={cardLinkOutCopy.card} />}
            {/* One / two (handoff decision 6): a list of one drops the whole counter and
                both dead controls, so the link beside it stands alone. */}
            {total > 1 ? (
              <span className="ml-auto flex items-center gap-[14px] flex-none">
                <button
                  ref={prevButtonRef}
                  type="button"
                  onClick={onPrev ?? undefined}
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
                  onClick={onNext ?? undefined}
                  aria-disabled={!onNext}
                  aria-label={cardCarouselCopy.nextAria}
                  className={
                    "cursor-pointer text-[15px] text-[color:var(--accent)]"
                    + (onNext ? "" : " opacity-40")
                  }
                >
                  Next ›
                </button>
              </span>
            ) : null}
          </div>
          {footer ? <div className="md:hidden flex-none">{footer("column")}</div> : null}
        </div>
        {/* The modal's one live region (handoff §Accessibility). Do not add a second.
            A direct child of the dialog rather than of the content column, because the
            zoom marks that column `inert` — and an inert subtree is out of the
            accessibility tree, so every announcement the layer makes would have been
            written where nothing could read it. */}
        <div aria-live="polite" className="sr-only">{announcement}</div>

        {/* THE ZOOM LAYER — a region inside this dialog, never a dialog of its own and
            never the viewport (table §3.1). `absolute inset-0` against the dialog
            element, so the backdrop's click-to-close survives underneath and no second
            focus trap or live region is introduced. */}
        {zoomed && (
          <div
            id={ZOOM_REGION}
            role="region"
            aria-label={cardZoomCopy.layerAria(printedNameOf(preview))}
            data-testid="card-zoom"
            // `inset-0` is the dialog's padding box, and above `md` the dialog also
            // draws a 1px border outside it. The layer cannot cover that strip: the
            // dialog is `overflow-hidden`, so a negative inset paints nothing and
            // receives nothing. A click on the hairline therefore hits the dialog and
            // does nothing at all — which is the right failure for a 1px target that
            // was never a dismissal path, and better than pretending otherwise.
            // THE ZOOM MATCHES THE VIEW BEHIND IT, AT EACH WIDTH (H22, Hugh's walk). Below
            // `md` that view is the phone's art header, so the zoom takes its ground and its
            // wash (below), opaque, and nothing of the page shows through. From `md` the
            // dialog draws no wash, so the zoom keeps the handoff's 94% scrim and its
            // backdrop blur (README:256). The blur needs no prefix: the utility emits the
            // WebKit declaration beside the standard one.
            className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden anim-zoom-in bg-[color:var(--surface-sunken)] md:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] md:backdrop-blur-[10px]"
            onClick={closeZoom}
            style={{
              // Shallow enough to be a turn rather than a lens (table row 4.2).
              perspective: "1400px",
            }}
          >
            {/* THE WASH, the phone header's own treatment (`mobile-art-wash`): the zoomed
                face's art, blurred, dimmed and scaled past its own edges so the blur has
                no transparent rim. The layer clips the overscale. Phone only, as that
                header is. */}
            <div
              aria-hidden
              data-testid="card-zoom-wash"
              className="pointer-events-none absolute inset-0 md:hidden"
              style={{
                ...zoomWashStyle,
                filter: "blur(22px)",
                transform: "scale(1.2)",
                opacity: 0.45,
              }}
            />
            {/* The whole card, at the largest 63/88 the rect allows — 372x520 desktop,
                318x444 phone. Clicking it closes too: three doors, one stage. */}
            <div className="relative flex flex-col items-center" data-testid="card-zoom-stage">
            <div
              data-testid="card-zoom-card"
              className={`relative rounded-[13px] md:rounded-[14px] w-[var(--zoom-w)] md:w-[var(--zoom-w-md)] ${
                twoFaced ? "anim-card-turn" : ""
              }`}
              data-face={twoFaced ? (zoomFlipped ? "back" : "front") : undefined}
              onTransitionEnd={twoFaced ? onTurnSettled : undefined}
              style={{
                // ONE dimension is set and the ratio derives the other, because a
                // definite width AND a height cap is how an `aspect-ratio` box gets
                // squashed: once the cap bites, the width does not follow and the card
                // is drawn out of proportion. So the width is the smallest of the drawn
                // figure, what the viewport's width allows, and what its height allows
                // — 63/88 is 0.7159 — and the height is always the ratio's answer.
                //
                // The subtracted room is the caption, the ✕'s slot and the layer's own
                // breathing space; the desktop dialog is `min(620px, 85vh)` tall, which
                // is what a landscape laptop can make shorter than the card.
                // The turn control sits UNDER the card now rather than on it, so a
                // two-faced card has to give back its 44px and the 12px above it.
                "--zoom-w": twoFaced
                  ? "min(318px, calc(100vw - 32px), calc((100vh - 196px) * 0.7159))"
                  : "min(318px, calc(100vw - 32px), calc((100vh - 140px) * 0.7159))",
                "--zoom-w-md": twoFaced
                  ? "min(372px, calc((min(620px, 85vh) - 128px) * 0.7159))"
                  : "min(372px, calc((min(620px, 85vh) - 72px) * 0.7159))",
                aspectRatio: "63/88",
                // A one-faced card is its own picture; a two-faced one draws both faces
                // inside and this box only turns them.
                ...(twoFaced ? null : artStyle),
                transformStyle: twoFaced ? "preserve-3d" : undefined,
                transform: twoFaced && zoomFlipped ? "rotateY(180deg)" : undefined,
                boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.35)",
              } as React.CSSProperties}
            >
              {/* Two faces on one piece of card stock. Both are drawn, both hide their
                  own back, and the card turns — so neither face is ever seen mirrored
                  and the reader watches one object move rather than one picture being
                  replaced by another. */}
              {twoFaced && (
                <CardFaces
                  front={frontStyle}
                  back={backStyle}
                  radius="rounded-[13px] md:rounded-[14px]"
                  // A shade darker than the art column's, because the shadow it
                  // paints over is darker: `0 24px 60px rgba(0,0,0,.6)` against the
                  // column's `.55`/`.5`.
                  seam="inset 0 0 0 1px rgba(0,0,0,0.35)"
                  testIdPrefix="card-zoom"
                />
              )}
            </div>
            {/* OUTSIDE the box that turns. Inside it, the control rode the rotation:
                on the back face its corner became the opposite one and its glyph was
                drawn from behind, mirrored. It belongs to the zoom, not to either
                face. The press stops here too — the layer dismisses on click, and a
                control that turns the card is not one of the three doors out.

                UNDER the card rather than on it, matching the modal behind it: one
                placement for one control, and a card at hand size should not have a
                button printed across its bottom edge. */}
            {twoFaced && (
              <span
                onClick={(e) => e.stopPropagation()}
                className="mt-[12px] flex justify-center"
              >
                <FlipControl
                  controlRef={zoomFlipRef}
                  flipAria={flipLabel(!zoomFlipped)}
                  onFlip={onZoomFlip}
                  size={44}
                />
              </span>
            )}
            </div>
            {/* One mono line: which printing you are holding. Never the price — a card
                in your hand has none printed on it, and the tag is one dismissal away. */}
            {zoomCaption && (
              <p
                // One line, and one line's worth of room: a long set name on a narrow
                // phone would otherwise wrap under the card or run past the layer. The
                // end ellipsis is the same treatment every truncated name in this app
                // gets — the set code and number are the half that identifies the
                // printing, and they sit at the end where the ellipsis never eats them
                // first.
                // `relative` puts it over the wash, an absolute sibling that would otherwise
                // paint on top of an in-flow line. ON THE PLATE below `md`, where the wash
                // is, as the art-wash ratification defines it (the phone's price stack above):
                // over the wash a bare 11px line has nothing to be legible against, and a light
                // art read it at about 1.5:1. From `md` the scrim is its ground, as before.
                className="relative font-mono text-[11px] mt-[14px] m-0 max-w-[calc(100%-32px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-[7px] px-[8px] py-[3px] bg-[color:var(--bg)] border border-[color:var(--border-strong)] md:rounded-none md:p-0 md:bg-transparent md:border-0"
                style={{ color: "var(--fg-muted)" }}
              >
                {zoomCaption}
              </p>
            )}
            <button
              type="button"
              ref={zoomCloseRef}
              onClick={(e) => { e.stopPropagation(); closeZoom(); }}
              aria-label={cardZoomCopy.close}
              // The modal's shipped X in its shipped slot at both widths, gaining a
              // plate so it clears the scrim. Its label changes, its position does not.
              // The plate is what clears the scrim; the rest is the shipped ✕'s own
              // slot and size at each width.
              className="absolute flex items-center justify-center rounded-full top-[22px] right-[18px] md:right-[24px] w-[32px] md:w-[34px] h-[32px] md:h-[34px] text-[16px] md:text-[15px] bg-[color:var(--elevated)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      {wideEnoughForNeighbors && nextSibling && !zoomed ? (
        <NeighborPlate ref={nextPeekRef} sibling={nextSibling} direction="next" onPress={() => onNextPeek?.()} />
      ) : null}
    </div>
  );
}

/**
 * TWO FACES ON ONE PIECE OF CARD STOCK — both drawn, each hiding its own back —
 * for whichever box above is doing the turning.
 *
 * One component rather than two copies. The modal's art and the zoom turn the
 * same object by the same rule, and the rule is four properties that have to
 * agree: both faces absolutely filling the box, `backface-visibility: hidden` on
 * each, the back pre-rotated 180°, and each face carrying the seam itself —
 * they paint over the parent's inset ring, so without it the card loses its edge
 * on exactly the cards that have two of them.
 *
 * Only the radius and the seam's darkness differ per surface, because the shadow
 * each face paints over differs, so both are props. Everything else is the
 * construction, and a second copy of it is where the two would drift.
 */
function CardFaces({
  front,
  back,
  radius,
  seam,
  testIdPrefix,
}: {
  front: React.CSSProperties;
  back: React.CSSProperties;
  radius: string;
  seam: string;
  testIdPrefix: string;
}) {
  return (
    <>
      <div
        aria-hidden
        data-testid={`${testIdPrefix}-face-front`}
        className={`absolute inset-0 ${radius}`}
        style={{ ...front, backfaceVisibility: "hidden", boxShadow: seam }}
      />
      <div
        aria-hidden
        data-testid={`${testIdPrefix}-face-back`}
        className={`absolute inset-0 ${radius}`}
        style={{
          ...back,
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          boxShadow: seam,
        }}
      />
    </>
  );
}

/**
 * The modal's turn-over control (#363). It sits UNDER the card at every width and
 * on every surface — the modal's art column, the phone's art header, and the zoom
 * — between the zoom hint above it and the price below (#4).
 *
 * It used to sit ON the art, bottom-centre, which put a button across the bottom
 * edge of the picture the modal exists to show. Under the card it is still
 * unmistakably about the card and covers none of it, and one placement across
 * three mounts is what stops the modal and its zoom drawing the same control two
 * ways. It still cannot read as a sibling of Prev/Next: those page between cards
 * and live in the content column's footer, this turns one card over and lives
 * under the card.
 *
 * Its accessible name is the face it turns TO, never "flip" — the act is the
 * part the reader can already see, and the other face's name is the fact they
 * are reaching for.
 *
 * The drawn glyph is a turn arrow, not the `//` the row and the tile carry. One
 * notation across all three was the tidier idea and the wrong one: `//` is a
 * mark that says *this card has two faces*, and reading it as a control asks the
 * reader to infer an action from a statement. A button on the art has to say
 * what pressing it does, and every app that turns a card over draws an arrow
 * going round.
 */
function FlipControl({
  flipAria, onFlip, size, controlRef,
}: {
  /**
   * Built by the caller, because what the label can say depends on the printing:
   * the other face's NAME where the two differ, and the side where one name is
   * printed on both (`twoFacedCopy.flipToSideAria`).
   */
  flipAria: string;
  onFlip: () => void;
  /** 44 on the phone's art header and inside the zoom, 32 in the desktop art column. */
  size: number;
  /** The zoom passes one so it can hand focus to the turn on open. */
  controlRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={controlRef}
      type="button"
      onClick={onFlip}
      aria-label={flipAria}
      // The ground is a scrim rather than a solid: the control has to stay
      // legible over whatever art is under it without hiding a square of the card.
      // In normal flow now that it is under the card; the stack around it centres
      // it. The ground stays the scrim it drew over art — the phone's stack sits on
      // the blurred wash, so a transparent control would still have to survive
      // whatever crop is behind it.
      className="flex flex-none items-center justify-center cursor-pointer bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
      style={{ width: size, height: size, borderRadius: 7 }}
    >
      <TurnOverIcon size={Math.round(size * 0.5)} />
    </button>
  );
}

/**
 * The turn arrow: a circle open at the top with a head on the rising end, in the
 * same `currentColor` stroke shape as `SearchIcon` so the two read as one set.
 * The gap sits at the top because the head has to be somewhere the eye lands
 * first, and at 17px a head on the underside of the circle is a smudge.
 */
function TurnOverIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 5.1A6 6 0 1 0 13.5 5.1" />
      <path d="m13.5 5.1 .31 2.6M13.5 5.1l2.55 .6" />
    </svg>
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
            color: quantity || rarity ? "var(--accent)" : "var(--fg)",
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
          style={{ color: quantity || rarity ? "var(--accent)" : "var(--fg)" }}
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
function TriggerHint({ count, picked, expanded }: { count: number; picked: boolean; expanded: boolean }) {
  const chevron = pickerCopy.triggerChevron(expanded);
  if (!picked) {
    return (
      <div className="font-mono text-[11px] mt-[4px]" style={{ color: "var(--accent)" }}>
        {pickerCopy.triggerCount(count)} {chevron}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[5px] mt-[4px]">
      <span aria-hidden className="rotate-45" style={{ width: 7, height: 7, background: "var(--accent)" }} />
      <span
        className="font-mono uppercase text-[10px] tracking-[0.14em]"
        style={{ color: "var(--accent)" }}
      >
        {pickerCopy.triggerPicked}
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
  ref, controls, caption, count, picked, expanded, onClick,
}: {
  ref: React.Ref<HTMLButtonElement>;
  controls: string;
  caption: string;
  count: number;
  picked: boolean;
  expanded: boolean;
  onClick: () => void;
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
      aria-label={expanded ? pickerCopy.triggerCollapseAria : pickerCopy.triggerAria(count, caption)}
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
  ref, controls, caption, count, picked, expanded, imageUri, colorIdentity, onClick,
}: {
  ref: React.Ref<HTMLButtonElement>;
  controls: string;
  caption: string;
  count: number;
  picked: boolean;
  expanded: boolean;
  imageUri: string | null;
  colorIdentity: string[];
  onClick: () => void;
}) {
  const thumbStyle: React.CSSProperties = imageUri
    ? { backgroundImage: cssUrl(imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(colorIdentity) };
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      // The region is unmounted while collapsed, so the reference goes with it — a trigger
      // pointing at a missing element is a broken relationship, not an empty one.
      aria-controls={expanded ? controls : undefined}
      aria-label={expanded ? pickerCopy.triggerCollapseAria : pickerCopy.triggerAria(count, caption)}
      className="cursor-pointer w-full text-left flex items-center gap-[12px] p-[11px_14px] bg-[color:var(--elevated)] border border-[color:var(--border-dashed)]"
      style={{
        minHeight: 62,
        // Square-bottomed while open so the region reads as a continuation of this row.
        borderRadius: expanded ? "10px 10px 0 0" : 10,
      }}
    >
      <span
        aria-hidden
        className="flex-none rounded-[5px]"
        style={{ width: 40, height: 56, ...thumbStyle, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
      />
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
