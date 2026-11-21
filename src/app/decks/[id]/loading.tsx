import { DeckOpenLoading } from "../../../components/decks/deck-open-loading";

// The deck page's own loading screen: the page's shape, so a flip or an open keeps the header, the strip and the place in
// the list instead of dropping to the crown. The deck's sub-routes (`changes`, `import`) and precons keep their own.
export default function Loading() {
  return <DeckOpenLoading />;
}
