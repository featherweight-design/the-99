// /decks/new — two doors: pre-filled (when ?commander= is valid) or picker.
// §Create — Pre-filled / §Create — Picker
import { requireUserId } from "../../../lib/auth";
import { loadPreFilledCommander } from "../../../lib/decks/pre-filled-commander";
import { listOwnedLegalCommanders } from "../../../lib/decks/read";
import { parseSelectParam } from "../../../lib/decks/selection-param";
import { CreatePreFilled } from "../../../components/decks/create-pre-filled";
import { CreatePicker } from "../../../components/decks/create-picker";

export default async function NewDeckPage({
  searchParams,
}: {
  searchParams: Promise<{ commander?: string; select?: string | string[] }>;
}) {
  const userId = await requireUserId();
  const { commander: commanderParam, select } = await searchParams;

  // Pre-filled door: validate the ?commander= param server-side, and draw the copy the
  // reader owns. Both live in `loadPreFilledCommander` so they can be tested — a route
  // module cannot be, and reverting the resolution here was invisible to the suite.
  if (commanderParam) {
    const commander = await loadPreFilledCommander(userId, commanderParam);
    if (commander) {
      return (
        <CreatePreFilled
          oracleId={commander.oracleId}
          name={commander.name}
          typeLine={commander.typeLine}
          colorIdentity={commander.colorIdentity}
          imageUri={commander.imageUri}
          // Shape-checked in the loader, legality-checked again in `createDeck`: this
          // page has no commander context until that read resolves, and the action has
          // to re-check whatever it is handed anyway.
          selectedOracleIds={parseSelectParam(select)}
        />
      );
    }
  }

  // Picker door: load all owned legal commanders.
  const legalCommanders = await listOwnedLegalCommanders(userId);

  return <CreatePicker legalCommanders={legalCommanders} />;
}
