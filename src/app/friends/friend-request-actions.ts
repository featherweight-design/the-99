"use server";

// Accept, Decline and Decline's Put back on a friend request in Waiting on you (friend links R1, F1 to F4, H2). The reader
// comes from the session; the requester is named by public id and resolved on a request naming the reader as its owner.

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";
import { answerFriendRequest, undoDecline } from "../../lib/social/friend-requests";

/** Accept or Decline. False: nothing was waiting (answered elsewhere, withdrawn, or the switch is off). */
export async function answerFriendRequestAction(requesterPublicId: unknown, answer: "accept" | "decline"): Promise<boolean> {
  const userId = await requireUserId();
  if (answer !== "accept" && answer !== "decline") return false;
  const done = await answerFriendRequest(userId, requesterPublicId, answer, await requestFlags(userId));
  // A new friend shows on /friends and Home; a decline only leaves the list.
  if (done) {
    revalidatePath("/friends");
    if (answer === "accept") revalidatePath("/");
  }
  return done;
}

/** Put back on a Decline, within its short window (`DECLINE_UNDO_MS`): the request waits again. */
export async function undoDeclineAction(requesterPublicId: unknown): Promise<boolean> {
  const userId = await requireUserId();
  const done = await undoDecline(userId, requesterPublicId, await requestFlags(userId));
  if (done) revalidatePath("/friends");
  return done;
}
