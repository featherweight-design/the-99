// The signed-in wiring: the real writes and parts. Mounted by the builder shell, which holds every row that writes (the precon
// and friend deck views draw read-only rows, which write nothing); the landing demo never imports it.
//
// Each member is read when a row USES it, not when this object is built, as the row's own imports were: a module that only
// loads this object (the shell, a test that mocks half the actions) must not touch a member nothing calls.

import { searchDescriptionCards } from "../cards/description-tag-search";
import { addCardToDeck, removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import { OtherWaysPress } from "../social/spare-markers";
import { AutoTag } from "./auto-tag";
import type { DeckRowWiring } from "./deck-row-wiring";

export const LIVE_ROW_WIRING: DeckRowWiring = {
  get removeCard() { return removeCardFromDeck; },
  get setBasicQuantity() { return setBasicQuantity; },
  get addCard() { return addCardToDeck; },
  get searchDescriptionCards() { return searchDescriptionCards; },
  get AutoTag() { return AutoTag; },
  get OtherWaysPress() { return OtherWaysPress; },
};
