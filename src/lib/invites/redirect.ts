/**
 * Where an invitation's accept link hands the reader back (`CreateInvitation.redirectUrl`): the app's own `/sign-up`, which
 * draws the sign-up by invitation for the `__clerk_ticket` Clerk adds. Pure: the action that makes the invitation resolves
 * it and passes it in, so nothing below the action reads the request.
 *
 * The origin is the deployment's canonical one (`siteOrigin()`, which Vercel sets on every deployment of a project), never
 * the sender's request headers: the link goes into a third party's email and carries a ticket, so a forged Host must not
 * be able to point it anywhere. Only off Vercel, where `siteOrigin()` is unset, is the request's own origin used, and only
 * a local one (`localhost`, `127.0.0.1`), so a local server's invitation comes back to it. Anything else is null: the
 * invitation is made with no redirect, and its link lands on Clerk's hosted sign-up.
 */
import { SIGN_UP_PATH } from "../../components/public/links";
import { originFrom } from "../social/client-rules";

export function invitationRedirectUrl(site: URL | undefined, request: { get(name: string): string | null }): string | null {
  if (site) return `${site.origin}${SIGN_UP_PATH}`;
  const origin = originFrom(request);
  return origin !== null && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin) ? `${origin}${SIGN_UP_PATH}` : null;
}
