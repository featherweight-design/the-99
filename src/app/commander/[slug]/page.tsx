import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicCommanderPage } from "../../../components/public/commander-page";
import { commanderPagePath } from "../../../components/public/links";
import { readPublicCommander } from "../../../lib/public/cached-commander";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { observeAnonymousHit } from "../../../lib/rate/anon";
import { resolveSwitchEnv } from "../../../lib/switches/snapshot";

/**
 * The public commander page (launch epic F3, PR 3), the card page's twin (`/card/[slug]`): the same switch, the same
 * address rules and the same anonymous count. Its CONTENT is the same for every visitor; nothing here reads a session.
 *
 * - The switch is plumbing and decided with no account (`resolveSwitchEnv(null)`): off, a 404, never a sign-in redirect.
 * - An unknown or ambiguous address, or a card with no `commander_support` row, is a 404; a wrong name part 308s.
 * - The read is cached on the catalog generation and the deployment (`readPublicCommander`); a `degraded` read is not kept.
 */
export default async function PublicCommanderRoute({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) notFound();
  const result = await readPublicCommander(slug);
  if (result.kind !== "ok") notFound();
  if (slug !== result.canonicalSlug) permanentRedirect(commanderPagePath(result.canonicalSlug));
  await observeAnonymousHit(await headers());
  return <PublicCommanderPage commander={result.commander} />;
}
