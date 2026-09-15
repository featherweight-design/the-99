import { LoadingScreen } from "../../../../../components/shell/loading-screen";
import { shellCopy } from "../../../../../lib/copy/shell";

// The same screen `/collection/replace` shows. This route reads the stored receipt and then a
// live claim query for its contested rows, so it has a wait worth covering — and
// `route-loading.test.ts` requires one of every segment that owns a page.
export default function Loading() {
  return <LoadingScreen copy={shellCopy.loading.collection} />;
}
