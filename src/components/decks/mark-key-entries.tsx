// The decklist's mark key entries: which marks a view's rows or tiles draw, and the word each is glossed with. Moved out of
// `decklist.tsx` (landing demo 5l) so the demo draws the SAME key from the same rule: `decklist.tsx` re-exports it, so every
// existing caller and test is unchanged. Props in, entries out: no hook, no action, no provider.

import type { DeckDetailCard } from "../../lib/decks/grouping";
import { isBasicLand } from "../../lib/decks/grouping";
import { isShoppingCard, isSpokenFor } from "../../lib/decks/shopping";
import { cardTileCopy } from "../../lib/copy/card-surfaces";
import { CARD_FACTS, cardFactName } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { foilMarkCopy } from "../../lib/copy/foil-mark";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { proxyCopy } from "../../lib/copy/proxies";
import { deckRowTag } from "../../lib/decks/row-tag";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboGlyph } from "../cards/combo-glyph";
import { FoilMark } from "../cards/foil-mark";
import { BuyTag } from "./buy-tag";
import { LockMark } from "./lock-mark";
import type { MarkKeyEntry } from "./mark-key";
import { ProxyTag } from "./proxy-tag";

/**
 * The key's entries for a decklist view — EXPORTED so the composition rule is testable
 * against the shipped function rather than a copy of it. A test that rebuilt these
 * entries itself would stay green with the rule deleted, which is exactly what the first
 * version of its test did.
 */
export function buildMarkKeyEntries({
  cards,
  filter,
  inCardView,
  commanderRows = [],
  shoppingKeyDraws = false,
  assumeLocked = false,
}: {
  cards: DeckDetailCard[];
  filter: string;
  inCardView: boolean;
  /** The commanders' Shopping rows (`commanderShoppingRows`), glossed under Shopping alone. */
  commanderRows?: DeckDetailCard[];
  /** `ShoppingKey` is drawn above the list (I got it on). It decodes the buy mark itself, so under
   *  Shopping, where every row carries it, this key does not say `to buy` a second time (Hugh, 2026-10-11). */
  shoppingKeyDraws?: boolean;
  /** Draw the `locked` entry as though a card were locked: the key as it will read after the first lock, so the
   *  slot it shares with the Lock cards line can hold that room before it is needed. */
  assumeLocked?: boolean;
}): MarkKeyEntry[] {
    const shown = filter === "shopping"
      ? [...commanderRows, ...cards].filter(isShoppingCard)
      : cards;
    const entries: MarkKeyEntry[] = [];
    if (!(shoppingKeyDraws && filter === "shopping") && shown.some((c) => deckRowTag(c, filter === "shopping" && isSpokenFor(c)) === "buy")) {
      entries.push({
        id: "buy",
        // The word the surface beneath it already speaks. The tile's `$` carries
        // `cardTileCopy.slotUnownedAria`; the row's carries the shop. The SAMPLE
        // is the row variant on both, unchanged — the key's own box is not the
        // caption's, and nothing here redraws it.
        sample: <BuyTag variant="row" density="collapsed" price={null} />,
        word: inCardView ? cardTileCopy.slotUnownedAria : proxyCopy.key.buy,
      });
    }
    if (shown.some((c) => c.proxied)) {
      entries.push({ id: "proxy", sample: <ProxyTag variant="row" />, word: proxyCopy.key.proxy });
    }
    // Locked, conditional like `buy` and `proxy`: it describes the rows or tiles below, both of
    // which draw the closed lock (the tile's on its meta line since Locked PR 4b).
    if (assumeLocked || shown.some((c) => c.locked)) {
      entries.push({ id: "locked", sample: <LockMark />, word: lockedCardsCopy.mark.key });
    }
    // THE FACT ENTRIES FOLLOW THE CARDS, exactly as `buy` and `proxy` do.
    //
    // The handoff asked for all five always, and its reason — "a player scanning for Game
    // Changers needs the entry to be there BEFORE they find one" — is sound on a surface
    // whose contents stream in. /collection is that surface: a paged, filtered window on
    // thousands of cards, where "no Game Changer on this page" is not "none in your
    // collection", so `CollectionMarkKey` stays unconditional.
    //
    // A DECK IS A CLOSED SET. All 100 cards are here, so absence is knowable and total —
    // there is no later card to find. An entry for a fact the deck does not hold stops
    // being a decoder and becomes a claim, which is how a deck with one extra-turns card
    // came to advertise all three. Reported 2026-09-19.
    //
    // Computed over `shown` rather than `cards`, so the key glosses the rows the reader is
    // actually looking at — the same set `buy` and `proxy` are decided on.
    //
    // IN CARD VIEW TOO. An earlier version suppressed them there, on the reasoning that the
    // tiles drew no mark so glossing three glyphs would teach marks the reader cannot find.
    // The premise was true and the conclusion was backwards: Card view is a surface that
    // shows cards, so the fix was to draw the mark on the tile rather than to remove the
    // words. Suppressing the key made Card view the one place a reader met neither.
    // THE FOIL GLINT, one entry for foil and etched (foil mark addendum, R4), by the same rule the cards in view
    // follow: a deck is a closed set, so the entry says what a tile or row below draws, and is absent when none does. A
    // list row draws it under the dot (the two-line row) except a basic land's stepper row, which has no second line.
    if (shown.some((c) => c.imageUri && c.foil && (inCardView || !isBasicLand(c.typeLine)))) {
      entries.push({ id: "foil", sample: <FoilMark finish="foil" silent />, word: foilMarkCopy.key });
    }
    for (const fact of CARD_FACTS) {
      if (!shown.some((c) => c.facts?.includes(fact))) continue;
      entries.push({
        id: fact,
        sample: <CardFactMark fact={fact} silent />,
        word: cardFactName(fact),
      });
    }
    // THE COMBO MARK (single-line row PR 2), after the facts as on /collection's key, and by the
    // same closed-set rule: present only when a row in view names an in-deck partner. List rows
    // draw it; the Card view tile does not, so neither does that view's key.
    if (!inCardView && shown.some((c) => c.comboPartner)) {
      entries.push({ id: "combo", sample: <ComboGlyph />, word: comboAwarenessCopy.keyWord });
    }
    return entries;
}
