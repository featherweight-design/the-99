import { auth } from "@clerk/nextjs/server";
import { scheduleWishlistSyncAfterAction } from "./wishlist/sync-trigger";

/** The signed-in account's id, or null for a signed-out visitor (a public action that serves both). */
export async function currentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  // Cart on your wishlist: a Server Action brings the synced lines up to date after its response (`sync-trigger.ts`).
  await scheduleWishlistSyncAfterAction(userId);
  return userId;
}
