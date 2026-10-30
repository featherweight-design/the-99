// /decks/import — bring a deck over from a list you already have.
// Ships unlinked: PR 6 adds the entry point on /decks once the flow is coherent
// end to end.
import { requireUserId } from "../../../lib/auth";
import { ImportEntry } from "../../../components/decks/import-entry";

export default async function ImportDeckPage() {
  await requireUserId();
  return <ImportEntry />;
}
