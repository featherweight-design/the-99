"use client";
// One contested card: how many copies arrived, and every committed deck that wants one, in the
// order that decides who gets them.
//
// IN THIS PR THE ROW STATES THE DEFAULT AND NOTHING ELSE. The options are in commit order,
// each carrying the version stamp the order derives from, and each saying what it gets under
// that default — which is exactly what the section note promises ("the deck that committed the
// card first gets it, unless you say otherwise"). The control that lets a player say otherwise
// is the next PR, and it lands on this component; the reason the row is worth having now is
// that the shortage is real and the summary would otherwise report it without naming it.
//
// ONE COMPONENT, MEANT FOR TWO SURFACES: the summary and `/decks/[id]/changes`. There is no
// deck-page door — that was ruled out on 2026-09-14 and the availability marker stays inert.
//
// THE ORDER IS THE EXPLANATION, so `this deck` is tagged and never promoted: moving a player's
// own deck to the top would hide why it lost.

import { useState, useTransition } from "react";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import { assignCopy, type AssignRefusal } from "../../app/decks/assignment-actions";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { formatShortDeckDate } from "../../lib/decks/format";

/**
 * The `Still to buy` heading, named without its count. The cross-reference points at the
 * SECTION, so it wants the heading's words and not a figure — building it by trimming
 * `sectionStill(0)` would make the copy depend on the punctuation between the two.
 */
const STILL_SECTION_LABEL = "Still to buy";

/**
 * `deck_version_cards.since`, epoch millis, as the stamp draws it.
 *
 * Through `formatShortDeckDate`, which already owns both of this app's date rules — en-US month
 * names because en-GB writes `Sept`, and UTC because the column carries no zone. A second
 * formatter here would drift from the version rail's.
 */
function stampDate(since: number | null): string {
  return since === null ? "" : formatShortDeckDate(new Date(since));
}

/**
 * The allocation mark: a word is never the only carrier, and a hue never is either.
 *
 * It states ALLOCATION and not authorship — filled means this deck holds a copy under the
 * allocation as it stands, empty means it is buying one. Nothing here is accent: accent means
 * "you chose this", and until the chooser ships nobody has chosen anything.
 *
 * ROUND AT ONE COPY, SQUARE ABOVE IT, taking `filter-panel.tsx`'s rule — the shape is the
 * affordance, and a square tick on a one-of-many list promises you can have two. With two
 * copies arrived a player really can give two decks one each, so the shape says so.
 *
 * A commander's mark is dimmed: that copy cannot be moved, so a mark drawn at full strength
 * would invite a press the next PR will have to refuse.
 */
function AllocationMark({
  allocated,
  copies,
  commander,
  picked,
}: {
  allocated: number;
  copies: number;
  commander: boolean;
  /** The player chose this one. Accent, and only here. */
  picked?: boolean;
}) {
  const filled = allocated > 0 || picked;
  const square = copies > 1;
  const fill = picked
    ? "var(--accent)"
    : commander ? "var(--fg-faint)" : "var(--fg-body)";
  return (
    <span
      aria-hidden
      className="flex-none flex items-center justify-center w-[18px] h-[18px] md:w-[16px] md:h-[16px]"
      style={{
        borderRadius: square ? 4 : 999,
        border: `1px solid ${filled ? fill : "var(--fg-faint)"}`,
        background: filled ? fill : "transparent",
      }}
    >
      {filled ? (
        <span
          className="block w-[7px] h-[7px] md:w-[6px] md:h-[6px]"
          style={{ borderRadius: square ? 1 : 999, background: "var(--bg)" }}
        />
      ) : null}
    </span>
  );
}

/** The on-screen sentence for a named refusal — announced verbatim, never summarised. */
function refusalSentence(cause: AssignRefusal, card: ContestedCard, deckName: string): string {
  const holder = card.claimants.find((c) => c.allocated > 0)?.deckName ?? "";
  switch (cause) {
    case "claimant-no-longer-asks":
      return copy.contested.refusedNotWanted(deckName, card.cardName, holder);
    case "no-supply-left":
      return copy.contested.refusedNoSupply(holder, card.owned, deckName);
    case "target-is-commander":
      return copy.contested.refusedIsCommander(card.cardName, deckName);
    // `not-your-deck` has no sentence by design: a player cannot reach it from their own decks,
    // and drawing a state for a request they cannot make would be drawing an attack.
    default:
      return "";
  }
}

export function ContestedCardRow({
  card: initial,
  alsoAbove,
  /** The deck whose page this row is on, when it is on one. Tagged, never promoted. */
  thisDeckId,
}: {
  card: ContestedCard;
  alsoAbove?: boolean;
  thisDeckId?: string;
}) {
  // OPTIMISTIC ON SUCCESS, AUTHORITATIVE ON REFUSAL. A pick moves the words and the marks on the
  // tap — there is no in-flight state, because a spinner on a control whose whole promise is
  // "one tap back" reads as heavier than the act. When the server refuses, its own fresh reading
  // of the row replaces the optimistic one: the refusal means the props are out of date, so
  // redrawing from them would show the player exactly the state that just lost.
  const [card, setCard] = useState(initial);
  const [refusal, setRefusal] = useState<AssignRefusal | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [, startTransition] = useTransition();
  // A fresh server payload always wins, and is filed on its way past. Adjusted during render
  // rather than in an effect, or the previous allocation paints once before being corrected.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setCard(initial);
    setRefusal(null);
    setChosen(null);
  }

  const pick = (deckId: string, deckName: string) => {
    const wasChosen = chosen === deckId;
    // The optimistic allocation: the chosen deck takes a copy, and the deck that loses one is the
    // last to hold one it was not reserved. Words and marks move together, because the mark
    // states allocation and the word states the same thing — they cannot disagree.
    setRefusal(null);
    setChosen(wasChosen ? null : deckId);
    const displaced = card.claimants.find((c) => c.deckId !== deckId && c.allocated > 0);
    setAnnounce(wasChosen
      ? copy.contested.announcedCleared(card.cardName, displaced?.deckName ?? "")
      : copy.contested.announcedPick(deckName, card.cardName, displaced?.deckName ?? ""));
    startTransition(async () => {
      const result = await assignCopy(card.oracleId, deckId);
      if (result.card) setCard(result.card);
      if (!result.ok) {
        setRefusal(result.cause);
        setChosen(null);
        // A refusal announces the on-screen sentence verbatim rather than a summary of it.
        setAnnounce(refusalSentence(result.cause, result.card ?? card, deckName));
      }
    });
  };
  // A commander's copy can never be given away, so a row where every copy is a commander's has
  // nothing to choose — and says so rather than drawing a queue nobody can change.
  const spare = Math.max(card.owned - card.claimants.reduce((n, c) => n + c.commanderCopies, 0), 0);
  const nothingToChoose = spare === 0;
  const folded = card.claimants.some((c) => c.commanderCopies > 0 && c.quantity > c.commanderCopies);
  // Copies that could go to any deck: the supply less what commanders hold, capped at what this
  // import brought. It sets the mark's shape as well as the cap, because both answer the same
  // question — how many copies are actually in play.
  const giveable = Math.min(spare, card.arrived);
  const givenOut = Math.min(
    card.claimants.reduce((n, c) => n + Math.max(c.allocated - c.commanderCopies, 0), 0),
    card.arrived,
  );
  // WHICH DECKS HELD A COPY BEFORE THIS IMPORT, per claimant rather than as a fact about the
  // collection. `ownedBefore > 0` is not enough on its own: with one old copy, an earlier list
  // claimant and a later commander claimant, the queue gives the old copy to the list deck and
  // the arriving one to the commander — so the commander did NOT keep anything, however true it
  // is that a copy existed. Re-running the same queue over the pre-import supply answers it.
  //
  // ONE LIMITATION, stated rather than hidden: `ownedBefore` is an aggregate, and the claimants
  // are read LIVE, so a deck that joined the queue after the import can be handed one of the
  // pre-import copies by this reconstruction and read as `keeps it`. Storing the per-deck
  // pre-import holders would fix it and is not done here — `keeps it`'s semantics were ruled a
  // design question at review round 10, and this is the same word. It is wrong only for a deck
  // that both joined after the import and outranks an original holder.
  const heldBefore = new Set<string>();
  {
    let left = card.ownedBefore;
    for (const c of card.claimants) {
      const took = Math.min(c.quantity, left);
      if (took > 0) heldBefore.add(c.deckId);
      left -= took;
    }
  }
  // The deck the shortage actually falls on — the one whose ask is not covered. Naming the
  // first commander claimant instead points at a deck that is keeping its copy, which is the
  // opposite of what the note says about it.
  const payer = card.claimants.find((c) => c.allocated < c.quantity)?.deckName ?? "";

  return (
    <div
      className="p-[12px_13px]"
      style={{ border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface)" }}
    >
      <div className="flex items-baseline justify-between gap-[10px]">
        <span className="text-[13.5px] font-semibold min-w-0 truncate" style={{ color: "var(--fg)" }}>
          {card.cardName}
        </span>
        <span className="font-mono text-[10.5px] md:text-[11px] flex-none" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.supply(card.arrived, card.claimants.length)}
        </span>
      </div>

      <p
        className="font-mono text-[10px] uppercase tracking-[0.13em] mt-[9px] mb-[7px]"
        style={{ color: "var(--fg-body)" }}
      >
        {nothingToChoose
          ? copy.contested.headingInert
          : folded
            ? copy.contested.headingSpare
            : copy.contested.heading(card.arrived)}
        {/* The cap, stated beside the heading whenever it is above one — seniority has already
            given every copy away before any pick, so the figure is true in both states. */}
        {!nothingToChoose && card.arrived > 1 ? (
          <span className="ml-[8px] normal-case tracking-normal" style={{ color: "var(--fg-faint)" }}>
            {copy.contested.cap(givenOut, card.arrived)}
          </span>
        ) : null}
      </p>

      <ul
        className="list-none p-0 m-0 flex flex-col gap-[4px]"
        role="radiogroup"
        aria-label={copy.contested.a11yGroup(card.cardName, card.arrived)}
      >
        {card.claimants.map((c) => {
          // `keeps it` rather than `gets it` for a commander: it had the card before the import,
          // so the arrival changed nothing for it. A folded claimant that ALSO took a spare copy
          // says both — `keeps it` alone would hide the second copy and contradict the heading,
          // which has just said there is a spare to give.
          const spareToThisDeck = c.allocated - Math.min(c.commanderCopies, c.allocated);
          // `keeps it` says the deck had the card BEFORE the import, so it is only available
          // when a copy predates it. A first arrival landing on a commander's claim is a deck
          // that GETS the card, however protected that copy is from here on.
          const predates = heldBefore.has(c.deckId);
          // An option nobody can choose: a commander-only claimant, or any option on a card with
          // no spare copy at all. A folded claim is NOT inert — its spare is live.
          const inert = nothingToChoose || c.commanderCopies >= c.quantity;
          const first = card.claimants.find((x) => !(nothingToChoose || x.commanderCopies >= x.quantity))?.deckId === c.deckId;
          const outcome = c.commanderCopies > 0 && c.allocated > 0 && predates
            ? (spareToThisDeck > 0
                ? copy.contested.keepsAndGets(Math.min(c.commanderCopies, c.allocated), spareToThisDeck)
                : copy.contested.keeps)
            : c.allocated > 0 ? copy.contested.gets : copy.contested.buys;
          return (
            <li
              key={c.deckId}
              // `aria-checked` is the whole authorship model: checked means YOU chose this.
              // A filled mark on an unchecked option means the deck holds a copy by default,
              // which is a different fact and must not read as a selection.
              role="radio"
              aria-checked={chosen === c.deckId}
              aria-disabled={inert || undefined}
              tabIndex={inert ? -1 : chosen === c.deckId || (!chosen && first) ? 0 : -1}
              aria-label={
                c.commanderCopies >= c.quantity
                  ? copy.contested.a11yCommander(c.deckName, card.cardName)
                  : chosen === c.deckId
                    ? copy.contested.a11ySelected(c.deckName)
                    : copy.contested.a11yOption(c.deckName, outcome)
              }
              onClick={inert ? undefined : () => pick(c.deckId, c.deckName)}
              onKeyDown={inert ? undefined : (e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  pick(c.deckId, c.deckName);
                }
              }}
              // 52px two-line on a phone, 44px one-line from `md` — the handoff's own targets,
              // stated rather than left to padding. `items-start` and `items-center` were both
              // present, which resolves by utility order rather than by intent.
              className="flex flex-col justify-center md:flex-row md:items-center gap-[1px] md:gap-[11px] py-[6px] px-[8px] min-h-[52px] md:min-h-[44px]"
              style={{
                borderRadius: 7,
                background: "var(--bg)",
                // A dashed border marks an option nobody can choose: a commander-only claimant,
                // or any row on a card with no spare copy at all. NOT a folded claim — that one
                // keeps its commander half and its spare is live, so it stays an ordinary option.
                border: inert
                  ? "1px dashed var(--border)"
                  // Accent ONLY on a pick. Accent means "you chose this" everywhere in this app,
                  // so an option wearing it by default would claim an authorship nobody has.
                  : chosen === c.deckId
                    ? "1px solid var(--accent)"
                    : "1px solid transparent",
                cursor: inert ? "default" : "pointer",
              }}
            >
              <span className="flex items-center gap-[11px] md:gap-[11px] md:flex-1 min-w-0">
                <AllocationMark
                  allocated={c.allocated}
                  // The GIVEABLE count, not the arrival count. Two copies can arrive with one
                  // consumed by a commander, leaving one that can actually be assigned — and a
                  // square mark there promises two decks can each have one.
                  copies={giveable}
                  commander={c.commanderCopies > 0}
                />
                {/* Truncation only from `md`. At phone width this cell is stretched to the row,
                    and a deck name — the shared limit is 120 characters — would be ellipsised
                    rather than taking the second line the design gives it. */}
                <span className="text-[13px] min-w-0 md:truncate" style={{ color: "var(--fg)" }}>
                {c.deckName}
                {c.deckId === thisDeckId ? (
                  <span
                    className="font-mono text-[10px] ml-[6px] px-[5px] py-[1px] align-middle"
                    style={{ borderRadius: 4, background: "var(--surface-inset)", color: "var(--fg-body)" }}
                  >
                    {copy.contested.thisDeck}
                  </span>
                ) : null}
                {c.commanderCopies > 0 ? (
                  <span
                    className="font-mono text-[10px] ml-[6px] px-[5px] py-[1px] align-middle"
                    style={{ borderRadius: 4, background: "var(--surface-inset)", color: "var(--fg-body)" }}
                  >
                    {copy.contested.commanderTag}
                  </span>
                ) : null}
                </span>
              </span>
              <span className="flex items-center gap-[8px] md:flex-none pl-[27px] md:pl-0">
                {c.versionNumber !== null ? (
                  <span className="font-mono text-[10.5px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
                    {copy.contested.stamp(c.versionNumber, stampDate(c.since))}
                  </span>
                ) : null}
                <span
                  className="font-mono text-[10.5px] md:text-[11px]"
                  style={{ color: c.allocated > 0 ? "var(--success)" : "var(--avail-over-fg)" }}
                >
                  {outcome}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* A brew is named and excluded in one line. Omitting it silently would make the supply
          count above quietly wrong; listing it as an option would invite a certain refusal. */}
      {card.brewNames.length === 1 ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.brewNote(card.brewNames[0])}
        </p>
      ) : card.brewNames.length > 1 ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.brewNoteMany(card.brewNames.length)}
        </p>
      ) : null}

      {nothingToChoose ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.commanderNote(payer)}
        </p>
      ) : folded ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.commanderNoteFolded(
            card.claimants.find((c) => c.commanderCopies > 0)?.deckName ?? "",
          )}
        </p>
      ) : null}

      {/* THE FOOTER IS REQUIRED WHEREVER THE CHOOSER APPEARS. It is the feature's only non-colour
          carrier of authorship — it NAMES THE DECK, where a plate could only say that something
          was chosen — and in the two themes where accent sits in a neighbouring hue family it is
          the only thing separating a pick from an outcome. A refusal note supersedes it: that
          sentence already names the holder and the way back, and two competing instructions on
          one row is worse than one. */}
      {refusal ? (
        <p
          className="text-[11.5px] mt-[9px] mb-0 pl-[9px]"
          style={{ color: "var(--fg-body)", borderLeft: "3px solid var(--danger)" }}
        >
          {refusalSentence(refusal, card, card.claimants.find((c) => c.deckId === chosen)?.deckName ?? "")}
        </p>
      ) : chosen ? (
        <p className="flex flex-col md:flex-row md:items-baseline gap-[2px] md:gap-[10px] text-[11.5px] mt-[9px] mb-0"
           style={{ color: "var(--fg-body)" }}>
          <span>{copy.contested.undoHint(card.claimants.find((c) => c.deckId === chosen)?.deckName ?? "")}</span>
          <button
            type="button"
            onClick={() => {
              const deck = card.claimants.find((c) => c.deckId === chosen);
              if (deck) pick(deck.deckId, deck.deckName);
            }}
            // 34px tall inside a 44px target, per the handoff.
            className="font-mono text-[11px] text-left text-[color:var(--accent)] min-h-[44px] md:min-h-0 md:py-[5px]"
          >
            {copy.contested.clear}
          </button>
        </p>
      ) : null}

      {/* One announcement per settled pick and one per refusal, and no more. */}
      <span aria-live="polite" className="sr-only">{announce}</span>

      {alsoAbove ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.summary.alsoAbove(STILL_SECTION_LABEL)}
        </p>
      ) : null}
    </div>
  );
}
