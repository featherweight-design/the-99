"use client";

import { useRef, useState, type MouseEvent } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckToken } from "../../lib/tokens/read";
import { cardDetailCopy, useCardDetailIfAny, useCardIntentIfAny, type SiblingCard } from "../cards/card-detail-provider";
import { CardTileCaption, TILE_ART_CLIP_SCALED, TILE_ART_RATIO, TILE_FIELD, TILE_SHELL_SCALED } from "../ui/card-tile-caption";
import { Chevron } from "../ui/chevron";
import { CostPips } from "../ui/cost-pips";
import { HydratedImg } from "../ui/hydrated-art";
import { TokenMakers } from "./token-makers";
import { printingLine, tokenFaceDescription, TokenControls, tokenPips, tokenPT, useTokenPress } from "./token-row";

/**
 * A token of the deck in the Card view: the deck's tile anatomy (`TILE_SHELL_SCALED`, the 63:88 art box with its bottom
 * corners clipped, `CardTileCaption`) with the token's own facts, and the same two presses a row carries beneath
 * it (`TokenControls`). The art opens card details, as every deck tile's does (a tile's caption is text, so the
 * name beside it is not a second trigger), the cards that make it unfold under the tile, and a press that fails says so in the tile's own words. Never a verdict word, never a warning
 * color on ownership.
 */
export function TokenTile({
  deckId, token, newestAsOf, siblings,
}: {
  deckId: string; token: DeckToken; newestAsOf: Date | null;
  /** The deck's tokens in the order the group lists them: what card details' Prev/Next page through. */
  siblings?: readonly SiblingCard[];
}) {
  const [open, setOpen] = useState(false);
  const { press, pending, refused } = useTokenPress();
  const detail = useCardDetailIfAny();
  const intent = useCardIntentIfAny(token.oracleId);
  const artRef = useRef<HTMLButtonElement>(null);
  const canOpen = token.makers.length > 0;
  const first = token.makers[0];
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
      <div className={`${TILE_SHELL_SCALED} relative bg-[color:var(--surface)] [border:1px_solid_var(--border)] transition-colors md:hover:[border:1px_solid_var(--border-strong)]`}>
        {detail ? (
          <button
            ref={artRef}
            type="button"
            {...intent}
            onClick={openDetails}
            // What a press does: the card's details. The makers fold below carries `toggleAria`, so no two
            // controls share a name.
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
      </div>

      {/* What tells this token from another of its name, colors and P/T in the deck (only attached then), as a row draws it. */}
      {token.oracleText ? (
        <p className="m-0 px-[2px] pt-[6px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{token.oracleText}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-[10px] px-[2px] pt-[4px]">
        <TokenControls deckId={deckId} token={token} press={press} pending={pending} />
      </div>
      {canOpen ? (
        <button
          type="button"
          aria-expanded={open}
          aria-label={tokensCopy.row.toggleAria(token.name, token.makers.length)}
          aria-describedby={`token-${token.oracleId}-face`}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[44px] items-center gap-[6px] px-[2px] text-left font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)] md:min-h-[28px]"
        >
          <span className="min-w-0 truncate">{tokensCopy.row.from(first.name, token.makers.length)}</span>
          <Chevron open={open} className="flex-none text-[color:var(--fg-muted)]" />
        </button>
      ) : (
        <p className="m-0 px-[2px] py-[6px] font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{tokensCopy.row.noMaker}</p>
      )}
      {refused ? (
        <p role="alert" className="m-0 px-[2px] font-mono text-[10.5px] text-[color:var(--fg-locked)]">{tokensCopy.row.refused}</p>
      ) : null}
      {open && canOpen ? <TokenMakers makers={token.makers} printingLine={printingLine(token, newestAsOf)} layout="tile" /> : null}
    </li>
  );
}
