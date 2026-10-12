"use client";

// FIND A DECK READ'S RESULT ROW (handoff R2 §4, P3 to P3i): the deck, its commander and where its plan
// came from, the read's one sentence with the deck's own cards as marks, the cut on its own line, and
// the row's two actions. Swap in and Add only are select/unselect, never a tick: pressing one turns
// the other off on that row, and pressing it again undoes it.
import Link from "next/link";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { PlanSource } from "../../lib/swaps/fits-read";
import type { FitsSentencePart } from "../../lib/swaps/fits-read";
import { MutationError } from "../decks/mutation-error";
import { useCardDetailIfAny } from "./card-detail-provider";
import { PendingReporter } from "../shell/pending-reporter";

const copy = swapToolsCopy.fits.read;

/** What the reader did on this row, this visit. */
export type RowAct = { kind: "swapped"; swapId: string } | { kind: "added"; toBuy: boolean } | null;

const markClass =
  "inline bg-transparent border-0 p-0 cursor-pointer text-left font-[inherit] text-[length:inherit] leading-[inherit] text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]";

/** A card the read names, drawn as the app's own name and opening that card over the dialog. */
function Mark({ id, name, onOpenCard, className = markClass }: { id: string; name: string; onOpenCard: (oracleId: string) => void; className?: string }) {
  return (
    <button type="button" onClick={() => onOpenCard(id)} className={className}>
      {name}
    </button>
  );
}

export function ReadRow({
  deckId, deckName, commanders, planSource, parts, cut, names, cardName, freeNow, act, settled = false, changed = null, busy, refused, onSwap, onAdd, onOpenCard,
}: {
  deckId: string;
  deckName: string;
  commanders: string[];
  planSource: PlanSource;
  parts: FitsSentencePart[];
  cut: string | null;
  names: Record<string, string>;
  cardName: string;
  /** Free copies of the card now, from the list's re-read: none left, both actions are `to buy`. */
  freeNow: number;
  act: RowAct;
  /** The deck has taken the card since the read, not through this visit's press: both actions off. */
  settled?: boolean;
  /** The deck's inputs moved since the read (lock 6): a new Overview (P3g) or anything else (P10).
   *  The row is dimmed and tagged, and its actions are off: its cut may be gone. */
  changed?: "deck" | "overview" | null;
  /** An action on any row is in flight: every action waits for it. */
  busy: boolean;
  /** This row's last press was refused, and how. */
  refused: "swap" | "add" | "undo" | null;
  onSwap: () => void;
  onAdd: () => void;
  onOpenCard: (oracleId: string) => void;
}) {
  const swapped = act?.kind === "swapped";
  const added = act?.kind === "added";
  const cutName = cut ? names[cut] ?? null : null;
  const toBuy = freeNow === 0;
  const commanderLine = [commanders.join(" & "), copy.planFrom[planSource]].filter(Boolean).join(" · ");
  const actionBase =
    "inline-flex items-center justify-center h-[44px] rounded-[8px] px-[12px] text-[13px] leading-none whitespace-nowrap cursor-pointer border border-solid disabled:cursor-default md:h-[32px] md:rounded-[7px] md:text-[12.5px]";
  const swapOff = busy || added || !cut || settled || changed !== null;
  const addOff = busy || swapped || settled || changed !== null;
  const detail = useCardDetailIfAny();
  // P3f: an older or missing Overview says so, and points at the deck page; a new Overview's tag says it instead.
  const sourceNote = changed === "overview" ? null
    : planSource === "older" ? { note: copy.srcNoteOlder, link: copy.srcLinkOlder }
    : planSource === "none" ? { note: copy.srcNoteNone(commanders.join(" & ")), link: copy.srcLinkNone }
    : null;
  const analysisHref = `/decks/${deckId}?tab=analysis`;
  const swapClass = swapped
    ? "bg-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--bg)] font-semibold"
    : swapOff
      ? "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-locked)] opacity-60 font-medium"
      : toBuy
        ? "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-muted)] font-medium"
        : "bg-transparent border-[color:var(--accent)] text-[color:var(--accent)] font-semibold";
  const addClass = added
    ? "bg-[color:var(--fg-body)] border-[color:var(--fg-body)] text-[color:var(--bg)] font-semibold"
    : addOff
      ? "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-locked)] opacity-60 font-medium"
      : "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-body)] font-medium";

  return (
    <article
      data-testid="read-row"
      className={`flex flex-col gap-[9px] rounded-[9px] p-[12px] md:px-[14px] ${changed ? "opacity-[0.72]" : ""}`}
      style={{ background: "var(--surface-sunken)", border: `1px solid ${swapped ? "var(--accent)" : "var(--border)"}` }}
    >
      {changed ? (
        <span data-testid="read-row-changed" className="self-start rounded-full px-[8px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-muted)] border border-dashed border-[color:var(--border-dashed)]">
          {changed === "overview" ? copy.changedTagOverview : copy.changedTag}
        </span>
      ) : null}
      <div className="flex flex-col gap-[3px] min-w-0">
        <Link
          href={`/decks/${deckId}`}
          aria-label={swapToolsCopy.fits.deckLinkAria(deckName)}
          className="self-start max-w-full truncate text-[13.5px] font-semibold text-[color:var(--fg)] underline underline-offset-2 decoration-[color:var(--border-strong)]"
        >
          {deckName}
        </Link>
        <span data-testid="read-row-source" className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{commanderLine}</span>
      </div>

      <p data-testid="read-row-sentence" className="m-0 text-[13px] leading-[1.6] text-[color:var(--fg-body)] [text-wrap:pretty]">
        {parts.map((p, i) =>
          "card" in p
            ? <Mark key={i} id={p.card} name={names[p.card] ?? cardName} onOpenCard={onOpenCard} />
            : "quote" in p
              ? <span key={i}>{`“${p.quote}”`}</span>
              : <span key={i}>{p.text}</span>,
        )}
      </p>

      {cut && cutName ? (
        <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px] pt-[8px] border-t border-solid border-[color:var(--border)]">
          <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[color:var(--fg-locked)]">{copy.cutLabel}</span>
          <span className={swapped ? "line-through decoration-[color:var(--fg-muted)]" : ""}>
            <Mark
              id={cut}
              name={cutName}
              onOpenCard={onOpenCard}
              className="inline bg-transparent border-0 p-0 cursor-pointer text-left text-[12.5px] font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]"
            />
          </span>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {swapped ? copy.cutNoteSwapped : added ? copy.cutNoteAdded : changed === "deck" ? copy.cutNoteChanged : settled ? null : copy.cutNote}
          </span>
        </div>
      ) : null}

      {sourceNote ? (
        <p data-testid="read-row-source-note" className="m-0 flex flex-wrap gap-x-[8px] gap-y-[4px] text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">
          <span>{sourceNote.note}</span>
          {/* Points, never runs (addendum): the Overview is its own credit, on the deck's Analysis tab.
              The dialog closes first, so the deck page is what the reader lands on. */}
          <Link
            href={analysisHref}
            onClick={() => detail?.close()}
            className="whitespace-nowrap text-[color:var(--accent)] [border-bottom:1px_solid_var(--accent-shadow)]"
          >
            {sourceNote.link}
            <PendingReporter href={analysisHref} />
          </Link>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-[8px] md:flex md:flex-wrap md:items-center">
        <button
          type="button"
          onClick={onSwap}
          disabled={busy || (swapOff && !swapped)}
          aria-pressed={swapped}
          aria-label={cutName ? (swapped ? copy.swappedAria(cardName, deckName, cutName) : copy.swapInAria(cardName, deckName, cutName)) : undefined}
          className={`${actionBase} ${swapClass}`}
        >
          {swapped ? copy.swapped : toBuy ? copy.swapInToBuy : copy.swapIn}
        </button>
        <button
          type="button"
          onClick={onAdd}
          disabled={busy || (addOff && !added)}
          aria-pressed={added}
          aria-label={added ? copy.addedAria(cardName, deckName) : copy.addOnlyAria(cardName, deckName)}
          className={`${actionBase} ${addClass}`}
        >
          {act?.kind === "added" ? (act.toBuy ? copy.addedToBuy : copy.added) : toBuy ? copy.addOnlyToBuy : copy.addOnly}
        </button>
        {added ? (
          <p className="col-span-2 m-0 text-[12px] leading-[1.45] text-[color:var(--fg-muted)] md:flex-1 md:min-w-[200px]">{copy.addedNote(deckName)}</p>
        ) : null}
      </div>

      {refused ? <MutationError message={refused === "swap" ? copy.swapRefused : refused === "add" ? swapToolsCopy.fits.addRefused : copy.undoRefused} /> : null}
    </article>
  );
}
