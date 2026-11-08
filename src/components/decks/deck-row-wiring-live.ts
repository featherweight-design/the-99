// The signed-in wiring: the real writes and parts. Mounted by every page that edits or reads the reader's own deck
// (`builder-shell`, the precon view, the friend deck view); the landing demo never imports it.

import { addCardToDeck, removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import { OtherWaysPress } from "../social/spare-markers";
import { AutoTag } from "./auto-tag";
import type { DeckRowWiring } from "./deck-row-wiring";

export const LIVE_ROW_WIRING: DeckRowWiring = { removeCard: removeCardFromDeck, setBasicQuantity, addCard: addCardToDeck, AutoTag, OtherWaysPress };
