import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicCommanderPage } from "../../../components/public/commander-page";
import { commanderDescription } from "../../../components/public/commander-preview";
import { commanderPagePath } from "../../../components/public/links";
import { readPublicCommander } from "../../../lib/public/cached-commander";
import { publicPagesCopy } from "../../../lib/copy/public-pages";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { siteOrigin } from "../../../lib/public/site-origin";
import { observeAnonymousHit } from "../../../lib/rate/anon";
import { resolveSwitchEnv } from "../../../lib/switches/snapshot";

/**
 * The public commander page (launch epic F3, PR 3), the card page's twin (`/card/[slug]`): the same switch, the same
 * address rules and the same anonymous count. Its CONTENT is the same for every visitor; nothing here reads a session.
 *
 * - The switch is plumbing and decided with no account (`resolveSwitchEnv(null)`): off, a 404, never a sign-in redirect.
 * - An unknown or ambiguous address, or a card with no `commander_support` row, is a 404; a wrong name part 308s.
 * - The read is cached on the catalog generation and the deployment (`readPublicCommander`).
 * - The link preview (C2) is `generateMetadata` below and the colocated `opengraph-image.tsx`.
 */
type Params = { params: Promise<{ slug: string }> };

/**
 * The link preview's tags (C2's commander column), from the SAME read the page draws (`readPublicCommander` is
 * `React.cache`d). The image is the colocated `opengraph-image.tsx`. Off, or for an address that does not resolve, nothing:
 * the page answers 404. No request API is read here.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) return {};
  const result = await readPublicCommander(slug);
  if (result.kind !== "ok") return {};
  const { commander } = result;
  const title = publicPagesCopy.linkPreview.commanderTitle(commander.name);
  const description = commanderDescription(commander);
  const url = commanderPagePath(result.canonicalSlug);
  return {
    metadataBase: siteOrigin(),
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: publicPagesCopy.shell.wordmarkPhone },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicCommanderRoute({ params }: Params) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) notFound();
  const result = await readPublicCommander(slug);
  if (result.kind !== "ok") notFound();
  if (slug !== result.canonicalSlug) permanentRedirect(commanderPagePath(result.canonicalSlug));
  await observeAnonymousHit(await headers());
  return <PublicCommanderPage commander={result.commander} />;
}
