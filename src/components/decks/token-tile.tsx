"use client";

import { useRef, type MouseEvent } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckToken } from "../../lib/tokens/read";
import { cardDetailCopy, useCardDetailIfAny, useCardIntentIfAny, type SiblingCard } from "../cards/card-detail-provider";
import { CardTileCaption, TILE_ART_CLIP_SCALED, TILE_ART_RATIO, TILE_FIELD, TILE_SHELL_SCALED } from "../ui/card-tile-caption";
import { CostPips } from "../ui/cost-pips";
import { HydratedImg } from "../ui/hydrated-art";
import { tokenFaceDescription, tokenPips, tokenPT, useTokenPress } from "./token-row";
import { setTokenJoined } from "../../app/decks/token-actions";

/**
 * A token of the deck in the Card view: the deck's tile anatomy (`TILE_SHELL_SCALED`, the 63:88 art box with its bottom
 * corners clipped, `CardTileCaption`) with the token's own facts, and ONE foot line inside the frame behind a hairline
 * (small-polish handoff §5): the Shopping press, or the ownership word. A token tile is that one line taller than a card
 * tile and no more. The art opens card details, as every deck tile's does, and the details are where the makers and
 * `I have one` live (`TokenDeckBox`). A press that fails is a deck toast (`useTokenPress`). Never a verdict word, never a
 * warning color on ownership.
 */
export function TokenTile({
  deckId, token, siblings,
}: {
  deckId: string; token: DeckToken;
  /** The deck's tokens in the order the group lists them: what card details' Prev/Next page through. */
  siblings?: readonly SiblingCard[];
}) {
  const { press, pending, toast } = useTokenPress();
  const detail = useCardDetailIfAny();
  const intent = useCardIntentIfAny(token.oracleId);
  const artRef = useRef<HTMLButtonElement>(null);
  const openDetails = (e: MouseEvent<HTMLElement>) => {
    detail?.open(token.oracleId, siblings, undefined, { opener: artRef.current ?? e.currentTarget });
  };
  const art = token.picture?.imageUri ? (
    <HydratedImg src={token.picture.imageUri} decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
  ) : (
    <span className="flex h-full items-center justify-center text-center font-mono text-[9px] leading-[1.4]" style={{ color: "var(--fg-locked)" }}>
      {addPanelCopy.tile.noArt}
    </span>
  );
  const artClass = `relative block w-full overflow-hidden ${TILE_ART_CLIP_SCALED}`;
  const artStyle = { aspectRatio: TILE_ART_RATIO, background: "var(--surface-sunken)" };

  return (
    <li className={`flex min-w-0 flex-col ${TILE_FIELD}`} data-token-tile data-token-state={token.state}>
      <span id={`token-${token.oracleId}-face`} className="sr-only">{tokenFaceDescription(token)}</span>
      <div data-token-frame className={`${TILE_SHELL_SCALED} relative flex-1 bg-[color:var(--surface)] [border:1px_solid_var(--border)] transition-colors md:hover:[border:1px_solid_var(--border-strong)]`}>
        {detail ? (
          <button
            ref={artRef}
            type="button"
            {...intent}
            onClick={openDetails}
            // What a press does: the card's details, where the cards that make it and `I have one` are.
            aria-label={cardDetailCopy.triggerAria(token.name)}
            aria-describedby={`token-${token.oracleId}-face`}
            className={`${artClass} cursor-pointer`}
            style={artStyle}
          >
            {art}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]" />
          </button>
        ) : (
          <span className={artClass} style={artStyle}>{art}</span>
        )}
        <CardTileCaption
          meta={
            <>
              <span
                aria-hidden
                data-token-dot={token.state}
                className="h-[8px] w-[8px] flex-none rounded-full"
                style={
                  token.state === "owned"
                    ? { background: "var(--success)" }
                    : token.state === "not"
                      ? { border: "1px dashed var(--fg-faint)" }
                      : undefined
                }
              />
              <CostPips cost={tokenPips(token.colors)} size={12} spoken />
            </>
          }
          name={token.name}
          nameSub={tokensCopy.row.type(token.typeLine, tokenPT(token))}
        />
        {/* What tells this token from another of its name, colors and P/T in the deck (only attached then), inside the frame. */}
        {token.oracleText ? (
          <p className="m-0 line-clamp-3 px-[10px] pb-[8px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{token.oracleText}</p>
        ) : null}
        <TokenFoot deckId={deckId} token={token} press={press} pending={pending} />
      </div>
      {toast}
    </li>
  );
}

const FOOT = "mt-auto border-x-0 border-b-0 border-t-[1px] border-solid border-t-[color:var(--border)]";
/** An ownership fact drawn as a word, not a press: 44 tall on a phone, 30 from md up. */
const FOOT_WORD = `${FOOT} flex min-h-[44px] items-center px-[10px] font-mono text-[10.5px] md:min-h-[30px]`;

/**
 * The one line under the caption: `Add to Shopping`, `✓ In Shopping`, `in your collection` or `✓ I have one`. The
 * Shopping press is the tile's alone (a card's tile has the one tag); the hand mark, and unmarking it, is in the token's
 * details. A token an upload or a precon holds, or one held by hand, offers no Shopping press: owned means owned for every deck.
 */
function TokenFoot({ deckId, token, press, pending }: {
  deckId: string; token: DeckToken; press: ReturnType<typeof useTokenPress>["press"]; pending: boolean;
}) {
  if (token.state === "owned") {
    const byHand = token.source === "manual";
    return <span className={`${FOOT_WORD} text-[color:var(--fg-muted)]`} data-token-foot="owned">{byHand ? tokensCopy.row.haveOn : tokensCopy.row.owned}</span>;
  }
  return (
    <div className={`${FOOT} p-[6px_8px] md:p-[3px_8px]`} data-token-foot="shopping">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        aria-describedby={`token-${token.oracleId}-face`}
        aria-pressed={token.joined}
        aria-label={token.joined ? tokensCopy.row.leaveAria(token.name) : tokensCopy.row.joinAria(token.name)}
        onClick={() => press(() => setTokenJoined(deckId, token.oracleId, !token.joined), token)}
        // 32 tall with a 44 hit area on a phone (the pseudo-element), 24 from md up, the width of the tile.
        className={`relative h-[32px] w-full rounded-[6px] border text-[12px] font-medium disabled:opacity-60 max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-[6px] max-md:after:content-[''] md:h-[24px] ${
          token.joined
            ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color:var(--fg)]"
            : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
        }`}
      >
        {token.joined ? tokensCopy.row.joined : tokensCopy.row.join}
      </button>
    </div>
  );
}
