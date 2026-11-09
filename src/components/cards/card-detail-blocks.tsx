"use client";
// The card detail's non-modal blocks, drawn from props alone: the proxy deck list, the three bracket facts, the owned line, the
// receipt heading and the availability receipt. Split out of `card-modal.tsx` (landing demo split 5j) so the signed-in modal and
// the landing demo draw the same markup. Every per-reader value (ownership, availability, draft wants, the edit-copies
// press, the receipt link) arrives as a prop; nothing here reads a session, an action or a table.

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import type { BrowseCard } from "../../lib/collection/browse";
import { availabilityState, type DeckClaim } from "../../lib/cards/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { allocateClaims } from "../../lib/cards/allocate";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CardFactMark } from "./card-fact-mark";
import { cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { proxyCopy } from "../../lib/copy/proxies";
import { RECEIPT_LINK_CLASS } from "./card-modal-shared";

/**
 * Whether a deck's name in these blocks is a link to its page. True everywhere but the landing's demo, whose decks are made up
 * and whose pages are the signed-in app's: there a name draws as plain text, so a press leaves nothing behind and the page makes
 * no request for a route a visitor cannot open (a link prefetches on sight).
 */
export const DeckLinksContext = createContext(true);

const DECK_LINK_LOOK = "underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current transition-colors";

/** A deck's name: a link to `/decks/[id]`, or (`DeckLinksContext` false) the same name as text. `layout` is its box, `label` the link's accessible name. */
function DeckLink({ id, label, layout, children }: { id: string; label: string; layout: string; children: ReactNode }) {
  if (!useContext(DeckLinksContext)) return <span className={layout}>{children}</span>;
  return (
    <Link href={`/decks/${id}`} aria-label={label} className={`${layout} ${DECK_LINK_LOOK}`}>
      {children}
    </Link>
  );
}

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
export function ProxyDetail({ card }: { card: BrowseCard }) {
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
            <DeckLink id={deck.id} label={c.deckLinkAria(deck.name)} layout="block truncate">
              {deck.name}
            </DeckLink>
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
  // A brew holds only what the player GAVE it (2026-10-11); the rest of its ask is a want.
  if (!claim.mature) {
    return (claim.granted ?? 0) > 0 ? c.detailClaimHolds(claim.granted ?? 0) : c.detailClaimWants(claim.quantity);
  }
  const holds = c.detailClaimHolds(claim.quantity);
  if (!contested) return holds;
  if (allocated === 0) return `${holds} · ${c.detailClaimBuys}`;
  if (allocated < claim.quantity) {
    return `${holds} · ${c.detailClaimGetsPartial(allocated, claim.quantity)}`;
  }
  return `${holds} · ${c.detailClaimGets}`;
}

/**
 * `×5 · ◆ short` (README R2 "Teaser price"): what the reader owns, and the availability marker
 * when copies are spoken for. The marker is the same component every availability figure in the
 * app draws, so its glyph and its label's ink come from the marker's own state map (plan PR 3,
 * the `--avail` resolution) and never from a token of this sheet's own.
 */
export function OwnedLine({ card, deckPage }: { card: BrowseCard; deckPage: boolean }) {
  const a = card.availability;
  const state = a ? availabilityState(a) : "free";
  return (
    <span data-testid="owned-line" className="inline-flex items-center gap-[8px] font-mono text-[12px]">
      {/* `a.owned` where the availability read landed, for the reason the block below gives. */}
      <span style={{ color: "var(--accent-text)" }}>×{a ? a.owned : card.quantity}</span>
      {a && state !== "free" && (
        <>
          <span aria-hidden style={{ color: "var(--fg-faint)" }}>·</span>
          <AvailabilityMarker availability={a} density="row" nameless bareOne={deckPage} className="font-mono text-[12px]" />
        </>
      )}
    </span>
  );
}


/**
 * The receipt's label line: its heading, and the one link it carries: inside the shell the link that
 * edits what the reader owns (collection edit R2 §C1, add a card from anywhere D), or from a Shopping row
 * I got it's (A11), which takes the slot from it there.
 */
export function ReceiptHeading({ owned, onEditCopies, link = null }: { owned: number; onEditCopies: (() => void) | null; link?: ReactNode }) {
  const c = availabilityCopy.collection;
  const heading = (
    <div
      className="font-mono text-[10px] tracking-[0.1em] uppercase"
      style={{ color: "var(--fg-faint)" }}
    >
      {c.detailHeading}
    </div>
  );
  // Without a link the heading is exactly what shipped: no wrapper, nothing reserved.
  if (!onEditCopies && !link) return heading;
  return (
    <div className="flex items-center justify-between gap-[12px]">
      {heading}
      {onEditCopies ? (
        <button type="button" data-testid="edit-copies-link" onClick={onEditCopies} className={RECEIPT_LINK_CLASS}>
          {owned > 0 ? collectionEditCopy.copies.edit : collectionEditCopy.copies.addToCollection}
        </button>
      ) : link}
    </div>
  );
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
export function AvailabilityDetail({
  card, deckPage, onEditCopies = null, receiptLink = null,
}: { card: BrowseCard; deckPage: boolean; onEditCopies?: (() => void) | null; receiptLink?: ReactNode }) {
  // A card owned in no copy reads its claims from `unownedAvailability` (owned 0), so the decks that
  // want it are still named. It owns nothing, so it draws no marker: `availabilityState` reads it free.
  const a = card.availability ?? card.unownedAvailability ?? null;
  const c = availabilityCopy.collection;
  const state = a ? availabilityState(a) : "free";
  // The decks wanting it only in a draft (`loadDraftWants`). Not claims, so no figure below counts
  // them, but they are rows of "In your decks": a card mid-tune is wanted, never by nobody.
  const drafts = card.draftWants ?? [];
  // Inside the shell (the edit link), and from a Shopping row with I got it on, the receipt draws even when it has
  // nothing to report, because a link lives on its label line: a card with no claims would otherwise
  // have nowhere to put it. Anywhere else a receipt with nothing in it stays absent, as it was.
  if ((onEditCopies || receiptLink) && (!a || (state === "free" && a.claims.length === 0 && drafts.length === 0))) {
    const owned = a ? a.owned : card.quantity;
    return (
      <div
        data-testid="owned-receipt"
        className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <ReceiptHeading owned={owned} onEditCopies={onEditCopies} link={receiptLink} />
        {owned > 0 ? (
          <div className="mt-[8px] flex items-center gap-[8px] text-[13px]" style={{ color: "var(--fg-body)" }}>
            <span className="font-mono" style={{ color: "var(--accent-text)" }}>×{owned}</span>
          </div>
        ) : (
          // Owned in none, under either link: A4's `none`, so the receipt reads `none → ×1` once a purchase or an Add
          // to collection lands (add a card from anywhere D2, the same word the claims receipt below draws).
          <div className="mt-[8px] font-mono text-[13px]" style={{ color: "var(--fg-faint)" }}>{collectionEditCopy.copies.none}</div>
        )}
      </div>
    );
  }
  if (!a) return null;
  // A claim with copies to spare still reads as `free` — that is the state the
  // marker is right to draw — but it is exactly the case #353 was filed about,
  // so the receipt renders on claims, not on state. A draft want renders it too.
  if (state === "free" && a.claims.length === 0 && drafts.length === 0) return null;
  // Who actually gets each copy, from the one implementation of that arithmetic — the same
  // call the arrivals receipt and the chooser's preview make. A row's verb is this and not
  // `claim.mature`: a committed deck that came second to the only copy owned holds nothing.
  const allocation = allocateClaims(a);
  const allocated = new Map(allocation.map((cl) => [cl.deckId, cl.allocated]));
  // Contested means a committed deck asked for a copy the supply could not give it. Only then
  // does saying who gets it tell the reader anything.
  // Brews are in the allocation (they can be given a copy) but their unmet ask is soft, so it
  // never makes the card contested on its own.
  const contested = allocation.some((cl) => !cl.brew && cl.allocated < cl.quantity);
  // The brews, which no figure in this block counts. Named where a committed deck is already
  // in play; in the soft state every claimant is one and `detailSoftNote` says so already.
  // A brew holding a copy the player gave it IS counted (in hard), so it is not one of these.
  const brews = a.claims.filter((cl) => !cl.mature && !(cl.granted ?? 0)).length;
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
      <ReceiptHeading owned={a.owned} onEditCopies={onEditCopies} link={receiptLink} />
      <div
        className="mt-[8px] flex items-center gap-[8px] text-[13px]"
        style={{ color: "var(--fg-body)" }}
      >
        {/* `a.owned`, not `card.quantity`: the two arrive from different
            queries, and the split below is `a.hard + a.free`. A total taken
            from anywhere but the availability query is how a receipt stops
            adding up. */}
        {a.owned > 0 ? (
          <span className="font-mono" style={{ color: "var(--accent-text)" }}>×{a.owned}</span>
        ) : (
          // Owned in none: the word the Shopping door's receipt uses (A4), never a `×0`.
          <span className="font-mono" style={{ color: "var(--fg-faint)" }}>{collectionEditCopy.copies.none}</span>
        )}
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
      {(a.claims.length > 0 || drafts.length > 0) && (
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
                <DeckLink id={claim.id} label={c.detailDeckLinkAria(claim.name)} layout="truncate">
                  {claim.name}
                </DeckLink>
                <span className="shrink-0 font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>
                  {claimLabel(claim, allocated.get(claim.id) ?? 0, contested)}
                </span>
              </li>
            ))}
            {/* After the claims, never merged into them: these rows hold nothing and want no
                counted copy, which is what sets them apart from a brew's `wants N`. */}
            {drafts.map((deck) => (
              <li
                key={`draft-${deck.id}`}
                data-testid="draft-want"
                className="flex items-baseline justify-between gap-[12px] py-[2px] text-[13px]"
                style={{ color: "var(--fg-body)" }}
              >
                <DeckLink id={deck.id} label={c.detailDeckLinkAria(deck.name)} layout="truncate">
                  {deck.name}
                </DeckLink>
                <span className="shrink-0 font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>
                  {c.detailClaimInDraft}
                </span>
              </li>
            ))}
          </ul>
          {/* Owned in none and wanted only by drafts and brews, the accounting is `0 in use · 0 free`
              under a `none` that already said it, and there is no count for the drafts note to
              qualify. A committed want still prints, as `1 wanted · you own 0`. */}
          {(a.owned > 0 || a.free < 0) && (
            <div
              className="mt-[8px] font-mono text-[12px]"
              style={{ color: "var(--fg-muted)" }}
            >
              {a.free < 0 ? c.detailSplitOver(a.hard, a.owned) : c.detailSplit(a.hard, a.free)}
            </div>
          )}
          {brews > 0 && state !== "soft" && (a.owned > 0 || a.free < 0) && (
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

