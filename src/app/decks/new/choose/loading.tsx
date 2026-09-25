import { LoadingScreen } from "../../../../components/shell/loading-screen";
import { shellCopy } from "../../../../lib/copy/shell";

// Still: Help me choose draws no motion anywhere (STATES invariant), its loading screen included.
export default function Loading() {
  return <LoadingScreen copy={shellCopy.loading.deckNew} still />;
}
