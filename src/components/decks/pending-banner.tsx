"use client";

// Surface 1 — pending changes on the deck page. Not dismissible: a draft is a
// state the deck is in, which is why this is a sibling of UpdateStrip rather
// than a mode of it.

import { hasFrontFaceCost } from "../../lib/cards/faces";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy, INLINE_CHANGE_MAX } from "../../lib/copy/deck-versioning";
import { priceCopy } from "../../lib/copy/price";
import type { DraftChange } from "../../lib/decks/draft-diff";
import {
  changeCount, hasChanges, printsPair, type DraftAdd, type DraftState,
} from "../../lib/decks/draft-shape";
import { formatDeckDate } from "../../lib/decks/format";
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips } from "../ui/cost-pips";
import { DiscardConfirm, DiscardTrigger, useDiscardConfirm } from "./discard-draft";
import { COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH } from "./draft-announcer";
import { CommanderNameLine, CommanderSentence, commanderZoneHint } from "./change-commander-banner";
import { mirrorUrl } from "../../lib/url/mirror";

const copy = deckVersioningCopy.pending;

interface PendingBannerProps {
  state: DraftState;
  deckId: string;
  /**
   * Cards in the version a discard would land on, straight through to
   * `DiscardConfirm` — see the reason it is a prop there. No figure, no `Discard`:
   * the confirm's job is naming what you land on, and it cannot ask without it.
   */
  versionCards?: number;
  /** Passed through: what the caller does once the draft has been rewritten out
   *  from under whatever it is drawing. */
  onDiscarded?: () => void;
}

// §Surfaces 5: "one commit surface, two entry points" — the sheet lives at the
// foot of the review page and the banner's CTA *navigates* to it with the sheet
// already open. So there is no `onCommit`: a second mount would be a second
// place the buy list is printed, which is the thing that ruling forbids.
const commitHref = (deckId: string) => `/decks/${deckId}/changes?commit=1`;
const reviewHref = (deckId: string) => `/decks/${deckId}/changes`;

/**
 * What the inline list calls one change.
 *
 * A card arriving or leaving as a single copy is its name. Any other move is
 * `Name 1 → 2` — the shipped `recountedItem`, because "+ Sol Ring" on a deck
 * that already ran one is a sentence that reads as a duplicate rather than a
 * second copy. Nothing new is authored for a fact the import diff already has a
 * string for, and which moves print a pair is `printsPair`, shared with the
 * review page and the version rail.
 */
function changeLabel(state: DraftState, change: DraftChange): string {
  const name = state.names.get(change.oracleId) ?? change.oracleId;
  const moved = printsPair(change);
  return moved
    ? deckImportCopy.update.diff.recountedItem(name, String(change.from), String(change.to))
    : name;
}

// The slot the money figure occupies while the sentence is split around it. The
// figure is a mono --warning run inside a sans sentence, and the sentence is
// authored whole in the copy module — so it is interpolated with a marker and
// cut at it, rather than re-assembled here from its words.
const MONEY_SLOT = "\u0000";

/**
 * The one money sentence, or nothing.
 *
 * Three states, and only two of them speak. `moneyNone` is a claim that every
 * card coming in has a free copy, so it takes a read that actually happened and
 * a genuine zero. When rows are unfree but nothing could be priced, there is a
 * purchase and no figure for it — the honest banner says neither, and the review
 * page one click away names the rows.
 *
 * A total over partial coverage carries the shipped `pricedClause`, because a
 * figure standing alone reads as the whole purchase — the same rule the price
 * strip follows, and the same words.
 */
function moneyLine(state: DraftState): ReactNode | null {
  if (!state.claimsKnown) return null;
  // Both sentences are about the cards coming in, so a draft with none — a
  // removals-only cut, or a basics-only edit — says neither. "Every card coming
  // in has enough spare copies" over an empty add list is vacuously true and
  // reads as an account of a purchase that was never on the table.
  if (state.addChanges.length === 0) return null;
  const proxiedCount = state.adds.filter((a) => a.bucket === "proxied").length;
  if (state.unfreeCount === 0) {
    // `moneyNone` says every card has a spare copy in the collection. A printed
    // card has no copy anywhere, so over a proxy-only add list that sentence is
    // exactly the assertion about where cardboard is that this vocabulary
    // forbids. Same conclusion — the commit asks for nothing — different reason.
    if (proxiedCount === 0) return copy.moneyNone;
    if (proxiedCount === state.addChanges.length) return copy.moneyProxiedOnly(proxiedCount);
    // The MIXED list gets its own sentence — see the copy module.
    return copy.moneyProxiedMixed(proxiedCount, state.addChanges.length);
  }
  if (state.total === null) return null;
  const partial = state.pricedCopies < state.buyCount;
  const total = partial
    ? `${state.total} · ${priceCopy.strip.pricedClause(state.pricedCopies, state.buyCount)}`
    : state.total;
  const [head, tail] = copy
    .money(state.unfreeCount, state.addChanges.length, state.buyCount, MONEY_SLOT)
    .split(MONEY_SLOT);
  return (
    <>
      {head}
      <span className={MONEY_FIGURE}>{total}</span>
      {tail}
    </>
  );
}

/**
 * Label, counts and "since", stacked on the phone and one wrapping row on
 * desktop.
 *
 * The two densities draw the same three items a few px apart, so the values
 * that differ are a lookup rather than a second header.
 */
function Header({
  state,
  density,
  since,
}: {
  state: DraftState;
  density: keyof typeof HEADER;
  since: string | null;
}) {
  const adds = state.addChanges.length;
  const removes = state.removes.length;
  return (
    <div className={`flex flex-col md:flex-row md:flex-wrap md:items-center ${HEADER[density].row}`}>
      <span className={LABEL}>{copy.label}</span>
      {/* One wrapper for the figures: it is the phone's counts row, and on
          desktop it puts "since" the header's own gap away from the counts
          rather than the counts group's tighter one. */}
      <div className="flex flex-wrap items-center gap-[9px] md:gap-[14px]">
        <span className={`flex items-center font-mono ${HEADER[density].counts}`}>
          {/* Per-figure colour, so each side is read as its own direction. The
              shipped `counts` helper is called once per side rather than
              re-implemented: it owns the sign, the U+2212 minus and the rule
              that a zero side is not drawn at all. */}
          {adds > 0 && (
            <span className="text-[color:var(--success)]">{copy.counts(adds, 0)}</span>
          )}
          {adds > 0 && removes > 0 && (
            <span className="text-[color:var(--border-strong)]">/</span>
          )}
          {removes > 0 && (
            <span className="text-[color:var(--warning)]">{copy.counts(0, removes)}</span>
          )}
        </span>
        {since && (
          <span className="font-mono text-[10px] md:text-[10.5px] text-[color:var(--fg-locked)]">
            {since}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * One named change, adds and removes on the same anatomy.
 *
 * `add` is the availability read for this row — absent on a remove, which is
 * why the price tile and the pull hint are its two conditional slots and not
 * the line's.
 */
function NameLine({
  state,
  change,
  add,
}: {
  state: DraftState;
  change: DraftChange;
  add?: DraftAdd;
}) {
  const cost = state.costs.get(change.oracleId);
  const price = add ? state.prices.get(change.oracleId) : undefined;
  // `pullFrom`, never `heldBy`: the hint offers a pull, and `heldBy` includes the
  // holders the server refuses one from.
  const holder = add ? state.pullFrom.get(change.oracleId) : undefined;
  // A trade's two card lines say which way they moved through the command zone (handoff §4).
  const zone = commanderZoneHint(state, change.oracleId, add !== undefined);
  return (
    <li className="flex items-center gap-[9px] min-h-[34px]">
      <span
        className={`flex-none w-[13px] font-mono text-[12px] ${
          add ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"
        }`}
      >
        {add ? "+" : "−"}
      </span>
      <span className="flex-1 min-w-0 text-[13px] text-[color:var(--fg)]">
        {changeLabel(state, change)}
      </span>
      {zone ? (
        <span className="flex-none font-mono text-[10px] text-[color:var(--fg-locked)]">{zone}</span>
      ) : add ? (
        holder && (
          // Shrinks and truncates rather than `flex-none`: a deck name is valid up
          // to 120 characters, and on the phone an unshrinkable one pushes the
          // price and cost slots off the card. The full text stays in the DOM, so
          // a screen reader still hears which deck.
          <span className="min-w-0 shrink truncate font-mono text-[10px] text-[color:var(--fg-faint)]">
            {copy.addPullHint(holder)}
          </span>
        )
      ) : (
        <span className="flex-none font-mono text-[10px] text-[color:var(--fg-locked)]">
          {copy.removeHint}
        </span>
      )}
      {price && <span className={PRICE_TILE}>{price}</span>}
      {/* The slot is drawn whether or not there is a cost to put in it: it is
          what holds every line's pips on one vertical line. A card the catalog
          gives no cost draws nothing inside it, never a zero. */}
      {/* The shared track, not a slot of its own: a five-pip run is `COST_TRACK` wide, and a
          56px slot held it only while the pips overlapped — it would have overflowed into the
          name beside it the moment they stopped. */}
      <span
        className="flex-none flex items-center justify-end gap-[3px]"
        style={{ width: COST_TRACK }}
      >
        {/* The shared track, so a card's cost lands on the same vertical line here
            and in the decklist below. `CostPips` defaults neither, so both pass. */}
        {hasFrontFaceCost(cost) ? (
          <CostPips cost={cost ?? null} size={COST_PIP_SIZE} track={COST_TRACK} cap={COST_PIP_CAP} spoken />
        ) : null}
      </span>
    </li>
  );
}

/** The committed version line, and where a commit lands. Focusable but not a tab
 *  stop — `tabIndex={-1}` — because it is a statement, not a control: it exists
 *  to be reachable programmatically once, the paint after the commit sheet or a
 *  discard navigated here. See `COMMIT_RECEIPT_HASH` for why that matters. */
function VersionLine({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== COMMIT_RECEIPT_HASH && hash !== DISCARD_RECEIPT_HASH) return;
    ref.current?.focus();
    // `replaceState`, so the receipt does not become an entry the reader can go
    // back to and re-fire.
    mirrorUrl(`${window.location.pathname}${window.location.search}`);
  }, []);
  return (
    <span
      ref={ref}
      tabIndex={-1}
      className="font-mono text-[11px] text-[color:var(--fg-faint)]"
    >
      {text}
    </span>
  );
}

export function PendingBanner({ state, deckId, versionCards, onDiscarded }: PendingBannerProps) {
  // Above the early returns, because a hook cannot sit under one. The flag it
  // holds belongs here rather than inside the confirm: the question replaces this
  // banner's whole body, so this is the component that has to know it was asked.
  const discard = useDiscardConfirm(state);
  const n = changeCount(state);
  const next = (state.version?.number ?? 0) + 1;

  // A brew has no version for a draft to be pending against, so this banner has
  // nothing to say about one. Its only offer — `Commit as v1` — is drawn in the
  // spine beside `Export` by `FirstCommitOffer`, which is where the design puts
  // it and where the body-size gate it needs already lives.
  if (state.version === null) return null;

  // Committed and clean: one line, and it is the whole permanent footprint.
  // `hasChanges` and not `n === 0`, because a draft that moved only basics has
  // no nameable change and is still a draft — taking the clean branch on it
  // would leave a real edit with no route to a commit.
  if (!hasChanges(state)) {
    return (
      <div className={STRIP}>
        <VersionLine
          text={copy.versionLine(
            state.version.number,
            formatDeckDate(state.version.committedAt),
          )}
        />
      </div>
    );
  }

  const inline = n <= INLINE_CHANGE_MAX;
  const money = inline ? null : moneyLine(state);

  // The question stands where the banner's card stood — same plate, same width,
  // the brass rule swapped for the danger one — rather than in the row the control
  // was pressed in. Nothing of the draft's account is drawn beside it: the
  // consequence sentence is the account, and the figures it replaced are the ones
  // being thrown away.
  if (versionCards !== undefined && discard.confirming) {
    return (
      <div className={WRAP}>
        <DiscardConfirm
          deckId={deckId}
          state={state}
          versionCards={versionCards}
          onCancel={discard.cancel}
          onDiscarded={onDiscarded}
          // The card's own bottom space, so swapping one for the other does not
          // move the block under it. Desktop takes that space from the next
          // block's top padding, which is why only the phone carries a margin.
          className="mb-[14px] md:mb-0"
        />
      </div>
    );
  }

  // One element for both densities: the control is the same control, and the two
  // branches below differ only in which row of the bar it stands in. Withheld
  // where the version's size is unknown — see `versionCards`.
  const discardControl =
    versionCards === undefined ? null : (
      <DiscardTrigger onOpen={discard.open} triggerRef={discard.triggerRef} />
    );

  return (
    <div className={WRAP}>
      {/* A card with a brass left rule, not a full-bleed strip: what it holds is
          a state of this deck, and the rule is the same mark the rows this draft
          added carry down the list. */}
      <div className={CARD} style={CARD_BORDER}>
        {/* "since" is a 7+ line only. At six changes or fewer the names are
            right below it and count themselves. */}
        <Header
          state={state}
          density={inline ? "names" : "counts"}
          since={inline ? null : copy.since(n, state.version.number)}
        />

        {inline ? (
          <ul className="m-0 p-0 list-none flex flex-col gap-[5px] mb-[14px]">
            {/* Change commander: its own line, first (handoff §4). Absent unless the commander moved. */}
            <CommanderNameLine state={state} tileClass={PRICE_TILE} />
            {state.addChanges.map((c, i) => (
              <NameLine key={c.oracleId} state={state} change={c} add={state.adds[i]} />
            ))}
            {state.removes.map((c) => (
              <NameLine key={c.oracleId} state={state} change={c} />
            ))}
          </ul>
        ) : (
          /* Exactly one money sentence, and only when there is a figure to
             state. The free-copy sentence is a claim about the claim model,
             so it needs `claimsKnown` and a real zero — an unpriceable
             purchase and an unread one both draw no line at all rather than
             telling the player the commit asks for nothing. The pull clause
             is a second line only because it is a different offer, not a
             second total. */
          <>
          <CommanderSentence state={state} sentenceClass={MONEY_SENTENCE} />
          {money && (
            <p className={MONEY_SENTENCE}>
              {money}
              {state.pullableCount > 0 && ` ${copy.moneyPulls(state.pullableCount)}`}
            </p>
          )}
          </>
        )}

        {/* The hierarchy inverts with the density, and `Commit as v{n}` is
            offered at both: a long draft is the one most expensive to leave
            uncommitted, so taking its commit away would be backwards. */}
        <div className={CONTROLS}>
          {inline ? (
            <>
              <Link href={commitHref(deckId)} className={PRIMARY_CTA}>
                {copy.commitCta(next)}
              </Link>
              <div className={CONTROLS_SECOND_ROW}>
                {discardControl}
                <Link href={reviewHref(deckId)} className={REVIEW_LINK}>
                  {copy.reviewLink}
                </Link>
              </div>
            </>
          ) : (
            <>
              <Link href={reviewHref(deckId)} className={PRIMARY_CTA}>
                {copy.reviewCta(n)}
              </Link>
              <div className={CONTROLS_SECOND_ROW}>
                <Link href={commitHref(deckId)} className={SECONDARY_CTA}>
                  {copy.commitCta(next)}
                </Link>
                {discardControl}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The pending banner's own box. Desktop takes its bottom space from the next
// block's top padding, which is why only the phone card carries a margin.
const WRAP = "px-[14px] pt-[14px] md:px-[26px] md:pt-[18px]";
const CARD =
  "rounded-[10px] bg-[color:var(--surface-rail)] " +
  "px-[14px] py-[13px] md:px-[17px] md:py-[15px] mb-[14px] md:mb-0";
// Inline, because the left rule is a different width from the other three and
// Tailwind resolves `border` against `[border-left:…]` by stylesheet order.
const CARD_BORDER = {
  border: "1px solid var(--border-strong)",
  borderLeft: "3px solid var(--accent)",
};

const HEADER = {
  counts: { row: "mb-[8px] md:mb-[10px] md:gap-[14px]", counts: "text-[15px] md:text-[13px] gap-[9px] md:gap-[8px]" },
  names: { row: "mb-[8px] md:mb-[11px] md:gap-[12px]", counts: "text-[15px] md:text-[13px] gap-[9px] md:gap-[7px]" },
} as const;

const LABEL =
  "font-mono uppercase text-[9.5px] md:text-[10px] tracking-[0.14em] md:tracking-[0.16em] " +
  "text-[color:var(--accent)] mb-[9px] md:mb-0";

const MONEY_SENTENCE =
  "m-0 mb-[12px] md:mb-[14px] md:max-w-[700px] text-[12.5px] md:text-[13px] " +
  "leading-[1.5] md:leading-[1.55] text-[color:var(--fg-body)]";
const MONEY_FIGURE = "font-mono text-[12px] md:text-[12.5px] text-[color:var(--warning)]";

const PRICE_TILE =
  "flex-none font-mono text-[10px] text-[color:var(--warning)] rounded-[4px] px-[5px] py-[1px] " +
  "[border:1px_solid_var(--accent-shadow)]";

// Phone stacks the controls and gives the primary its own full-width row; the
// second row dissolves on desktop so all three sit in one line.
const CONTROLS = "flex flex-col md:flex-row md:flex-wrap md:items-center gap-[8px] md:gap-[10px]";
// `flex-wrap`, because the discard confirm replaces one control with a question
// far wider than it: without this the row it stands in would push whatever sits
// beside it off the card rather than under the question.
const CONTROLS_SECOND_ROW = "flex flex-wrap items-center gap-[8px] md:contents";

// Bone fill on the act, per src/components/ui/button.tsx's PRIMARY — never
// --accent, which means "in use / to buy" everywhere else in the app. Written
// out rather than taken from that primitive because these controls carry no
// hover or transition: the design draws motion nowhere in Surface 1.
const PRIMARY_CTA =
  "flex md:inline-flex w-full md:w-auto items-center justify-center min-h-[44px] md:min-h-0 " +
  "px-[18px] py-[10px] rounded-[8px] font-sans font-semibold text-[14px] md:text-[13.5px] " +
  "text-[color:var(--bg)] bg-[color:var(--fg)] border-0 cursor-pointer no-underline";
const SECONDARY_CTA =
  "flex md:inline-flex flex-1 md:flex-none items-center justify-center min-h-[44px] md:min-h-0 " +
  "px-[18px] py-[10px] rounded-[8px] font-sans font-medium text-[13.5px] " +
  "text-[color:var(--fg)] bg-transparent [border:1px_solid_var(--border-strong)] " +
  "cursor-pointer no-underline";
// Demoted to a link at six changes or fewer, and still a touch target there.
const REVIEW_LINK =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-0 font-mono text-[11px] " +
  "text-[color:var(--accent)] no-underline hover:text-[color:var(--accent-hover)] transition-colors";

// The clean state is not the pending banner — it is a single line — so it keeps
// the strip it shipped in.
const STRIP =
  "flex flex-wrap md:flex-nowrap items-center gap-[10px] md:gap-[12px] " +
  "px-[16px] py-[10px] md:px-[30px] md:py-[12px] bg-[color:var(--surface-rail)] " +
  "[border-bottom:1px_solid_var(--border)]";
