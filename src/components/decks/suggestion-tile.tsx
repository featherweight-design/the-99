"use client";
// SuggestionTile — the Consider view's unit, per design table §4 and §4a–4h.
//
// Three click targets and no more: the art, the name, and Add. The role the
// card was suggested for is never printed here — it is the shelf heading above,
// so a tile in the Ramp shelf does not say "ramp" a second time.

import type { DeckSuggestion } from "../../lib/decks/suggest";
import { addCardToDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { shelfRoleOf } from "../../lib/decks/suggest";
import { CardDetailTrigger } from "./card-detail-provider";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

// "{2}{U}{B}" → ["2", "U", "B"]. Hybrid and Phyrexian symbols come back whole
// ("U/B", "G/P") and CostPips draws their colours, which is why the cost is
// carried as Scryfall's string rather than reconstructed from the mana value.
function parseManaCost(cost: string): string[] {
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

export function CostPips({ cost, className }: { cost: string; className?: string }) {
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;
  return (
    <span
      aria-hidden
      className={className ?? "absolute left-[6px] bottom-[6px] flex gap-[3px]"}
    >
      {symbols.map((sym, i) => {
        // "U/B" and "G/P" carry their colours in the halves, so a pip draws
        // them rather than printing them: three characters in a 14px circle
        // clamp to noise. Two colours split the pip and one fills it. The
        // numeral is drawn whenever the symbol has one, so two-brid "2/W" is a
        // white pip reading 2 rather than a white pip claiming to be free.
        const parts = sym.split("/");
        const colours = parts.filter((p) => /^[WUBRG]$/.test(p));
        const numeral = parts.find((p) => /^\d+$/.test(p));
        const background = colours.length >= 2
          ? `linear-gradient(135deg, ${WUBRG_HEX[colours[0]]} 50%, ${WUBRG_HEX[colours[1]]} 50%)`
          : colours.length === 1
            ? WUBRG_HEX[colours[0]]
            : "var(--fg-faint)";
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-full w-[14px] h-[14px] font-mono text-[9px] font-semibold"
            style={{
              background,
              color: "var(--bg)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.45)",
            }}
          >
            {colours.length > 0 ? (numeral ?? "") : sym}
          </span>
        );
      })}
    </span>
  );
}

// The bar is decoration for a figure that is always present as text, so a card
// with no EDHREC percentage gets a sentence instead — never a 0%-wide bar,
// which reads as "no deck runs this" rather than "we don't know".
function Evidence({
  suggestion, inDeck, commanderShortName,
}: { suggestion: DeckSuggestion; inDeck: boolean; commanderShortName: string }) {
  const { inclusionPct, lift } = suggestion;
  if (inclusionPct == null) {
    // The slot the card was picked for, never the card's own role — the two
    // diverge on a multi-role card, and the sentence is about why it is here.
    const text = suggestion.reasonType === "role"
      ? addPanelCopy.tile.fillsRole(addPanelCopy.shelf.labels[shelfRoleOf(suggestion)].toLowerCase())
      : addPanelCopy.tile.noInclusion;
    return <p className="font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>{text}</p>;
  }
  const pct = String(Math.round(inclusionPct));
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex items-center gap-[6px]">
        <span
          aria-hidden
          className="flex-1 h-[4px] rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, inclusionPct))}%`,
              background: inDeck ? "var(--brass-shadow)" : "var(--brass)",
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
      {lift != null && (
        <p className="font-mono text-[9.5px]" style={{ color: "var(--brass-shadow)" }}>
          {/* EDHREC hands synergy back as a fraction; the tile states it in points. */}
          {`+${Math.round(lift * 100)} pts vs. average`}
        </p>
      )}
    </div>
  );
}

interface SuggestionTileProps {
  suggestion: DeckSuggestion;
  deckId: string;
  /** The server's decklist, never the optimistic one — see builder-shell.tsx:67. */
  inDeck: boolean;
  /** The shelf's ordered ids, so the modal's Prev/Next pages this role group. */
  siblings: string[];
  commanderShortName: string;
}

export function SuggestionTile({
  suggestion, deckId, inDeck, siblings, commanderShortName,
}: SuggestionTileProps) {
  const { applied, isPending, error, run } = useDeckMutation(inDeck, DECK_ADD_FALLBACK_MESSAGE);
  const addOptimisticCard = useAddOptimisticCard();
  const noArt = suggestion.imageUri === null;

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
      <CardDetailTrigger
        oracleId={suggestion.oracleId}
        name={suggestion.name}
        siblings={siblings}
        className={`relative block w-full overflow-hidden rounded-[7px] p-0 border-none transition-shadow ${
          // The shadows are classes rather than an inline style so the hover
          // variant can win: an inline boxShadow outranks group-hover:.
          applied || noArt
            ? "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]"
            : "shadow-[inset_0_-26px_30px_-22px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_0_-26px_30px_-22px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(201,162,75,0.35)]"
        }`}
        style={{
          aspectRatio: "63 / 88",
          background: noArt
            ? "linear-gradient(158deg, #3A3229 0%, #241F19 62%, #161311 100%)"
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
                  background: "linear-gradient(180deg, transparent, rgba(10,8,6,.85))",
                  color: "var(--brass)",
                }}
              >
                {addPanelCopy.tile.detailHint}
              </span>
            )}
            {/* Most suggestions are owned, but getDeckSuggestions appends a few
                unowned EDHREC staples, which today read as an absent dot. The
                handoff has no unowned tile variant; #176 asks Design for one.
                An added tile drops the dot rather than claiming two states. */}
            {suggestion.owned && !applied && (
              <span
                aria-hidden
                className="absolute right-[6px] top-[6px] w-[8px] h-[8px] rounded-full"
                style={{ background: "var(--success)", boxShadow: "0 0 0 2px rgba(10,8,6,.7)" }}
              />
            )}
            {suggestion.manaCost && <CostPips cost={suggestion.manaCost} />}
          </>
        )}
      </CardDetailTrigger>

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
      </div>

      <Evidence
        suggestion={suggestion}
        inDeck={applied}
        commanderShortName={commanderShortName}
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
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending}
          aria-label={addPanelCopy.tile.addAria(suggestion.name)}
          className="w-full rounded-[8px] md:rounded-[7px] h-[44px] md:h-auto md:py-[7px] text-[14px] md:text-[12px] font-semibold cursor-pointer disabled:opacity-50 border-none bg-brass text-bg hover:bg-brass-hover"
        >
          {addPanelCopy.tile.add}
        </button>
      )}

      {error && <MutationError message={error} />}
    </li>
  );
}
