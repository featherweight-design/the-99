// The review page awaits the draft diff, a claim read and a price read before it
// can paint, so it owns a boundary rather than inheriting one.
//
// Deliberately the same words as `/decks/[id]` above it: the reader is waiting on
// the same deck being read, and the boundary exists because this repo asserts one
// per segment (`src/app/route-loading.test.ts`), not because the sentence should
// differ. Words of its own would have to be written by Design first.
import { LoadingScreen } from "../../../../components/shell/loading-screen";
import { shellCopy } from "../../../../lib/copy/shell";

export default function Loading() {
  return <LoadingScreen copy={shellCopy.loading.decks} />;
}
