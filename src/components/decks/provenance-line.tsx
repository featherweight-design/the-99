"use client";

// ProvenanceLedger — where every card the app placed came from, one line per
// pass, oldest first. Replaces the single provenance sentence: the strip used
// to state one deck-wide total, and #359 needs each pass named and reversible
// on its own. Not dismissible; leaves when the last auto card does.
//
// FillFailedBanner — shown when deck.filled === false and the deck has no
// cards at all. Offers a retry via the fillDeck server action.

import { useState, useTransition } from "react";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { topOffCopy } from "../../lib/copy/top-off";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { fillDeck, undoFillPass } from "../../app/decks/actions";
import { GhostButton } from "../ui/button";
import { ProvenanceDisc } from "../ui/provenance-disc";
import { MutationError } from "./mutation-error";
import { fillPassLabel } from "./pass-mark";

const copy = recommendationsCopy.fill;
const ledger = topOffCopy.ledger;

/** The container's own background. `--surface-sunken` rather than the design
 *  table's raw hex, which is one channel off it in the default theme and has no
 *  answer at all in the other five. */
const SHELL_STYLE = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--border)",
  borderLeft: "3px solid var(--accent)",
} as const;

interface ProvenanceLedgerProps {
  deckId: string;
  /** The optimistic card list. Two jobs: the auto rows are what the ledger is
      present for at all, and their ownership is what each line's buy figure
      counts. */
  cards: DeckDetailCard[];
  /** The deck's live auto copies — the header's figure. Not a sum of the lines:
      a deck predating the ledger has auto rows and no passes to sum. */
  total: number;
  /** Oldest first, passes with no live cards already dropped. */
  passes: FillPassSummary[];
  /** The deck's body size — 99, or 98 for a pair. An undo announces the size
      the deck settled back to, which is stated against this. */
  bodySize: number;
  markedPassId: string | null;
  onMarkChange: (passId: string | null) => void;
  onAnnounce: (message: string) => void;
}

export function ProvenanceLedger({
  deckId,
  cards,
  total,
  passes,
  bodySize,
  markedPassId,
  onMarkChange,
  onAnnounce,
}: ProvenanceLedgerProps) {
  // A refused undo is reported beneath the ledger rather than inside the line:
  // the line keeps its control enabled so the player can try again, and a
  // message wedged into a 34px row would shunt every line below it.
  const [undoError, setUndoError] = useState<string | null>(null);

  // The sweep's own test, unchanged, and it is read FIRST. Reading the empty
  // pass list first would take a swept deck down the legacy branch and print a
  // sentence about a record we keep on a deck with nothing to record.
  if (!cards.some((c) => c.auto)) return null;

  const owned = new Map(cards.map((c) => [c.oracleId, c.owned]));
  /** Copies this pass still holds that the player does not own. Every `buy`
      figure in this ledger is a count of cards; none of them is money. */
  const buyCount = (pass: FillPassSummary) =>
    pass.liveCards.reduce((n, c) => (owned.get(c.oracleId) === false ? n + c.quantity : n), 0);

  const totalBuy = passes.reduce((n, p) => n + buyCount(p), 0);

  return (
    <div className="mx-[16px] mt-[10px] mb-[12px] md:mx-[30px] md:mt-[12px] rounded-[9px] px-[12px] py-[10px] md:px-[15px] md:py-[12px]"
      style={SHELL_STYLE}
    >
      <div className="flex items-center gap-[9px] md:gap-[11px] mb-[9px] md:mb-[11px]">
        {/* ⓘ outlined disc, as the shipped strip drew it. */}
        <ProvenanceDisc />
        <h3
          className="m-0 font-sans font-normal text-[12px] md:text-[12.5px] leading-[1.4]"
          style={{ color: "var(--fg-body)" }}
        >
          {ledger.header(String(total))}
        </h3>
        {/* Desktop only. On the phone each line's own sentence already states
            its buy figure, and a deck-wide restatement over the header would
            be the third place the same number appears in one card. */}
        {passes.length > 0 && (
          <span
            className="hidden md:block ml-auto font-mono text-[10.5px] whitespace-nowrap"
            style={{ color: "var(--fg-locked)" }}
          >
            {passes.length === 1
              ? ledger.headerMetaOne(String(totalBuy))
              : ledger.headerMeta(String(passes.length), String(totalBuy))}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        {passes.length === 0 ? (
          <LegacyLine />
        ) : (
          passes.map((pass, i) => (
            <LedgerLine
              key={pass.id}
              deckId={deckId}
              pass={pass}
              buy={buyCount(pass)}
              bodySize={bodySize}
              // The last line is the newest, because the list is oldest first.
              newest={i === passes.length - 1}
              marked={markedPassId === pass.id}
              onMarkChange={onMarkChange}
              onAnnounce={onAnnounce}
              onUndoError={setUndoError}
            />
          ))
        )}
      </div>

      {undoError && <MutationError message={undoError} />}
    </div>
  );
}

/** A deck built before the ledger existed. It enumerates nothing, so it carries
 *  no label column, no mark and no undo — and it goes for good once a pass
 *  lands. Two clauses, two weights: what happened, then what happens next. */
function LegacyLine() {
  const [happened, next] = splitOnce(ledger.legacy, ". ");
  return (
    <div
      className="flex items-center gap-[10px] min-h-[34px] rounded-[7px] px-[10px]"
      style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)" }}
    >
      {/* The sentence wraps at 390px and the box grows with it. No vertical
          padding at either width: 34px of minimum height already clears one
          line, and a wrapped second line is meant to touch that minimum. */}
      <p className="m-0 flex-auto min-w-0 text-[12.5px] leading-[1.5]">
        <span style={{ color: "var(--fg-faint)" }}>{happened}. </span>
        <span style={{ color: "var(--fg-locked)" }}>{next}</span>
      </p>
    </div>
  );
}

interface LedgerLineProps {
  deckId: string;
  pass: FillPassSummary;
  buy: number;
  bodySize: number;
  newest: boolean;
  marked: boolean;
  onMarkChange: (passId: string | null) => void;
  onAnnounce: (message: string) => void;
  onUndoError: (message: string | null) => void;
}

/** One pass. Its own component rather than a loop body because the undo's
 *  transition is per line: rule (g) requires an undo in flight to leave its
 *  neighbours enabled, and a single pending flag in the ledger would disable
 *  all of them. */
function LedgerLine({
  deckId,
  pass,
  buy,
  bodySize,
  newest,
  marked,
  onMarkChange,
  onAnnounce,
  onUndoError,
}: LedgerLineProps) {
  const [pending, startTransition] = useTransition();
  const label = fillPassLabel(pass);
  const isSeed = pass.kind === "seed";
  const n = String(pass.live);
  const sentence = lineSentence(pass, buy);
  // The newest line's control carries the accent whether or not it is pressed,
  // as the line above it does; pressing any other line's borrows it back.
  const lit = newest || marked;

  const handleUndo = () => {
    onUndoError(null);
    startTransition(async () => {
      try {
        // Both figures come back from the write's own transaction. Rule (g)
        // keeps every other control live during an undo, so subtracting from
        // the size this click started from could state one that was never true.
        const { removed, built: settled } = await undoFillPass(deckId, pass.id);
        // The mark points at cards that are no longer there. Cleared here as
        // well as by the render-time reconcile, because a pass whose undo
        // removed only some of its cards survives in the fresh summaries.
        if (marked) onMarkChange(null);
        onAnnounce(topOffCopy.announce.undone(String(removed), String(settled), bodySize));
      } catch {
        onUndoError(ledger.undoFailed);
      }
    });
  };

  return (
    <div
      className="flex flex-col md:flex-row md:items-center md:gap-[11px] md:min-h-[34px] rounded-[7px] px-[10px] py-[9px] md:px-[11px] md:py-0"
      style={{
        background: newest ? "var(--elevated-hover)" : "var(--surface)",
        border: `1px solid ${newest ? "var(--accent-shadow)" : "var(--border)"}`,
      }}
    >
      {/* `md:contents` rather than a second mount: desktop flattens these
          wrappers so the label, the sentence and the two controls are all
          direct flex children of the line, while the phone keeps them stacked
          in three rows. One DOM, one set of controls, one tab order. */}
      <div className="flex items-baseline gap-[8px] md:contents">
        <span
          className="flex-none md:w-[66px] font-mono text-[9.5px] tracking-[0.1em] uppercase whitespace-nowrap"
          style={{ color: newest ? "var(--accent)" : "var(--fg-faint)" }}
        >
          {label}
        </span>
        {/* The seed names its reversal instead of growing a button for it. On
            the phone that goes here, opposite the label; on desktop it takes
            the undo column below. */}
        {isSeed && (
          <span
            className="md:hidden ml-auto font-mono text-[10px] whitespace-nowrap"
            style={{ color: "var(--fg-locked)" }}
          >
            {ledger.seedReversal}
          </span>
        )}
      </div>

      <p
        className="m-0 mt-[5px] md:mt-0 md:flex-auto md:min-w-0 text-[12px] md:text-[12.5px] leading-[1.5]"
        style={{ color: "var(--fg-body)" }}
      >
        {sentence}
      </p>

      {/* The seed's row holds one control rather than two, and the design sets
          it a point tighter under the sentence than a full pair. */}
      <div
        className={`flex items-center gap-[10px] md:contents ${
          isSeed ? "mt-[7px]" : "mt-[8px]"
        }`}
      >
        <button
          type="button"
          aria-pressed={marked}
          aria-label={marked ? ledger.unmarkAria(label) : ledger.markAria(n, label)}
          onClick={() => onMarkChange(marked ? null : pass.id)}
          className={`flex-none flex items-center bg-transparent border-0 p-0 cursor-pointer
            font-mono text-[10.5px] whitespace-nowrap min-h-[44px] md:min-h-0
            hover:text-[color:var(--accent)] transition-colors ${
              lit ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"
            }`}
        >
          {/* The dashed rule is on the text, not the button: at the phone's 44px
              hit box a border on the button itself would float 16px below the
              words it belongs to. */}
          <span
            style={{
              borderBottom: `1px dashed ${lit ? "var(--accent-shadow)" : "var(--border-strong)"}`,
            }}
          >
            {pass.live === 1 ? ledger.markOne : ledger.mark(n)}
          </span>
        </button>

        <div className="ml-auto md:ml-0 md:w-[126px] md:flex-none md:flex md:justify-end">
          {isSeed ? (
            <span
              className="hidden md:block font-mono text-[10px] text-right"
              style={{ color: "var(--fg-locked)" }}
            >
              {ledger.seedReversal}
            </span>
          ) : (
            <GhostButton
              onClick={handleUndo}
              disabled={pending}
              aria-label={ledger.undoAria(n, label)}
              className="inline-flex items-center justify-center
                rounded-[8px] md:rounded-[7px] font-mono text-[11.5px] md:text-[11px]
                px-[13px] py-0 md:px-[10px] md:py-[5px] min-h-[44px] md:min-h-0 whitespace-nowrap"
            >
              {pending
                ? ledger.undoInFlight(n)
                : pass.live === 1
                  ? ledger.undoOne
                  : ledger.undo(n)}
            </GhostButton>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The line's sentence, with its leading count weighted and any recount clause
 * dropped to `--fg-locked`.
 *
 * A recount REPLACES the base sentence rather than joining it: "68 cards · 5
 * now yours" is what the pass holds now, and appending it to "68 cards: the
 * roles and the mana base, 7 to buy." would state the same 68 twice and then
 * quote a buy figure for cards that have since left.
 *
 * A recount also leads with what the pass PLACED, not with what survives. The
 * pass put 68 cards down; five of them being yours now does not retract that,
 * and a line that dropped to 63 would read as though the app had changed its
 * mind about the fill. The undo beside it still counts survivors, because that
 * is the number it would remove.
 */
function lineSentence(pass: FillPassSummary, buy: number) {
  const live = String(pass.live);
  const placed = String(pass.live + pass.kept + pass.removed);
  const recount = recountText(pass, placed);
  const text = recount ?? baseText(pass, live, buy);
  const [head, clause] = splitOnce(text, " · ");
  return (
    <>
      <Weighted text={head} count={recount ? placed : live} />
      {clause != null && (
        <span style={{ color: "var(--fg-locked)" }}>{" · "}{clause}</span>
      )}
    </>
  );
}

function recountText(pass: FillPassSummary, placed: string): string | null {
  if (pass.kept > 0 && pass.removed > 0)
    return ledger.passRecountedBoth(placed, String(pass.kept), String(pass.removed));
  if (pass.kept > 0) return ledger.passRecountedKept(placed, String(pass.kept));
  if (pass.removed > 0) return ledger.passRecounted(placed, String(pass.removed));
  return null;
}

function baseText(pass: FillPassSummary, n: string, buy: number): string {
  if (pass.kind === "seed") {
    return buy > 0 ? ledger.seedLine(n, String(buy)) : ledger.seedLineNoBuy(n);
  }
  const slots = String(pass.openSlots);
  return buy > 0 ? ledger.passLine(n, slots, String(buy)) : ledger.passLineNoBuy(n, slots);
}

/** Bolds the line's own card count where it falls in the sentence. Located
 *  rather than assumed at the front: `all 27 now yours` leads with a word. */
function Weighted({ text, count }: { text: string; count: string }) {
  const at = text.indexOf(count);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold" style={{ color: "var(--fg)" }}>
        {count}
      </span>
      {text.slice(at + count.length)}
    </>
  );
}

/** Splits on the first occurrence only; the tail keeps any further separators. */
function splitOnce(text: string, sep: string): [string, string | null] {
  const at = text.indexOf(sep);
  return at === -1 ? [text, null] : [text.slice(0, at), text.slice(at + sep.length)];
}

// ── FillFailedBanner ─────────────────────────────────────────────────────────

interface FillFailedBannerProps {
  /** deck.filled — true if the fill ran, even if the deck was later swept. */
  filled: boolean;
  /** Whether the deck holds any card at all. Emptiness is the whole question
      here, so the banner takes the answer rather than a total it would have to
      interpret — a row count and a copy count disagree on stacked basics but
      agree on empty. */
  hasCards: boolean;
  onRetry: () => void;
  pending: boolean;
}

export function FillFailedBanner({
  filled,
  hasCards,
  onRetry,
  pending,
}: FillFailedBannerProps) {
  // Only shown when the fill failed (filled=false) and the deck is still empty.
  // A swept deck is filled=true, so it will never match here — that's the point.
  if (filled || hasCards) return null;

  return (
    <div
      className="flex items-start gap-[11px] mx-[16px] mt-[10px] mb-[10px] md:mx-[30px] md:mt-[12px] rounded-[8px] md:rounded-[9px] px-[12px] py-[9px] md:px-[15px] md:py-[11px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--warning)",
      }}
    >
      {/* ⚠ bare glyph — no disc, no background. 13px in --warning. */}
      <span
        aria-hidden
        className="flex-none leading-none text-[13px]"
        style={{ color: "var(--warning)" }}
      >
        ⚠
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="m-0 font-semibold text-[12.5px] leading-[1.4]"
          style={{ color: "var(--fg-body)" }}
        >
          {copy.failedHeading}
        </p>
        <p
          className="m-0 text-[12.5px] leading-[1.55] mt-[4px]"
          style={{ color: "var(--fg-body)" }}
        >
          {copy.failedBody}
        </p>
        {/* Retry link — matches decklist-row.tsx Undo treatment: sans 12.5px
            semibold, accent coloured, border-bottom underline in accent-shadow. */}
        <button
          type="button"
          onClick={onRetry}
          disabled={pending}
          aria-label={copy.failedRetryAria}
          className="flex-none flex items-center mt-[10px] bg-transparent border-0 border-b border-b-accent-shadow border-accent-shadow p-0
            text-[12.5px] font-semibold leading-[1.4]
            text-accent cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          {copy.failedRetry}
        </button>
      </div>
    </div>
  );
}

// ── FillFailedBannerConnected ─────────────────────────────────────────────────
// Wires the fillDeck server action to FillFailedBanner. Used by BuilderShell.

interface FillFailedBannerConnectedProps {
  deckId: string;
  filled: boolean;
  hasCards: boolean;
}

export function FillFailedBannerConnected({
  deckId,
  filled,
  hasCards,
}: FillFailedBannerConnectedProps) {
  const [pending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await fillDeck(deckId);
      } catch {
        // The banner already says the fill failed, so a rejected retry changes
        // nothing the player can see — except that an escaped rejection would
        // reach an error boundary and remove the retry affordance entirely.
      }
    });
  };

  return (
    <FillFailedBanner
      filled={filled}
      hasCards={hasCards}
      onRetry={handleRetry}
      pending={pending}
    />
  );
}
