"use client";
// SuggestionTile — the Consider view's unit, per design table §4 and §4a–4h.
//
// Three click targets and no more: the art, the name, and Add. The role the
// card was suggested for is never printed here — it is the shelf heading above,
// so a tile in the Ramp shelf does not say "ramp" a second time.

import type { DeckSuggestion } from "../../lib/decks/suggest";
import { addCardToDeck } from "../../app/decks/actions";
import { availabilityCopy } from "../../lib/copy/availability";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { synergyCopy, synergySignedDisplay } from "../../lib/copy/synergy-discovery";
import { availabilityState, hardDecks } from "../../lib/decks/availability";
import { CostPips } from "../ui/cost-pips";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { shelfRoleOf } from "../../lib/decks/suggest";
import { AvailabilityMarker } from "../ui/availability-marker";
import { GhostButton } from "../ui/button";
import { BuyTag } from "./buy-tag";
import type { ProvenanceForm } from "../../lib/decks/price";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

// The bar is decoration for a figure that is always present as text, so a card
// with no EDHREC percentage gets a sentence instead — never a 0%-wide bar,
// which reads as "no deck runs this" rather than "we don't know". The lift line
// lives below the bar row (or no-inclusion sentence) so ungating it from
// ownership means the sentence branch must not short-circuit the whole component.
function Evidence({
  suggestion, inDeck, commanderShortName, showNoSynergy,
}: {
  suggestion: DeckSuggestion;
  inDeck: boolean;
  commanderShortName: string;
  // Only true on the synergy shelf, where a tile with no figure at all draws an
  // explicit absent-state label rather than staying silent as everywhere else.
  showNoSynergy?: boolean;
}) {
  const { inclusionPct, lift, synergyFigure } = suggestion;
  const pct = inclusionPct != null ? String(Math.round(inclusionPct)) : null;

  // The no-inclusion sentence is rendered in place of the bar row (not instead
  // of the whole component) so the lift line below it remains reachable.
  const barRow = pct != null ? (
    <div className="flex items-center gap-[6px]">
      {/* The contract binds this value only as a border token, but the design
          spends it as a dim foreground here and in decklist-row.tsx. */}
      <span
        aria-hidden
        className="font-mono text-[9px]"
        style={{ color: inDeck ? "var(--border-dashed)" : "var(--fg-locked)" }}
      >
        {addPanelCopy.tile.evidenceLabel}
      </span>
      <span
        aria-hidden
        className="flex-1 h-[4px] rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, inclusionPct ?? 0))}%`,
            background: inDeck ? "var(--accent-shadow)" : "var(--accent)",
          }}
        />
      </span>
      <span
        className="font-mono text-[10px] tabular-nums"
        style={{ color: inDeck ? "var(--fg-faint)" : "var(--fg-body)" }}
        aria-label={addPanelCopy.tile.inclusionAria(pct, commanderShortName)}
      >
        {addPanelCopy.tile.inclusion(pct)}
      </span>
    </div>
  ) : (
    // The slot the card was picked for, never the card's own role — the two
    // diverge on a multi-role card, and the sentence is about why it is here.
    <p className="font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>
      {suggestion.reasonType === "role"
        ? addPanelCopy.tile.fillsRole(addPanelCopy.shelf.labels[shelfRoleOf(suggestion)].toLowerCase())
        : addPanelCopy.tile.noInclusion}
    </p>
  );

  return (
    <div className="flex flex-col gap-[3px]">
      {barRow}
      {lift != null ? (
        <p className="font-mono text-[9.5px]" style={{ color: "var(--accent-shadow)" }}>
          {/* EDHREC hands synergy back as a fraction; the tile states it in points. */}
          {addPanelCopy.tile.lift(String(Math.round(lift * 100)))}
        </p>
      ) : synergyFigure != null ? (
        // A figure that never became a lift — zero or negative. Still a rank:
        // the design table says the line is always rendered when the figure is
        // present, and neither zero nor a negative is an absence. Signed by the
        // shared formatter so a rounded 0 does not print as "−0 pts".
        <p className="font-mono text-[9.5px]" style={{ color: "var(--fg-faint)" }}>
          {synergySignedDisplay(Math.round(synergyFigure * 100))}
        </p>
      ) : showNoSynergy ? (
        // Only on the synergy shelf: a card with no figure at all is named rather
        // than silent, so the player knows the card simply has no data.
        <p className="font-mono text-[9.5px]" style={{ color: "var(--fg-faint)" }}>
          {synergyCopy.shelf.noSynergy}
        </p>
      ) : null}
    </div>
  );
}

interface SuggestionTileProps {
  suggestion: DeckSuggestion;
  deckId: string;
  /** The server's decklist, never the optimistic one — see builder-shell.tsx:67. */
  inDeck: boolean;
  /**
   * This deck holds a claim the availability read excluded — `inDeck`, plus the
   * commander, which is not a `deck_cards` row. See ConsiderPanel.
   */
  selfClaimed: boolean;
  /** The shelf's ordered ids, so the modal's Prev/Next pages this role group. */
  siblings: string[];
  commanderShortName: string;
  /** Only true when rendered on the synergy shelf — renders the absent-figure
      label instead of staying silent, so players know a null is no data, not
      last rank. Absent on all other shelves. */
  showNoSynergy?: boolean;
  /** The newest `as_of` in `printing_prices`; the tag's liveness comparison. */
  newestAsOf?: Date | null;
  /** Server-built provenance, spoken in the tile's accessible name. */
  provenance?: ProvenanceForm | null;
}

export function SuggestionTile({
  suggestion, deckId, inDeck, selfClaimed, siblings, commanderShortName, showNoSynergy,
  newestAsOf = null, provenance = null,
}: SuggestionTileProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  const addOptimisticCard = useAddOptimisticCard();
  const noArt = suggestion.imageUri === null;

  // `selfClaimed`, not `applied`: these figures came back from a query that
  // excluded this deck's stored claim, which an add made seconds ago is not yet
  // part of.
  const availState = suggestion.availability
    ? availabilityState(suggestion.availability, { selfExcluded: selfClaimed })
    : "free";
  // Only the two states the design draws a caption for, and only when there is
  // a name or a count to put in it. A hard claim held by several decks has no
  // shipped string — `tileInUse` takes one name — so it draws the chip alone.
  const names = suggestion.availability ? hardDecks(suggestion.availability).map((d) => d.name) : [];
  const tileCaption =
    availState === "hard" && names.length === 1
      ? availabilityCopy.marker.tileInUse(names[0])
      : availState === "over" && names.length >= 1
        ? availabilityCopy.marker.tileOver(names.length)
        : null;

  function handleAdd() {
    run(
      () => addCardToDeck(deckId, suggestion.oracleId),
      () => addOptimisticCard({
        oracleId: suggestion.oracleId,
        name: suggestion.name,
        typeLine: suggestion.typeLine,
        cardTypeGroup: suggestion.cardTypeGroup,
        role: suggestion.role,
        owned: suggestion.owned,
        quantity: 1,
        auto: false,
        manaCost: suggestion.manaCost,
        imageUri: suggestion.imageUri,
      }),
    );
  }

  return (
    // The tile keeps its slot once added: pulling it out reflows the grid under
    // the pointer, so the next click lands on a card the user never chose.
    <li
      className="group flex flex-col gap-[8px] rounded-[10px] p-[9px] pb-[10px] transition-colors border bg-[color:var(--surface)] border-[color:var(--border)] hover:bg-[color:var(--elevated-hover)] hover:border-[color:var(--border-strong)]"
      style={{ opacity: noArt ? 0.55 : 1 }}
    >
      {/* One slot, two marks: the dot is aria-hidden decoration, the tag is the
          only thing that says unowned out loud. An added tile keeps neither
          rather than claiming two states at once.

          They sit beside the art rather than inside it. `CardDetailTrigger` is a
          button carrying its own `aria-label`, which replaces everything below
          it in the accessible name — a tag nested there was silent, leaving the
          shelf heading as the sole carrier of unownedness. Out here the mark
          also survives a card with no art, which renders a placeholder instead
          of the art branch the marks used to live in. */}
      <div className="relative">
        {/* pointer-events-none because the chip sits over the detail trigger and
            is never a tap target itself (design 3.6). Not suppressed on an
            applied tile: "already sleeved elsewhere" is exactly what a player
            needs to know about a card they have just added. */}
        {suggestion.availability && (
          <AvailabilityMarker
            availability={suggestion.availability}
            density="chip"
            selfExcluded={selfClaimed}
            // The tile's own labels belong to the two detail triggers; neither
            // wraps the chip, so it carries §17's prose itself.
            spoken
            className="z-10 pointer-events-none"
          />
        )}
        {!applied && (suggestion.owned ? (
          <span
            aria-hidden
            className="absolute z-10 right-[6px] top-[6px] w-[8px] h-[8px] rounded-full pointer-events-none"
            style={{ background: "var(--success)", boxShadow: "0 0 0 2px color-mix(in oklab, var(--bg) 70%, transparent)" }}
          />
        ) : (
          <BuyTag
            variant="tile"
            label={addPanelCopy.unowned.tagAria(suggestion.name)}
            price={suggestion.price}
            newestAsOf={newestAsOf}
            provenance={provenance}
          />
        ))}
        <CardDetailTrigger
          oracleId={suggestion.oracleId}
          name={suggestion.name}
          siblings={siblings}
          className={`relative block w-full overflow-hidden rounded-[7px] p-0 border-none transition-shadow ${
            // The shadows are classes rather than an inline style so the hover
            // variant can win: an inline boxShadow outranks group-hover:.
            applied || noArt
              ? "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]"
              : "shadow-[inset_0_-26px_30px_-22px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_0_-26px_30px_-22px_rgba(0,0,0,0.5),inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
          }`}
          style={{
            aspectRatio: "63 / 88",
            background: noArt
              ? "linear-gradient(158deg, var(--border-strong) 0%, var(--surface-raised) 62%, var(--surface-sunken) 100%)"
              : `center / cover no-repeat url(${suggestion.imageUri})`,
            filter: applied ? "grayscale(.6)" : undefined,
            opacity: applied ? 0.5 : undefined,
          }}
        >
          {noArt ? (
            <span
              className="absolute inset-0 flex items-center justify-center text-center font-mono text-[9px] leading-[1.4]"
              style={{ color: "var(--fg-locked)" }}
            >
              {addPanelCopy.tile.noArt}
            </span>
          ) : (
            <>
              {!applied && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 hidden pt-[14px] pr-[6px] pb-[5px] text-right font-mono text-[9px] group-hover:block"
                  style={{
                    background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--bg) 85%, transparent))",
                    color: "var(--accent)",
                  }}
                >
                  {addPanelCopy.tile.detailHint}
                </span>
              )}
              {suggestion.manaCost && (
                <CostPips
                  cost={suggestion.manaCost}
                  className="absolute left-[6px] bottom-[6px] flex gap-[3px]"
                />
              )}
            </>
          )}
        </CardDetailTrigger>
      </div>

      <div className="flex flex-col gap-[2px] min-w-0">
        <CardDetailTrigger
          oracleId={suggestion.oracleId}
          name={suggestion.name}
          siblings={siblings}
          // Always two lines tall, clamped or not: a shelf is a grid, and a
          // one-line name beside a wrapped one pushed its type line, bar and
          // Add button half a line up out of alignment with its row-mates.
          // 2.5em is the clamp height exactly — two lines at leading 1.25.
          className="block w-full text-left text-[13px] md:text-[12.5px] font-semibold leading-[1.25] min-h-[2.5em] p-0"
          style={{
            color: applied ? "var(--fg-muted)" : "var(--fg)",
            background: "transparent",
            border: "none",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {suggestion.name}
        </CardDetailTrigger>
        <p
          className="truncate font-mono text-[10px] md:text-[9.5px]"
          style={{ color: applied ? "var(--fg-locked)" : "var(--fg-faint)" }}
        >
          {suggestion.typeLine}
        </p>
        {/* The chip is count-only (density="chip" forces nameless), so the
            caption is where the deck gets named. Design 6.3 / 6.4. */}
        {tileCaption && (
          // The caption takes its colour from the state, not from the state it
          // is usually in: the chip is nameless at this density, so this line
          // is the only thing that separates an over-committed card from one
          // merely in use. Painting both accent makes them the same card.
          <p
            className={`truncate font-mono text-[8.5px] font-semibold ${
              availState === "over"
                ? "text-[color:var(--avail-over-fg)]"
                : "text-[color:var(--avail-hard-fg)]"
            }`}
          >
            {tileCaption}
          </p>
        )}
      </div>

      <Evidence
        suggestion={suggestion}
        inDeck={applied}
        commanderShortName={commanderShortName}
        showNoSynergy={showNoSynergy}
      />

      {applied ? (
        <span
          aria-disabled="true"
          aria-label={addPanelCopy.tile.inDeckAria(suggestion.name)}
          className="block text-center text-[12px] font-semibold rounded-[7px] py-[7px]"
          style={{ color: "var(--success)", border: "1px solid var(--border)" }}
        >
          {addPanelCopy.tile.inDeck}
        </span>
      ) : (
        // One geometry, one weight, two labels. The owned and unowned adds are
        // peers — same importance, different consequence — so the consequence
        // is named in the label rather than drawn as a tier difference nobody
        // can perceive while skimming a panel. Accent is doubly wrong on the
        // unowned branch: it is the one press that creates a to-buy
        // obligation, on a tile already printing to-buy as accent data.
        // R3.1 §4.
        //
        // Hairline geometry spelled out at `md:` rather than merged from
        // `HAIRLINE`, which is a `sm:` constant: this file splits at `md`.
        <GhostButton
          onClick={handleAdd}
          disabled={isPending}
          aria-label={
            suggestion.owned
              ? addPanelCopy.tile.addAria(suggestion.name)
              : addPanelCopy.tile.addUnownedAria(suggestion.name)
          }
          className="w-full text-center rounded-[10px] md:rounded-[8px] h-[44px] md:h-[32px] px-[16px] md:px-[14px] text-[14px] md:text-[12.5px] font-medium disabled:opacity-50"
        >
          {suggestion.owned
            ? addPanelCopy.tile.add
            : addPanelCopy.tile.addUnowned}
        </GhostButton>
      )}

      {error && <MutationError message={error} />}
    </li>
  );
}
