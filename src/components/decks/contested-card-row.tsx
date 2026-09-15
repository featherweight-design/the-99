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

import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
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
}: {
  allocated: number;
  copies: number;
  commander: boolean;
}) {
  const filled = allocated > 0;
  const square = copies > 1;
  const fill = commander ? "var(--fg-faint)" : "var(--fg-body)";
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

export function ContestedCardRow({
  card,
  alsoAbove,
  /** The deck whose page this row is on, when it is on one. Tagged, never promoted. */
  thisDeckId,
}: {
  card: ContestedCard;
  alsoAbove?: boolean;
  thisDeckId?: string;
}) {
  // A commander's copy can never be given away, so a row where every copy is a commander's has
  // nothing to choose — and says so rather than drawing a queue nobody can change.
  const spare = Math.max(card.owned - card.claimants.reduce((n, c) => n + c.commanderCopies, 0), 0);
  const nothingToChoose = spare === 0;
  const folded = card.claimants.some((c) => c.commanderCopies > 0 && c.quantity > c.commanderCopies);
  // Copies already allocated that COULD have gone elsewhere, for the cap beside the heading.
  // Commander copies are not among them — they cannot be given away at all, so counting one
  // says two copies were handed out when only one was ever in play. Clamped to what this import
  // brought as well: the allocation covers every copy owned, so with one old copy and two
  // arrivals it would otherwise claim three new copies were given.
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

      <ul className="list-none p-0 m-0 flex flex-col gap-[4px]">
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
          const outcome = c.commanderCopies > 0 && c.allocated > 0 && predates
            ? (spareToThisDeck > 0
                ? copy.contested.keepsAndGets(Math.min(c.commanderCopies, c.allocated), spareToThisDeck)
                : copy.contested.keeps)
            : c.allocated > 0 ? copy.contested.gets : copy.contested.buys;
          return (
            <li
              key={c.deckId}
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
                border: nothingToChoose || c.commanderCopies >= c.quantity
                  ? "1px dashed var(--border)"
                  : "1px solid transparent",
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

      {alsoAbove ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.summary.alsoAbove(STILL_SECTION_LABEL)}
        </p>
      ) : null}
    </div>
  );
}
