"use client";

// ProvenanceLedger — where every card the app placed came from, one line per
// pass, oldest first. Replaces the single provenance sentence: the strip used
// to state one deck-wide total, and #359 needs each pass named and reversible
// on its own. Not dismissible; leaves when the last auto card does.
//
// It opens inside the to-do card, under the foot's `Where these N cards came
// from ▾` (deck messages A7, `Next Steps.dc.html`'s last panel): the ⓘ header
// line and its desktop meta stay as the board draws them; the card shell and
// its accent rule went, because the to-do card is the shell now.

import { useSyncExternalStore } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { undoFillPass } from "../../app/decks/actions";
import { GhostButton } from "../ui/button";
import { ProvenanceDisc } from "../ui/provenance-disc";
import { MutationError } from "./mutation-error";

const ledger = topOffCopy.ledger;

/** The pass's name in the ledger and in an undo's accessible name. Lives here rather than in
 *  `fill-passes.ts` because that module reaches for the database, and every consumer of this label is
 *  a client component. */
export function fillPassLabel(pass: Pick<FillPassSummary, "kind" | "ordinal">): string {
  return pass.kind === "seed"
    ? ledger.seedLabel
    : ledger.passLabel(String(pass.ordinal));
}

/** Copies this pass still holds that the player does not own. Every `buy` figure in this ledger is a
 *  count of cards; none of them is money. */
export function passBuyCount(pass: FillPassSummary, cards: readonly DeckDetailCard[]): number {
  const owned = new Map(cards.map((c) => [c.oracleId, c.owned]));
  return pass.liveCards.reduce((n, c) => (owned.get(c.oracleId) === false ? n + c.quantity : n), 0);
}

// One pass's undo state, held outside any component so the ledger line and the pass sheet read the
// same figure, and so it survives the sheet being dismissed while the request runs. Keyed per deck
// and pass: rule (g) wants an undo in flight to leave its neighbours enabled.
type UndoState = { pending: boolean; error: string | null };
const IDLE: UndoState = { pending: false, error: null };
const undoStates = new Map<string, UndoState>();
const undoListeners = new Set<() => void>();
const setUndoState = (key: string, next: UndoState) => {
  if (next.pending || next.error) undoStates.set(key, next);
  else undoStates.delete(key);
  undoListeners.forEach((l) => l());
};
const subscribeUndo = (l: () => void) => {
  undoListeners.add(l);
  return () => void undoListeners.delete(l);
};

/** The first refusal any of these passes' undos holds, whichever control ran it, so the ledger reports
 *  a failure from the sheet and drops it when a retry from either control starts. */
function usePassUndoError(deckId: string, passes: readonly FillPassSummary[]): string | null {
  return useSyncExternalStore(
    subscribeUndo,
    () => passes.map((p) => undoStates.get(`${deckId}:${p.id}`)?.error).find((e) => e) ?? null,
    () => null,
  );
}

/**
 * A pass's undo, shared by its ledger line and the pass sheet's foot, so both run one write, say one
 * thing and disable together. The state is per pass (see above), not per ledger, so one undo in flight
 * leaves its neighbours enabled.
 */
export function usePassUndo({
  deckId,
  pass,
  bodySize,
  onAnnounce,
  onDone,
}: {
  deckId: string;
  pass: FillPassSummary;
  bodySize: number;
  onAnnounce: (message: string) => void;
  onDone?: () => void;
}) {
  const key = `${deckId}:${pass.id}`;
  const state = useSyncExternalStore(subscribeUndo, () => undoStates.get(key) ?? IDLE, () => IDLE);
  const undo = async () => {
    if (undoStates.get(key)?.pending) return;
    setUndoState(key, { pending: true, error: null });
    try {
      // Both figures come back from the write's own transaction. Rule (g)
      // keeps every other control live during an undo, so subtracting from
      // the size this click started from could state one that was never true.
      const { removed, built: settled } = await undoFillPass(deckId, pass.id);
      setUndoState(key, IDLE);
      onDone?.();
      onAnnounce(topOffCopy.announce.undone(String(removed), String(settled), bodySize));
    } catch {
      setUndoState(key, { pending: false, error: ledger.undoFailed });
    }
  };
  return { pending: state.pending, error: state.error, undo };
}

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
  /** `Show these N`: opens the pass sheet on this pass (deck messages PR 3). */
  onShow: (passId: string) => void;
  onAnnounce: (message: string) => void;
}

export function ProvenanceLedger({
  deckId,
  cards,
  total,
  passes,
  bodySize,
  onShow,
  onAnnounce,
}: ProvenanceLedgerProps) {
  // A refused undo is reported beneath the ledger rather than inside the line:
  // the line keeps its control enabled so the player can try again, and a
  // message wedged into a 34px row would shunt every line below it.
  const undoError = usePassUndoError(deckId, passes);

  // The sweep's own test, unchanged, and it is read FIRST. Reading the empty
  // pass list first would take a swept deck down the legacy branch and print a
  // sentence about a record we keep on a deck with nothing to record.
  if (!cards.some((c) => c.auto)) return null;

  const buyCount = (pass: FillPassSummary) => passBuyCount(pass, cards);

  const totalBuy = passes.reduce((n, p) => n + buyCount(p), 0);

  return (
    // `.fo .sld`: 12px under the foot's rule, the panel's 4px top padding (`.fo`) and this 8px; the
    // header and each line 6px apart.
    <div className="mt-[8px]">
      <div className="flex items-center gap-[9px] mb-[6px]">
        {/* ⓘ outlined disc, as the shipped strip drew it. */}
        <ProvenanceDisc />
        <h3
          className="m-0 font-sans font-normal text-[12px] leading-[1.4]"
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
              onShow={onShow}
              onAnnounce={onAnnounce}
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
  onShow: (passId: string) => void;
  onAnnounce: (message: string) => void;
}

/** One pass. Its own component rather than a loop body because the undo's
 *  transition is per line (`usePassUndo`). */
function LedgerLine({
  deckId,
  pass,
  buy,
  bodySize,
  newest,
  onShow,
  onAnnounce,
}: LedgerLineProps) {
  const { pending, undo: handleUndo } = usePassUndo({ deckId, pass, bodySize, onAnnounce });
  const label = fillPassLabel(pass);
  const isSeed = pass.kind === "seed";
  const n = String(pass.live);
  // Nothing still here: a quiet, dashed line with no Show and no Undo (#477).
  const gone = passEnded(pass) !== null;
  const sentence = lineSentence(pass, buy, gone);
  // The newest line's control carries the accent, as the line above it does.
  const lit = newest && !gone;

  return (
    <div
      className="flex flex-col md:flex-row md:items-center md:gap-[11px] md:min-h-[34px] rounded-[7px] px-[10px] py-[9px] md:px-[11px] md:py-0"
      style={{
        background: gone ? "transparent" : newest ? "var(--elevated-hover)" : "var(--surface)",
        border: gone
          ? "1px dashed var(--border-strong)"
          : `1px solid ${newest ? "var(--accent-shadow)" : "var(--border)"}`,
      }}
    >
      {/* `md:contents` rather than a second mount: desktop flattens these
          wrappers so the label, the sentence and the two controls are all
          direct flex children of the line, while the phone keeps them stacked
          in three rows. One DOM, one set of controls, one tab order. */}
      <div className="flex items-baseline gap-[8px] md:contents">
        <span
          className="flex-none md:w-[66px] font-mono text-[9.5px] tracking-[0.1em] uppercase whitespace-nowrap"
          style={{ color: gone ? "var(--fg-locked)" : newest ? "var(--accent-text)" : "var(--fg-faint)" }}
        >
          {label}
        </span>
        {/* The seed names its reversal instead of growing a button for it. On
            the phone that goes here, opposite the label; on desktop it takes
            the undo column below. */}
        {isSeed && !gone && (
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
        style={{ color: gone ? "var(--fg-faint)" : "var(--fg-body)" }}
      >
        {sentence}
      </p>

      {/* The seed's row holds one control rather than two, and the design sets
          it a point tighter under the sentence than a full pair. A line with
          nothing still here holds none. */}
      {!gone && <div
        className={`flex items-center gap-[10px] md:contents ${
          isSeed ? "mt-[7px]" : "mt-[8px]"
        }`}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={ledger.markAria(n, label)}
          onClick={() => onShow(pass.id)}
          className={`flex-none flex items-center bg-transparent border-0 p-0 cursor-pointer
            font-mono text-[10.5px] whitespace-nowrap min-h-[44px] md:min-h-0
            hover:text-[color:var(--accent-text)] transition-colors ${
              lit ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"
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
      </div>}
    </div>
  );
}

/** How a pass with nothing still here ended. Nothing kept means it was undone (or every card was
 *  removed by hand, which the record cannot tell apart); anything kept means the player took the
 *  cards. Null while any card is still here. Pure over the counts, so the pass sheet's optimistic
 *  summary reads it the same way. Lives here rather than in `fill-passes.ts` for the same reason as
 *  `fillPassLabel`: that module reaches for the database. */
export function passEnded(p: Pick<FillPassSummary, "live" | "kept">): "undone" | "kept" | null {
  if (p.live > 0) return null;
  return p.kept > 0 ? "kept" : "undone";
}

/**
 * The line's sentence (#477). Every line leads with two figures in `--fg` 600: what the pass placed
 * and what of it is still here. The still-here figures of all lines sum to the header.
 *
 * What follows is `--fg-locked` after a `·` (kept and removed, or `undone`), or a plain clause after
 * a colon (the seed's and a top-off's description). A recount REPLACES the description rather than
 * joining it: quoting a buy figure for cards that have since left would state a cost that is gone.
 * The undo and Show beside the line count survivors, because that is what they act on.
 */
export function lineSentence(pass: FillPassSummary, buy: number, gone = false) {
  const placed = String(pass.live + pass.kept + pass.removed);
  const here = pass.live === 0 ? null : String(pass.live);
  const lead = here === null ? ledger.leadNone(placed) : ledger.lead(placed, here);
  const quiet = quietText(pass);
  return (
    <>
      <span className="font-semibold" style={{ color: gone ? "var(--fg-muted)" : "var(--fg)" }}>{lead}</span>
      {quiet != null ? (
        <span style={{ color: "var(--fg-locked)" }}>{" · "}{quiet}</span>
      ) : (
        <>{": "}{baseText(pass, buy)}</>
      )}
    </>
  );
}

/** The quiet clause after the `·`, or null for an untouched line (which takes the description). */
function quietText(pass: FillPassSummary): string | null {
  if (pass.kept > 0 && pass.removed > 0)
    return ledger.passRecountedBoth(String(pass.kept), String(pass.removed));
  const ended = passEnded(pass);
  if (ended === "kept") return ledger.passAllKept(String(pass.kept));
  if (ended === "undone") return ledger.passUndone;
  if (pass.kept > 0) return ledger.passRecountedKept(String(pass.kept));
  if (pass.removed > 0) return ledger.passRecounted(String(pass.removed));
  return null;
}

function baseText(pass: FillPassSummary, buy: number): string {
  if (pass.kind === "seed") {
    return buy > 0 ? ledger.seedLine(String(buy)) : ledger.seedLineNoBuy;
  }
  const slots = String(pass.openSlots);
  return buy > 0 ? ledger.passLine(slots, String(buy)) : ledger.passLineNoBuy(slots);
}

/** Splits on the first occurrence only; the tail keeps any further separators. */
function splitOnce(text: string, sep: string): [string, string | null] {
  const at = text.indexOf(sep);
  return at === -1 ? [text, null] : [text.slice(0, at), text.slice(at + sep.length)];
}
