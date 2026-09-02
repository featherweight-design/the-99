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
    // Page header — §Page Title "Replace collection" desktop / mobile back-chevron header
    <section>
      <div className="md:hidden flex items-center gap-[12px] p-[20px_18px_14px]" style={{ borderBottom: "1px solid var(--border)" }}>
        <a href="/collection" aria-label="Back to Collection" className="text-[20px] text-[color:var(--accent)]">‹</a>
        <h1 className="font-display font-semibold text-[19px]" style={{ color: "var(--fg)" }}>Replace collection</h1>
      </div>
      <div className="hidden md:block md:p-[28px_34px_0]">
        <a href="/collection" className="font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">‹ Collection</a>
        <h1 className="font-display font-bold text-[30px] mt-[8px]" style={{ color: "var(--fg)" }}>Replace collection</h1>
      </div>
      <ReplaceFlow currentCardCount={stats.totalCards} />
    </section>
  );
}
