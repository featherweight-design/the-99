"use server";

// Join on a friend link's signed-out landing (friend links R1, PR 2). The visitor has no account, so there is no reader:
// the link's OWNER is found from the token, and their own switch decides whether the link works (`openLinkJoin`). Capped
// per visitor and link, then per link across visitors (`friend-join`, `friend-join-all`, ENFORCED, apart from the page
// view's own count): a refused Join reads as the link being busy, naming nothing new.

import { headers } from "next/headers";
import { openLinkJoin } from "../../../lib/invites/link-join";
import { mailEnv } from "../../../lib/invites/mail";
import { joinPath } from "../../../lib/invites/rules";
import { inviteSecret } from "../../../lib/invites/tokens";
import { newcomerRefusal } from "../../../lib/rate/anon";
import { isInviteToken } from "../../../lib/social/client-rules";

export type LinkJoinOutcome = { ok: true; path: string } | { ok: false; reason: "ended" | "out" | "busy" | "unconfigured" };

export async function joinFromLinkAction(token: unknown): Promise<LinkJoinOutcome> {
  if (!isInviteToken(token)) return { ok: false, reason: "ended" };
  if ((await newcomerRefusal(await headers(), "friend-join", "friend-join-all", "friend-link", token)) !== null) return { ok: false, reason: "busy" };
  const result = await openLinkJoin(token, inviteSecret(mailEnv()));
  return result.ok ? { ok: true, path: joinPath(result.token) } : result;
}
