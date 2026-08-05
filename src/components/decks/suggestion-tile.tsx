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
import { CardDetailTrigger } from "./card-detail-provider";
import { MutationError } from "./mutation-error";
import { useAddOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

// "{2}{U}{B}" → ["2", "U", "B"]. Hybrid and Phyrexian symbols come back whole
// ("U/B", "G/P") and fall through to the generic pip, which is why the cost is
// carried as Scryfall's string rather than reconstructed from the mana value.
function parseManaCost(cost: string): string[] {
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

function CostPips({ cost }: { cost: string }) {
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;
  return (
    <span aria-hidden className="absolute left-[6px] bottom-[6px] flex gap-[3px]">
      {symbols.map((sym, i) => {
        const wubrg = /^[WUBRG]$/.test(sym);
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-full w-[14px] h-[14px] font-mono text-[9px] font-semibold"
            style={{
              background: wubrg ? WUBRG_HEX[sym] : "var(--fg-faint)",
              color: "var(--bg)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.45)",
            }}
          >
            {wubrg ? "" : sym}
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
    const text = suggestion.reasonType === "role"
      ? addPanelCopy.tile.fillsRole(addPanelCopy.shelf.labels[suggestion.role === "other" ? "other" : suggestion.role].toLowerCase())
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
      className="group flex flex-col gap-[8px] rounded-[10px] p-[9px] pb-[10px] transition-colors"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: noArt ? 0.55 : 1,
      }}
    >
      <CardDetailTrigger
        oracleId={suggestion.oracleId}
        name={suggestion.name}
        siblings={siblings}
        className="relative block w-full overflow-hidden rounded-[7px] p-0"
        style={{
          aspectRatio: "63 / 88",
          border: "none",
          background: noArt
            ? "linear-gradient(158deg, #3A3229 0%, #241F19 62%, #161311 100%)"
            : `center / cover no-repeat url(${suggestion.imageUri})`,
          filter: applied ? "grayscale(.6)" : undefined,
          opacity: applied ? 0.5 : undefined,
          boxShadow: applied || noArt
            ? "inset 0 0 0 1px rgba(0,0,0,.3)"
            : "inset 0 -26px 30px -22px rgba(0,0,0,.65), inset 0 0 0 1px rgba(0,0,0,.3)",
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
            {/* Every Consider suggestion is owned, and an added tile drops the
                dot rather than claiming two states at once. */}
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
          className="block w-full text-left text-[13px] md:text-[12.5px] font-semibold leading-[1.25] p-0"
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
