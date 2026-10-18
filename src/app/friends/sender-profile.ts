// The sender's profile, made before anything that names them to someone else: a friend link, a QR invite, an email
// invite. Each is read back through the sender's profile (a link's landing and its redeem inner-join
// it, and a newcomer's friend row lists them through it), and Home's Add a friend can be pressed before /friends ever
// made one. From the Clerk first name, as /friends does on a first visit (decision 10); a stored one is kept.
//
// It also runs the newcomer's invite spend, as /friends does, BEFORE the profile is written. /friends skips its Clerk read
// for a profile older than `NEWCOMER_WINDOW_MS`, on the footing that every code path that creates a profile has by then
// attempted the spend: the spend itself (`welcomeInvitedIn`), /friends, and this. Without it, a newcomer whose
// `user.created` webhook failed and who pressed Add a friend before opening /friends would have a profile and no spend.
import { currentUser } from "@clerk/nextjs/server";
import { reservationIdFrom, spendInviteOnSignUp } from "../../lib/invites/spend";
import { ensureProfile } from "../../lib/social/friends";

export async function ensureSenderProfile(userId: string): Promise<void> {
  const user = await currentUser();
  const reservationId = reservationIdFrom(user?.publicMetadata);
  if (reservationId !== null) await spendInviteOnSignUp(userId, reservationId, user?.firstName);
  await ensureProfile(userId, user?.firstName);
}
