// The version rail awaits every version's cards, their games and their
// commanders' names before it can paint, so it owns a boundary rather than
// inheriting one.
//
// Deliberately the same words as `/decks/[id]` above it, exactly as the sibling
// `changes/` boundary is: the reader is waiting on the same deck being read, and
// the boundary exists because this repo asserts one per segment
// (`src/app/route-loading.test.ts`). Words of its own would have to be written
// by Design first.
//
// `still` is the one thing it does not share with its siblings: READINESS 19
// forbids motion on the version rail, and a pulsing crown is motion the reader
// sees on the way to it.
import { LoadingScreen } from "../../../../components/shell/loading-screen";
import { shellCopy } from "../../../../lib/copy/shell";

export default function Loading() {
  return <LoadingScreen copy={shellCopy.loading.decks} still />;
}
