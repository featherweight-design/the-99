"use client";
// Card detail modal per property table §Card Detail Modal.
// - Mobile: full-screen sheet, art up top with color-identity gradient fallback
// - Desktop: 820px centered overlay, two-column (320px art + content), Prev/Next
// - Focus trap (READINESS #5): queries focusable children, wraps Tab/Shift+Tab
// - Escape closes; focus returns to the previously-focused element on close

import Link from "next/link";
import React, { useCallback, useMemo, useRef, useState, useTransition } from "react";
import type { BrowseCard, PreferredPrinting } from "../../lib/collection/browse";
import {
  cssUrl,
  printedNameOf,
  printingCaption,
  resolvedPrinting,
  WUBRG_COLOR,
} from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { printingPickerCopy } from "../../lib/copy/collection";
import { availabilityState } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityMarker } from "../ui/availability-marker";
import { clearCardArtPreference, setCardArtPreference } from "../../app/collection/actions";
import { ManaCost } from "./mana-pips";
import { PrintingRegion, OVERFLOW_THRESHOLD, printingEntryCount, printingKey } from "./printing-region";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { faceNames, isTwoFaced } from "../../lib/cards/faces";
import { printedNameCopy, twoFacedCopy } from "../../lib/copy/card-surfaces";
import { ExternalLink } from "../ui/external-link";
import { manapoolCardUrl } from "../../lib/manapool/links";
import { cardLinkOutCopy } from "../../lib/copy/collection-browse";

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
function AvailabilityDetail({ card }: { card: BrowseCard }) {
  const a = card.availability;
  if (!a) return null;
  const state = availabilityState(a);
  // A claim with copies to spare still reads as `free` — that is the state the
  // marker is right to draw — but it is exactly the case #353 was filed about,
  // so the receipt renders on claims, not on state.
  if (state === "free" && a.claims.length === 0) return null;
  const c = availabilityCopy.collection;
  const note =
    state === "hard" ? c.detailHardNote
    : state === "soft" ? c.detailSoftNote(a.claims.filter((cl) => !cl.mature).length)
    : state === "over" ? c.detailOverNote
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
                  {claim.mature
                    ? c.detailClaimHolds(claim.quantity)
                    : c.detailClaimWants(claim.quantity)}
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

export function CardModal({
  card,
  position,
  total,
  onClose,
  onPrev,
  onNext,
  onArtChange,
}: {
  card: BrowseCard;
  position: number;
  total: number;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  /**
   * Called when the art pick is written, so a caller holding a copy of this card can
   * drop it. The write changes what the card says about itself, and a stale copy would
   * show the reader the printing they just replaced.
   */
  onArtChange?: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // One trigger per breakpoint tree; only one has layout at a time, and focus() on the
  // display:none one is a no-op, so Escape hands focus to whichever is actually on screen.
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // No reset on card change: the provider keys this component on oracleId, so
  // Prev/Next remounts and a new card starts on its front face by construction.
  const [flipped, setFlipped] = useState(false);
  const [, startWrite] = useTransition();

  // The pick the user just made, before the server action's revalidate lands. Seeding it from
  // the card is only correct because the caller keys this component on oracleId — paging
  // Prev/Next remounts rather than reusing the state of the card you just left.
  const [pick, setPick] = useState<PreferredPrinting | null>(card.preferredPrinting);

  // Everything the modal shows about the current printing — art, caption, shown-now badge —
  // reads from this one object, so an optimistic pick moves all three together or none.
  const preview = useMemo<BrowseCard>(() => ({ ...card, preferredPrinting: pick }), [card, pick]);
  const resolved = resolvedPrinting(preview);
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

  // Escape collapses the region first and returns focus to the Set field; a second Escape
  // closes the dialog exactly as it does today.
  const onEscape = useCallback(() => {
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
  }, [expanded, onClose]);

  // Focus trap + Escape + focus-return — shared hook, shared with the export dialog.
  useDialogA11y(dialogRef, onEscape);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    setAnnouncement(next ? pickerCopy.announceOpen(ownedPrintings.length) : "");
  }

  function onPick(p: { setCode: string; collectorNumber: string }) {
    setPick({ setCode: p.setCode, collectorNumber: p.collectorNumber });
    onArtChange?.();
    startWrite(() => {
      void setCardArtPreference(card.oracleId, p.setCode, p.collectorNumber);
    });
  }

  function onClearPick() {
    setPick(null);
    onArtChange?.();
    startWrite(() => {
      void clearCardArtPreference(card.oracleId);
    });
  }

  // Announced here rather than in the region: the string names the printing that becomes
  // current once the pick is gone, and only the resolver knows which one that is.
  function onReset() {
    onClearPick();
    const fallback = resolvedPrinting({ ...card, preferredPrinting: null });
    if (fallback) setAnnouncement(pickerCopy.announceReset(fallback.setName ?? fallback.setCode));
  }

  const caption = printingCaption(preview);

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

  const REGION_MOBILE = "printings-mobile";
  const REGION_DESKTOP = "printings-desktop";

  // A back face to turn to, or none (#363). The image is the second condition and
  // not an afterthought: a `transform` row seeded before the back-face column
  // existed carries the layout and no art, and a control that turns to a
  // colour-identity gradient is the lie the layout gate exists to prevent.
  const twoFaced = isTwoFaced(card.layout) && Boolean(card.backImageUri);
  // The faces of the name on screen, which is the printed one when the copy in
  // hand carries a printed name. The title above and this announcement must
  // name the same card.
  const faces = faceNames(printedNameOf(card));

  function onFlip() {
    const next = !flipped;
    setFlipped(next);
    // The swap is silent by design — no motion, no caption change — so the live
    // region is the only thing that reports it.
    setAnnouncement(twoFacedCopy.flippedAria(next ? faces.back : faces.front));
  }

  // Art follows the resolved printing, not the card-level image: they are the same value
  // today, but an optimistic pick updates `resolved` a revalidate earlier.
  //
  // The back face has no such per-printing form: it is stored once per oracle id,
  // so a flip on a card whose front is a picked printing can show a back from a
  // different one. Known limitation — closing it means a `back_image_uri` on
  // `printings` and the art-tier subqueries reading it.
  const faceImage = flipped ? card.backImageUri : resolved?.imageUri;
  const artStyle: React.CSSProperties = faceImage
    ? { backgroundImage: cssUrl(faceImage), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };

  return (
    // Fixed backdrop wrapper — §Backdrop at 0.72, mixed against the canvas so the
    // dim tracks the theme; blurred collection behind is decorative and out-of-scope
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onClick={onClose}
      style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: full-screen sheet (§Mobile: Full-Screen Sheet Container: bg var(--surface-sunken))
        // Desktop: 820px centered, bg --surface-rail, border 1px --border-strong, radius 16px, shadow --modal-shadow
        // Desktop height is fixed rather than h-auto: oracle text runs from one
        // line to twelve, and paging Prev/Next through the collection resized
        // the dialog under the cursor on every step. The content column scrolls
        // instead.
        className="flex flex-col overflow-hidden w-full h-full md:h-[620px] md:max-h-[85vh] md:w-[820px] md:flex-row md:rounded-2xl bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)]"
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
            onClick={onClose}
            aria-label="Close card details"
            // §Mobile: Art Close Button
            className="absolute rounded-full flex items-center justify-center bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] text-[color:var(--fg)]"
            style={{ top: 22, right: 18, width: 32, height: 32, fontSize: 16 }}
          >
            ✕
          </button>
          {/* §Mobile: Art Image — 180px, aspect 63/88, radius 10px. Past the overflow
              threshold it collapses to a 72px thumbnail and the name comes with it. */}
          <div
            className={`relative z-[1] rounded-[10px] ${compactArt ? "flex-none" : "mx-auto"}`}
            style={{
              width: compactArt ? 72 : 180, aspectRatio: "63/88",
              marginTop: compactArt ? 0 : 6,
              ...artStyle,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            {/* Absent on the 72px thumbnail: a 44px target on a 72px image is
                most of the art, and the collapsed header is a printing-picker
                state where the art is a locator rather than the thing read. The
                control returns with the full-size art. */}
            {twoFaced && !compactArt && (
              <FlipControl
                otherFaceName={flipped ? faces.front : faces.back}
                onFlip={onFlip}
                size={44}
              />
            )}
          </div>
          {compactArt && (
            // The dialog's accessible name still comes from the h3 below, which stays in the
            // DOM (display:none on phone) — this copy is the visual half of the same heading.
            <div aria-hidden className="relative z-[1] min-w-0" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              <div className="font-display font-bold text-[22px] leading-[1.15]" style={{ color: "var(--fg)" }}>
                {card.name}
              </div>
              <p className="text-[13px] mt-[4px] m-0" style={{ color: "var(--fg-muted)" }}>
                {card.typeLine}
              </p>
            </div>
          )}
        </div>

        {/* DESKTOP art column — §Desktop: Art Column: 320px, padding 28px, bg --bg */}
        <div
          className="hidden md:flex items-center justify-center flex-none"
          style={{ width: 320, padding: 28, background: "var(--bg)" }}
        >
          <div
            className="relative w-full rounded-[12px]"
            style={{
              aspectRatio: "63/88",
              ...artStyle,
              boxShadow: "0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            {twoFaced && (
              <FlipControl
                otherFaceName={flipped ? faces.front : faces.back}
                onFlip={onFlip}
                size={34}
              />
            )}
          </div>
        </div>

        {/* Content column — mobile: flex-1 padding 20px; desktop: padding 30px 32px.
            On desktop the column is a flex stack: the body scrolls, the Prev/Next
            row sits below it so it stays bottom-aligned whatever the oracle text
            length. */}
        <div className="flex-1 min-w-0 relative flex flex-col overflow-hidden">
          {/* Desktop close button — §Desktop: Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            className="hidden md:flex absolute items-center justify-center rounded-full bg-[color:var(--surface-raised)] border border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
            style={{ top: 22, right: 24, width: 34, height: 34, fontSize: 15 }}
          >
            ✕
          </button>

          <div className="flex-1 overflow-auto p-[20px] md:p-[30px_32px]">
            {/* Name + type + mana pips — §Mobile: Name + Type Header.
                Right padding on desktop clears the absolutely-positioned close
                button, which otherwise sits on top of the mana pips. */}
            <div className="flex items-start justify-between gap-[12px] md:pr-[46px]">
              <div className={compactArt ? "min-w-0 hidden md:block" : "min-w-0"}>
                <h3
                  id="card-modal-title"
                  className="font-display font-bold text-[22px] md:text-[29px] m-0 leading-[1.15] md:leading-[1.1]"
                  style={{ color: "var(--fg)" }}
                >
                  {printedNameOf(card)}
                </h3>
                {/* The oracle name — absent, not blank, when the printing prints
                    its own name. A reserved empty line would spend 23px on every
                    ordinary card to make the ordinary case look incomplete. The
                    tighter gap above binds the two names into one unit; the
                    looser one below keeps the type line a separate fact. */}
                {card.printedName && (
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
                    card.printedName ? "mt-[10px]" : "mt-[4px] md:mt-[6px]"
                  }`}
                  style={{ color: "var(--fg-muted)" }}
                >
                  {card.typeLine}
                </p>
              </div>
              <ManaCost cost={card.manaCost} />
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

            <AvailabilityDetail card={card} />

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
            <div
              className="md:hidden flex items-center min-h-[44px] mt-[14px]"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <ExternalLink href={manapoolCardUrl(card.name)} label={cardLinkOutCopy.card} />
            </div>
          </div>

          {/* The modal's one live region (handoff §Accessibility). Do not add a second. */}
          <div aria-live="polite" className="sr-only">{announcement}</div>

          {/* DESKTOP Prev/Next — §Desktop: Prev/Next Navigation */}
          <div
            className="hidden md:flex items-center gap-[16px] flex-none mx-[32px] mb-[30px] pt-[20px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {/* The link is first in the DOM because the focus trap follows DOM
                order — there is no initialFocusRef on this dialog. */}
            <ExternalLink href={manapoolCardUrl(card.name)} label={cardLinkOutCopy.card} />
            <span className="ml-auto flex items-center gap-[14px] flex-none">
              <button
                type="button"
                onClick={onPrev ?? undefined}
                disabled={!onPrev}
                aria-label="Previous card"
                className="cursor-pointer text-[15px] disabled:opacity-40 text-[color:var(--fg-faint)]"
              >
                ‹ Prev
              </button>
              <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
                {position.toLocaleString()} of {total.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={onNext ?? undefined}
                disabled={!onNext}
                aria-label="Next card"
                className="cursor-pointer text-[15px] disabled:opacity-40 text-[color:var(--accent)]"
              >
                Next ›
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The modal's turn-over control (#363). It sits ON the art, bottom-right, rather
 * than in the modal's chrome, so it cannot read as a sibling of Prev/Next: those
 * page between cards, this turns one card over.
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
  otherFaceName, onFlip, size,
}: {
  otherFaceName: string;
  onFlip: () => void;
  /** 44 on the phone's art header, 34 in the desktop art column. */
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={twoFacedCopy.flipToAria(otherFaceName)}
      // The ground is a scrim rather than a solid: the control has to stay
      // legible over whatever art is under it without hiding a square of the card.
      className="absolute flex items-center justify-center cursor-pointer bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] border border-[color:var(--border-strong)] text-[color:var(--fg)]"
      style={{ right: 10, bottom: 10, width: size, height: size, borderRadius: 7 }}
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
