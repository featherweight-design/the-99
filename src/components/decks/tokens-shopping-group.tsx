"use client";

import { setTokenHeld, setTokenJoined } from "../../app/decks/token-actions";
import type { DeckToken } from "../../lib/tokens/read";
import { tokenShopping } from "../../lib/tokens/shopping";
import { useDeckTokens } from "./deck-tokens-context";
import { useTokenPress } from "./token-row";
import { TokenShoppingRowView, TokensShoppingFrame } from "./tokens-shopping-view";

function TokenShoppingRow({ deckId, token, newestAsOf }: { deckId: string; token: DeckToken; newestAsOf: Date | null }) {
  const { press, pending, toast } = useTokenPress();
  return (
    <TokenShoppingRowView
      token={token}
      newestAsOf={newestAsOf}
      pending={pending}
      // One press marks the token held and takes it off every deck's list in one write, with no confirm (Hugh, 2026-10-11).
      onHave={() => press(() => setTokenHeld(deckId, token.oracleId, true), token)}
      onRemove={() => press(() => setTokenJoined(deckId, token.oracleId, false), token)}
      toast={toast}
    />
  );
}

/**
 * The tokens joined to this deck, last on its Shopping view. They are not the deck: the header says so, and
 * nothing here moves a card count, a price total, the status or the roll-up. Draws nothing without a provider
 * or with nothing joined.
 */
export function TokensShoppingGroup() {
  const ctx = useDeckTokens();
  const shopping = tokenShopping(ctx?.read);
  if (!ctx || ctx.read.status !== "ok" || !shopping) return null;
  return (
    <TokensShoppingFrame count={shopping.rows.length}>
      {shopping.rows.map((t) => (
        <TokenShoppingRow key={t.oracleId} deckId={ctx.deckId} token={t} newestAsOf={ctx.read.status === "ok" ? ctx.read.newestPriceAsOf : null} />
      ))}
    </TokensShoppingFrame>
  );
}
