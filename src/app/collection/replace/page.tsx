// /collection/replace — three-step Replace flow.
// Step 1 (UploadEntry, this task), step 2 (Task 8 ReviewScreen), step 3
// (Task 9 ConfirmModal) are owned by the ReplaceFlow client component.

import { requireUserId } from "../../../lib/auth";
import { getCollectionStats } from "../../../lib/home/summary";
import { ReplaceFlow } from "../../../components/collection/replace-flow";

// confirmUpload's after() warm scores every commander candidate, which on a cold
// EDHREC cache is ~40 sequential fetch batches. maxDuration on a page also bounds
// the Server Actions invoked from it.
export const maxDuration = 300;

export default async function ReplacePage() {
  const userId = await requireUserId();
  const stats = await getCollectionStats(userId);
  return (
    <section>
      {/* THE HEADING BELONGS TO THE STEP, at both widths, so `ReplaceFlow` draws it. On the
          phone the review has its own `Review import` row and no chevron (first-run redesign
          D11, 5b), so a page-level row above it would be a second header. On desktop, this page
          has two layouts — the entry sits in a 760px column, the review in a 1280px one — and a heading
          rendered here could only be centred to one of them. Pinned left it was 102px out of
          step with the review; centred to the entry's column it would have been 252px out. The
          review draws its own `Review import` title, so nothing is lost by letting it go. */}
      <ReplaceFlow currentCardCount={stats.totalCards} />
    </section>
  );
}
