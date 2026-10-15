// The friend request card's states (Social R1 PR D): `readInvite`'s answer as the card draws it. Pure, so the page
// and its tests share one mapping. Ended and not found are one card that names nobody (E6); only an open link, your
// own and a friend's carry a name and a commander (D1).

import type { InviteView } from "./friends";
import type { ProfileCommander } from "./commander";

export type LandingView =
  | { kind: "expired" }
  | { kind: "ended" }
  | { kind: "open"; name: string; commander: ProfileCommander | null }
  | { kind: "self"; name: string; commander: ProfileCommander | null }
  | { kind: "friends"; name: string; commander: ProfileCommander | null; since: Date };

export function landingView(invite: InviteView): LandingView {
  if (invite === null) return { kind: "ended" };
  if (invite.state === "expired") return { kind: "expired" };
  if (invite.state !== "open") return { kind: "ended" };
  const who = { name: invite.inviterName, commander: invite.commander };
  if (invite.self) return { kind: "self", ...who };
  if (invite.alreadyFriends && invite.friendsSince) return { kind: "friends", ...who, since: invite.friendsSince };
  return { kind: "open", ...who };
}
