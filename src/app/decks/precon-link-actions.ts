"use server";

// Link a deck to the precon it was built from, and unlink it (R3 addendum, handoff `HANDOFF-R3 ·
// built-from link.md`). The link is `decks.built_from_precon` and nothing else: linking or
// unlinking never touches a card, printing, version, `since`, note, `committed_at`, status or claim
// (locks 3 to 6). One link per deck (lock 1), so linking a deck linked elsewhere moves it.

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { decks, precons } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { preconsEnabled } from "../../lib/precons/flag";

export async function linkPrecon(deckId: string, fileName: string): Promise<void> {
  if (!preconsEnabled()) throw new Error("precons are off");
  const userId = await requireUserId();
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > 200) throw new Error("precon not found");
  // A Collector's Edition twin links to the plain edition it folds into (lock 1).
  const [head] = await db.select({ fileName: precons.fileName, twinOf: precons.twinOf }).from(precons).where(eq(precons.fileName, fileName));
  if (!head) throw new Error("precon not found");
  await writeLink(userId, deckId, head.twinOf ?? head.fileName);
}

/** Clears the link only while it still names `fileName`, the precon the confirm named: a deck
 *  moved to another precon since the dialog opened keeps its newer link, and the confirm fails. */
export async function unlinkPrecon(deckId: string, fileName: string): Promise<void> {
  if (!preconsEnabled()) throw new Error("precons are off");
  const userId = await requireUserId();
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > 200) throw new Error("precon not found");
  await writeLink(userId, deckId, null, fileName);
}

async function writeLink(userId: string, deckId: string, builtFromPrecon: string | null, expected?: string): Promise<void> {
  if (typeof deckId !== "string" || deckId.length === 0) throw new Error("deck not found");
  // Owner-scoped in the statement itself: a deck that is not the reader's updates nothing.
  const written = await db
    .update(decks)
    .set({ builtFromPrecon })
    .where(and(
      eq(decks.id, deckId),
      eq(decks.userId, userId),
      expected === undefined ? undefined : eq(decks.builtFromPrecon, expected),
    ))
    .returning({ id: decks.id });
  if (written.length === 0) throw new Error("deck not found");
  // Not `revalidateClaims`: no claim moved. The deck's own surfaces, and both precon routes, which
  // name a linked deck as "built from this" (precons PR 6a-2; pattern form for the open precon,
  // which is dynamic).
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  revalidatePath("/decks/precons");
  revalidatePath("/decks/precons/[fileName]", "page");
}
