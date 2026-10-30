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
import { spendFlyerOnSignUp } from "../../lib/flyer/spend";
import { reservationIdFrom, spendInviteOnSignUp } from "../../lib/invites/spend";
import { ensureProfile, profileAgeMs } from "../../lib/social/friends";
import { profileNeedsClerk } from "../../lib/social/rules";

export async function ensureSenderProfile(userId: string): Promise<void> {
  // A profile older than the newcomer window needs nothing from Clerk or from us: the name is stored, and the invite spend was
  // attempted when the profile was written (here, /friends, or the spend itself). The Backend call is ~125 ms a press
  // (measured on staging, 2026-10-18, as `/friends`'s `currentUser` span), and this runs on every link, QR and email invite.
  if (!profileNeedsClerk(await profileAgeMs(userId))) return;
  const user = await currentUser();
  const reservationId = reservationIdFrom(user?.publicMetadata);
  if (reservationId !== null) {
    const spend = await spendInviteOnSignUp(userId, reservationId, user?.firstName);
    // A flyer sign-up's metadata names its claim, which the personal spend does not know: the same recovery for it.
    if (!spend.spent && spend.reason === "unknown") await spendFlyerOnSignUp(userId, reservationId, user?.firstName);
  }
  await ensureProfile(userId, user?.firstName);
}
