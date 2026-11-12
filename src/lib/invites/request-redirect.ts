import { headers } from "next/headers";
import { siteOrigin } from "../public/site-origin";
import { invitationRedirectUrl } from "./redirect";

/**
 * `invitationRedirectUrl` for the request in flight: the one call every action that makes an Invitation shares, so the
 * deployment's origin and the request's headers are never wired by hand at a call site (`redirect.ts` says why).
 */
export async function requestInvitationRedirectUrl(): Promise<string | null> {
  return invitationRedirectUrl(siteOrigin(), await headers());
}
