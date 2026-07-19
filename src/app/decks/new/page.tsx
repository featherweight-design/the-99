// /decks/new — two doors: pre-filled (when ?commander= is valid) or picker.
// §Create — Pre-filled / §Create — Picker
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { cards } from "../../../db/schema";
import { requireUserId } from "../../../lib/auth";
import { isCommanderCandidate } from "../../../lib/recs/score";
import { listOwnedLegalCommanders } from "../../../lib/decks/read";
import { CreatePreFilled } from "../../../components/decks/create-pre-filled";
import { CreatePicker } from "../../../components/decks/create-picker";

export default async function NewDeckPage({
  searchParams,
}: {
  searchParams: Promise<{ commander?: string }>;
}) {
  const userId = await requireUserId();
  const { commander: commanderParam } = await searchParams;

  // Pre-filled door: validate the ?commander= param server-side.
  if (commanderParam) {
    const [row] = await db
      .select()
      .from(cards)
      .where(eq(cards.oracleId, commanderParam));

    if (row && row.commanderLegal && isCommanderCandidate(row)) {
      return (
        <CreatePreFilled
          oracleId={row.oracleId}
          name={row.name}
          typeLine={row.typeLine}
          colorIdentity={row.colorIdentity}
          imageUri={row.imageUri}
        />
      );
    }
  }

  // Picker door: load all owned legal commanders.
  const legalCommanders = await listOwnedLegalCommanders(userId);

  return <CreatePicker legalCommanders={legalCommanders} />;
}
