// /collection/replace — three-step Replace flow.
// Step 1 (UploadEntry, this task), step 2 (Task 8 ReviewScreen), step 3
// (Task 9 ConfirmModal) are owned by the ReplaceFlow client component.

import { requireUserId } from "../../../lib/auth";
import { getCollectionStats } from "../../../lib/home/summary";
import { collectionEditEnabled, collectionSyncEnabled } from "../../../lib/collection/edit-flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { ReplaceFlow } from "../../../components/collection/replace-flow";
import { readSyncBase } from "../../../lib/collection/sync-base";
import { pageLanding } from "../../../lib/discovery/page-landing";
import { TOOL_PARAM } from "../../../lib/discovery/tool-param";
import { ToolLandingMount } from "../../../components/discovery/tool-landing-mount";

// confirmUpload's after() warm scores every commander candidate, which on a cold
// EDHREC cache is ~40 sequential fetch batches. maxDuration on a page also bounds
// the Server Actions invoked from it.
export const maxDuration = 300;

export default async function ReplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  const [stats, env] = await Promise.all([getCollectionStats(userId), requestSwitchEnv(userId)]);
  const deckCheck = collectionEditEnabled(env);
  const sync = collectionSyncEnabled(env);
  // Whether Sync has an anchor to merge against. An empty collection skips the choice as a first import only
  // when it has none (`isFirstImport`): a player who emptied it by hand can still Sync. Read only with Sync on.
  const syncAnchored = sync && "anchor" in (await readSyncBase(userId));
  // Try it's landing (discovery R2·3, G14): `?tool=collection-sync` haloes the drop zone; anything else is stripped.
  const { landing, request } = pageLanding((await searchParams)[TOOL_PARAM], env, "collection-sync");
  return (
    // A flex column that takes `main`'s height, so a step that fills the screen (the choice,
    // whose action bar sits at the foot) can grow into it with `flex-1` rather than guessing the
    // chrome's height. A step drawn shorter than the screen is unchanged.
    <section className="flex flex-1 flex-col">
      <ToolLandingMount landing={landing} request={request} />
      {/* THE HEADING BELONGS TO THE STEP, at both widths, so `ReplaceFlow` draws it. On the
          phone the review has its own `Review import` row and no chevron (first-run redesign
          D11, 5b), so a page-level row above it would be a second header. On desktop, this page
          has two layouts — the entry sits in a 760px column, the review in a 1280px one — and a heading
          rendered here could only be centred to one of them. Pinned left it was 102px out of
          step with the review; centred to the entry's column it would have been 252px out. The
          review draws its own `Review import` title, so nothing is lost by letting it go. */}
      <ReplaceFlow currentCardCount={stats.totalCards} deckCheck={deckCheck} sync={sync} syncAnchored={syncAnchored} />
    </section>
  );
}
