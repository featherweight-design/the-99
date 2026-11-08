// /decks/import — bring a deck over from a list you already have.
// Ships unlinked: PR 6 adds the entry point on /decks once the flow is coherent
// end to end.
import { requireUserId } from "../../../lib/auth";
import { ImportEntry } from "../../../components/decks/import-entry";

export default async function ImportDeckPage({ searchParams }: { searchParams: Promise<{ own?: string | string[] }> }) {
  await requireUserId();
  const { own } = await searchParams;
  // The first run's Import a deck passes `?own=1`: an empty collection means the deck is most likely cards they have
  // (landing PR 7b). Every other way here keeps the shipped default, unticked.
  return <ImportEntry ownDefault={own === "1"} />;
}
