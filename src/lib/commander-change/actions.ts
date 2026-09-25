"use server";

// The commander write as a Server Action (plan decision 6). The transaction is `write.ts`'s.

import { after } from "next/server";
import { db } from "../../db";
import { requireUserId } from "../auth";
import { revalidateUserLists } from "../cache/user-lists";
import { revalidateClaims } from "../decks/revalidate-claims";
import { changeCommanderEnabled } from "./flag";
import type { CommanderPair } from "./pending";
import { writeCommanderChange, type ChangeCommanderResult } from "./write";

export async function changeCommander(deckId: string, to: CommanderPair): Promise<ChangeCommanderResult> {
  if (!changeCommanderEnabled()) return { ok: false, reason: "unavailable" };
  const userId = await requireUserId();
  const result = await db.transaction((tx) => writeCommanderChange(tx, deckId, userId, to));
  // After the response: a Server Action that revalidates during its run re-renders its caller's
  // route into the reply.
  if (result.ok) {
    after(() => {
      revalidateClaims(deckId, userId);
      revalidateUserLists(userId);
    });
  }
  return result;
}
