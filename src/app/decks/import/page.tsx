// /decks/import — bring a deck over from a list you already have.
// Ships unlinked: PR 6 adds the entry point on /decks once the flow is coherent
// end to end.
import { requireUserId } from "../../../lib/auth";
import { noCollectionEntryEnabled } from "../../../lib/collection/edit-flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { ImportEntry } from "../../../components/decks/import-entry";

export default async function ImportDeckPage() {
  const userId = await requireUserId();
  // The reader's resolved switches: `I own these cards` (no-collection entry S8) shows at any collection size.
  const env = await requestSwitchEnv(userId);
  return <ImportEntry canOwn={noCollectionEntryEnabled(env)} />;
}
