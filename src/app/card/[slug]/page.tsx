import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicCardPage } from "../../../components/public/card-page";
import { cardPagePath } from "../../../components/public/links";
import { readPublicCard } from "../../../lib/public/cached-card";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { observeAnonymousHit } from "../../../lib/rate/anon";
import { resolveSwitchEnv } from "../../../lib/switches/snapshot";

/**
 * The public card page (launch epic F3, PR 2a). Its CONTENT is the same for every visitor: nothing here reads a session, a
 * cookie or a per-reader switch, and nothing branches on one (`check:public-reads` holds the components). The root shell
 * around it still does: a member who opens an address (the app never routes one here) gets the app's chrome around the
 * page, and their read is counted as an `anon:` hit, since the page cannot ask who they are.
 *
 * - The switch is plumbing and decided with no account (`resolveSwitchEnv(null)`): off, a 404, never a sign-in redirect.
 * - An unknown or ambiguous address is a 404; a wrong name part 308s to the canonical address.
 * - The read is cached on the catalog generation and the deployment (`readPublicCard`).
 * - `observeAnonymousHit` counts the read after the response (observe only). This file is the one place a request header
 *   is read, and only to hand it over.
 */
export default async function PublicCardRoute({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) notFound();
  const result = await readPublicCard(slug);
  if (result.kind !== "ok") notFound();
  if (slug !== result.canonicalSlug) permanentRedirect(cardPagePath(result.canonicalSlug));
  await observeAnonymousHit(await headers());
  // `/commander/[slug]` ships in F3 PR 3; until then the cross-link would lead to a 404.
  return <PublicCardPage card={result.card} commanderLinks={false} />;
}
