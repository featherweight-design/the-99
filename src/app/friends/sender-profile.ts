// The sender's profile, made before anything that names them to someone else: a friend link, a QR invite, an email
// invite. Each is read back through the sender's profile (a link's landing and its redeem inner-join
// it, and a newcomer's friend row lists them through it), and Home's Add a friend can be pressed before /friends ever
// made one. From the Clerk first name, as /friends does on a first visit (decision 10); a stored one is kept.
import { currentUser } from "@clerk/nextjs/server";
import { ensureProfile } from "../../lib/social/friends";

export async function ensureSenderProfile(userId: string): Promise<void> {
  await ensureProfile(userId, (await currentUser())?.firstName);
}
