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
      </p>

      <ul className="list-none p-0 m-0 flex flex-col gap-[4px]">
        {card.claimants.map((c) => {
          // Three outcome words and no more. `keeps it` rather than `gets it` for a commander:
          // it had the card before the import, so the arrival changed nothing for it.
          const outcome = c.commanderCopies > 0 && c.allocated > 0
            ? copy.contested.keeps
            : c.allocated > 0 ? copy.contested.gets : copy.contested.buys;
          return (
            <li
              key={c.deckId}
              className="flex flex-col md:flex-row md:items-center gap-[1px] md:gap-[11px] py-[6px] px-[8px]"
              style={{ borderRadius: 7, background: "var(--bg)" }}
            >
              <span className="text-[13px] md:flex-1 min-w-0 truncate" style={{ color: "var(--fg)" }}>
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
              <span className="flex items-center gap-[8px] md:flex-none">
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
          {copy.contested.commanderNote(card.claimants.find((c) => c.commanderCopies > 0)?.deckName ?? "")}
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
