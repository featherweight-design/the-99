// The review page awaits the draft diff, a claim read and a price read before it
// can paint, so it owns a boundary rather than inheriting one.
//
// Keeps the crown screen's words: `/decks/[id]` above it now draws the deck page's own
// skeleton (`DeckOpenLoading`), which this review page is not shaped like, and the
// boundary exists because this repo asserts one per segment
// (`src/app/route-loading.test.ts`). Words of its own would have to be written by Design first.
import { LoadingScreen } from "../../../../components/shell/loading-screen";
import { shellCopy } from "../../../../lib/copy/shell";

export default function Loading() {
  return <LoadingScreen copy={shellCopy.loading.decks} />;
}
