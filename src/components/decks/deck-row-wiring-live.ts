// The signed-in wiring: the real writes and parts. Mounted by the builder shell, which holds every row that writes (the precon
// and friend deck views draw read-only rows, which write nothing); the landing demo never imports it.

import { addCardToDeck, removeCardFromDeck, setBasicQuantity } from "../../app/decks/actions";
import { OtherWaysPress } from "../social/spare-markers";
import { AutoTag } from "./auto-tag";
import type { DeckRowWiring } from "./deck-row-wiring";

export const LIVE_ROW_WIRING: DeckRowWiring = { removeCard: removeCardFromDeck, setBasicQuantity, addCard: addCardToDeck, AutoTag, OtherWaysPress };
