"use server";

import { revalidatePath } from "next/cache";

export async function retryDeck(deckId: string): Promise<void> {
  revalidatePath(`/decks/${deckId}`);
}
