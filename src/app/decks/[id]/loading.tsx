import { LoadingScreen } from "../../../components/shell/loading-screen";
import { shellCopy } from "../../../lib/copy/shell";

export default function Loading() {
  return <LoadingScreen copy={shellCopy.loading.decks} />;
}
