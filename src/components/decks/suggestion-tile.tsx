"use client";
// SuggestionTile — the Consider view's unit, per design table §4 and §4a–4h.
//
// Three click targets and no more: the art, the name, and Add. The role the
// card was suggested for is never printed here — it is the shelf heading above,
// so a tile in the Ramp shelf does not say "ramp" a second time.

import type { DeckSuggestion, DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { addCardToDeck } from "../../app/decks/actions";
import { availabilityCopy } from "../../lib/copy/availability";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { synergyCopy, synergySignedDisplay } from "../../lib/copy/synergy-discovery";
import { availabilityState, hardDecks } from "../../lib/decks/availability";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { shelfRoleOf } from "../../lib/decks/suggest";
import { AvailabilityMarker } from "../ui/availability-marker";
import { GhostButton } from "../ui/button";
import { BuyTag } from "./buy-tag";
import { CardNote } from "./card-note";
import { CardTileCaption } from "../ui/card-tile-caption";
import { OwnershipDot } from "../ui/ownership-dot";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { FactTooltip } from "../cards/fact-tooltip";
import { factsFromCandidate } from "../../lib/bracket/facts";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import type { ProvenanceForm } from "../../lib/decks/price";
import type { Bracket } from "../../lib/bracket/types";
import type { NoteCounts } from "../../lib/bracket/card-note";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { comboClauseSpoken } from "../cards/combo-clause";
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
      {/* States l1-l3, consider-tiles handoff call 4: all three at one ink and one size,
          `--fg-muted` mono 10px — was `--accent-shadow` (l1) and `--fg-faint` (l2/l3) at
          9.5px, which measured 1.48-2.13:1 against the tile's ground on every theme
          (design brief finding 4). `--fg-muted` reads 5.94-6.65:1 at the same size. */}
      {lift != null ? (
        <p className="font-mono text-[10px]" style={{ color: "var(--fg-muted)" }}>
          {/* EDHREC hands synergy back as a fraction; the tile states it in points. */}
          {addPanelCopy.tile.lift(String(Math.round(lift * 100)))}
        </p>
      ) : synergyFigure != null ? (
        // A figure that never became a lift — zero or negative. Still a rank:
        // the design table says the line is always rendered when the figure is
        // present, and neither zero nor a negative is an absence. Signed by the
        // shared formatter so a rounded 0 does not print as "−0 pts".
        <p className="font-mono text-[10px]" style={{ color: "var(--fg-muted)" }}>
          {synergySignedDisplay(Math.round(synergyFigure * 100))}
        </p>
      ) : showNoSynergy ? (
        // Only on the synergy shelf: a card with no figure at all is named rather
        // than silent, so the player knows the card simply has no data.
        <p className="font-mono text-[10px]" style={{ color: "var(--fg-muted)" }}>
          {synergyCopy.shelf.noSynergy}
        </p>
      ) : null}
    </div>
  );
}

interface SuggestionTileProps {
  /** The ENRICHED suggestion: `facts` required, so the page's attachment cannot be deleted
   *  without a compile error. See `DeckSuggestionWithFacts`. */
  suggestion: DeckSuggestionWithFacts;
  deckId: string;
  /**
   * The deck's live declaration, and what its list already holds of each note-bearing kind.
   *
   * Both come off `DeckDetail` and are threaded rather than imported: the counts are a fact
   * about THIS deck, and a component reaching for anything module-level would draw one deck's
   * ordinals on every deck — the rule `mix` above states for the same reason.
   */
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
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
  /**
   * The newest `as_of` in the price table, for measuring a row's liveness.
   *
   * REQUIRED, with no default. A component that does not receive it reads every
   * live price as `absent` and draws a bare `buy` with no figure — a wrong price
   * rather than a missing prop, and silent. That shipped once: the commander
   * page threaded it to one of two synergy panels and every desktop row lost its
   * figure, while the phone was correct and every component test passed.
   *
   * Pass `null` explicitly where there is no price feed to measure against. The
   * point is that the caller states it.
   */
  newestAsOf: Date | null;
  /** Server-built provenance, spoken in the tile's accessible name. */
  provenance?: ProvenanceForm | null;
}

export function SuggestionTile({
  suggestion, deckId, declaredBracket, noteCounts, inDeck, selfClaimed, siblings,
  commanderShortName, showNoSynergy, newestAsOf, provenance = null,
}: SuggestionTileProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  // The three standing facts, adapted from the candidate's own read. `undefined` for a card
  // with none and for a failed read alike — both draw nothing, which is the same rendering.
  const marks = factsFromCandidate(suggestion.facts) ?? [];
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
        cmc: suggestion.manaValue,
        owned: suggestion.owned,
        quantity: 1,
        auto: false,
        // Null on an optimistic row: the search result carries the oracle
        // name only, and this row exists for the beat before the server
        // answers. The revalidate supplies the printed name; until then the
        // row reads exactly as it does today.
        printedName: null,
        printedSetCode: null,
        printedCollectorNumber: null,
        manaCost: suggestion.manaCost,
        imageUri: suggestion.imageUri,
      }),
    );
  }

  // §C2 amendment, consider-tiles handoff call 3: the lemniscate joins the fact marks on the
  // meta line, and the combo partner's name moves alone onto the secondary line (`+ {partner}`)
  // — scoped to this tile; the clause's own placement rule still governs every other host.
  const completesCombo = Boolean(suggestion.comboPartner) && !applied;

  return (
    // The tile keeps its slot once added: pulling it out reflows the grid under
    // the pointer, so the next click lands on a card the user never chose.
    <li
      // For the ORDER tests alone. Neither this component nor the panel carries a testid, so a
      // test asserting which card comes first had nothing to query — and a test that queries
      // an attribute nobody renders fails for the wrong reason, or passes over an empty list.
      data-testid="suggestion-tile"
      data-oracle-id={suggestion.oracleId}
      className="group flex flex-col gap-[8px] rounded-[10px] p-[9px] pb-[10px] transition-colors border bg-[color:var(--surface)] border-[color:var(--border)] hover:bg-[color:var(--elevated-hover)] hover:border-[color:var(--border-strong)]"
      style={{ opacity: noArt ? 0.55 : 1 }}
    >
      {/* THE ART, bare — consider-tiles handoff call 1 and `STATES-consider-tiles.md` c10.
          Nothing overlays it: the dot, the slot and the marks all move into the caption below,
          and cost pips and the hover hint are deleted outright (design brief finding 1). Only
          the 1px inset edge survives of the two shadows the art used to carry. */}
      <CardDetailTrigger
        oracleId={suggestion.oracleId}
        name={suggestion.name}
        siblings={siblings}
        className="relative block w-full overflow-hidden rounded-[7px] p-0 border-none"
        style={{
          aspectRatio: "63 / 88",
          background: noArt
            ? "linear-gradient(158deg, var(--border-strong) 0%, var(--surface-raised) 62%, var(--surface-sunken) 100%)"
            : "var(--surface-sunken)",
          filter: applied ? "grayscale(.6)" : undefined,
          opacity: applied ? 0.5 : undefined,
        }}
      >
        {/* AN IMG, LOADED LAZILY, as the Card view's and the /collection grid's (list payload
            plan): a CSS background is fetched for every tile whether or not it is on screen,
            so an expanded shelf asked for every candidate's art at once. */}
        {noArt ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- Scryfall art is remote; next/image would need a loader per host and would re-encode art the CDN already sizes
          <img
            src={suggestion.imageUri!}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]"
        />
        {noArt && (
          <span
            className="absolute inset-0 flex items-center justify-center text-center font-mono text-[9px] leading-[1.4]"
            style={{ color: "var(--fg-locked)" }}
          >
            {addPanelCopy.tile.noArt}
          </span>
        )}
      </CardDetailTrigger>

      {/* THE CAPTION — `CardTileCaption` as is (handoff call 1). Meta line order per
          `STATES-consider-tiles.md`: ownership dot, the one slot, the fact marks, the
          lemniscate (c1-c9). */}
      <CardTileCaption
        meta={
          <>
            {/* No dot on an applied tile (c9) — the dot is a mark about this player's
                collection, and the chip beside it already says the card is sleeved. */}
            {/* `OwnershipDot`'s `label` lands as an `aria-label` on a bare `<span>`, whose
                default role carries no accessible name — browsers discard it (the same gap
                `buy-tag.tsx:131-134` documents). Real visually-hidden text, only for the owned
                case: the unowned caption slot already speaks "not owned" (BuyTag or the
                availability marker), so a second announcement there would repeat itself. */}
            {!applied && (
              <>
                <OwnershipDot
                  owned={suggestion.owned}
                  committed={availState === "hard" || availState === "over"}
                  className="w-[8px] h-[8px] flex-none"
                />
                {suggestion.owned && <span className="sr-only">Owned</span>}
              </>
            )}
            {/* One slot. The chip stays on an applied tile — "already sleeved elsewhere" is
                exactly what a player needs to know about a card they just added — but no
                buy tag draws there (c9: "no buy tag"). */}
            {suggestion.availability ? (
              <AvailabilityMarker bareOne
                availability={suggestion.availability}
                density="chip"
                plate={false}
                selfExcluded={selfClaimed}
                spoken
              />
            ) : !suggestion.owned && !applied ? (
              // States c5/c6: the $ tag stays in the caption slot, figure-only (handoff
              // call 2) — every owned-cards shelf excludes unowned cards by construction,
              // so the slot can never draw anything but "not owned" here, which the shelf
              // heading already says.
              <BuyTag
                variant="tile"
                plate={false}
                density="collapsed"
                label={addPanelCopy.unowned.tagAria(suggestion.name)}
                price={suggestion.price}
                newestAsOf={newestAsOf}
                provenance={provenance}
              />
            ) : null}
            {/* THE FACT MARKS, then the lemniscate — `STATES-push-line.md` §C2 as amended by
                the consider-tiles handoff, call 3. DRAWN ONLY WHERE THERE ARE MARKS: no tile
                reserves the line, since most candidates carry no fact at all. */}
            {/* NOT `silent`: these marks sit beside the two `CardDetailTrigger` buttons
                rather than nested inside either one, so each keeps its own `role="img"`
                announcement — exactly as the pre-caption mount above the name did. */}
            {marks.map((fact) => (
              <FactTooltip key={fact} fact={fact}>
                <CardFactMark fact={fact} />
              </FactTooltip>
            ))}
            {completesCombo && (
              <FactTooltip sentence={comboAwarenessCopy.markerTooltip.completes(suggestion.comboPartner!.name)}>
                <ComboGlyph />
              </FactTooltip>
            )}
          </>
        }
        name={
          // The second of the tile's three click targets. `CardTileCaption`'s name slot
          // wraps whatever it is given in a non-interactive `<span>`; nesting a `<button>`
          // inside it is valid HTML (button is phrasing content), but that span's own
          // truncation does not reach a block descendant's overflow, so this button carries
          // its own `truncate` rather than depending on the wrapper's.
          <CardDetailTrigger
            oracleId={suggestion.oracleId}
            name={suggestion.name}
            siblings={siblings}
            className="block min-w-0 max-w-full truncate text-left text-[12px] md:text-[13px] font-semibold p-0"
            style={{
              color: applied ? "var(--fg-muted)" : "var(--fg)",
              background: "transparent",
              border: "none",
            }}
          >
            {suggestion.name}
          </CardDetailTrigger>
        }
      />

      {/* THE BODY — secondary line, in-use line, evidence row, lift line, note, Add
          (`STATES-consider-tiles.md`). */}
      <div className="flex flex-col gap-[2px] min-w-0">
        {/* THE SECONDARY LINE. States c8/c9: the combo partner's name alone, `+ {partner}`,
            replaces the type line while the tile completes a combo and is not yet applied;
            the glyph that used to lead this line now lives in the meta line above (call 3).

            ABSENT WHEN THE CARD IS IN THE DECK: `completes` presupposes adding it, and a
            card that is in already completes nothing by being added again. The tile shows
            the type line again there (c9).

            GATED ON `applied`, NOT ON `inDeck`, for the same round-trip reason every other
            atom here is: see `completesCombo` above.

            READ AS TEXT, not aria-hidden: this tile composes no accessible name of its own
            outside the two `CardDetailTrigger`s, so hiding the clause would delete the
            sentence rather than relocate it. The `+` is punctuation, not a word, so it is
            aria-hidden on its own and the sentence is carried by the sr-only clause below it,
            exactly as the retired `ComboClause` mount here did. */}
        {completesCombo ? (
          <p
            data-testid="consider-combo-line"
            className="truncate min-w-0 font-mono text-[10px] md:text-[9.5px]"
            style={{ color: "var(--fg-body)" }}
          >
            <span aria-hidden>+ </span>
            <span aria-hidden>{suggestion.comboPartner!.name}</span>
            <span className="sr-only">{comboClauseSpoken(suggestion.comboPartner!.name, "completes")}</span>
          </p>
        ) : (
          <p
            className="truncate font-mono text-[10px] md:text-[9.5px]"
            style={{ color: applied ? "var(--fg-locked)" : "var(--fg-faint)" }}
          >
            {suggestion.typeLine}
          </p>
        )}
        {/* THE IN-USE LINE. The chip above is count-only (density="chip" forces nameless), so
            this is where the deck gets named (c3/c4, design 6.3/6.4). */}
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

      {/* THE CARD NOTE, in the tile foot above the Add — `HANDOFF.md` §Geometry.
          One fact's sentences at this density, which is the rule's cap and not this
          component's: the tile states the density and `cardNoteSentences` decides what fits.

          READ AS TEXT, not aria-hidden, for the same reason the combo clause above is: this
          tile composes no accessible name of its own — its name is a `CardDetailTrigger`
          carrying the card's name — so hiding the note would delete the sentence rather than
          relocate it, and there is nowhere to relocate it to.

          `inDeck`, NOT `applied`, and this is the one atom on the tile gated the other way.
          The ordinal is `counts + (inDeck ? 0 : 1)`, and `noteCounts` is a SERVER prop: it
          moves in the same render as `inDeck` and not at all when `applied` flips. Gating on
          `applied` makes the number go BACKWARDS for the length of the round trip — a deck
          holding three game changers reads `your 4th`, the press flips `applied` while the
          count is still 3, and the tile says `your 3rd` until revalidation puts it back. A
          figure that decrements when you add a card is worse than one that is briefly a beat
          behind, which is all this is. */}
      <CardNote
        facts={suggestion.facts}
        declared={declaredBracket}
        counts={noteCounts}
        density="tile"
        inDeck={inDeck}
      />

      {/* THE ADD IS PINNED TO THE TILE'S FOOT, `mt-auto`, and that is this feature's own
          regression being fixed rather than a change of design. A tile is a grid item and
          stretches to its row, so before the note every tile's content ended at the same
          height and the Adds lined up at spread 0. A note is 30-odd pixels of extra content
          on one tile in six, and measured on the shipped Consider grid it put the Adds in a
          row **90 to 91px apart** — while the row itself still ends level, which is the
          shipped ruling and is what makes the misalignment inside it read as a mistake.

          `mt-auto` absorbs the free space instead, so every Add sits on the tile's floor
          whether or not the tile above it carries a note. The alternative — reserving the
          note's height on every tile — is the one thing the handoff forbids outright. */}
      {applied ? (
        <span
          aria-disabled="true"
          aria-label={addPanelCopy.tile.inDeckAria(suggestion.name)}
          className="mt-auto block text-center text-[12px] font-semibold rounded-[7px] py-[7px]"
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
          className="mt-auto w-full text-center rounded-[10px] md:rounded-[8px] h-[44px] md:h-[32px] px-[16px] md:px-[14px] text-[14px] md:text-[12.5px] font-medium disabled:opacity-50"
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
