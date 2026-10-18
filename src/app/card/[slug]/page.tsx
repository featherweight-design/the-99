import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicCardPage } from "../../../components/public/card-page";
import { cardPagePath } from "../../../components/public/links";
import { readPublicCard } from "../../../lib/public/cached-card";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { cardDescription } from "../../../lib/public/preview";
import { publicPagesCopy } from "../../../lib/copy/public-pages";
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
type Params = { params: Promise<{ slug: string }> };

/**
 * The origin absolute URLs are built on: the deployment's own production domain, which Vercel sets on every deployment of
 * a project (the staging project's is the staging domain). Unset off Vercel, where Next falls back to localhost.
 */
function siteOrigin(): URL | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? new URL(`https://${host}`) : undefined;
}

/**
 * The link preview's tags (C2, README call 8), from the SAME read the page draws (`readPublicCard` is `React.cache`d, so the
 * request reads once). The image is the colocated `opengraph-image.tsx`, which Next adds to these tags itself. Off, or for an
 * address that does not resolve, nothing about a card: the page answers 404. No request API is read here.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) return {};
  const result = await readPublicCard(slug);
  if (result.kind !== "ok") return {};
  const { card } = result;
  const title = publicPagesCopy.linkPreview.cardTitle(card.name);
  const description = cardDescription(card);
  const url = cardPagePath(result.canonicalSlug);
  return {
    metadataBase: siteOrigin(),
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: publicPagesCopy.shell.wordmarkPhone },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicCardRoute({ params }: Params) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) notFound();
  const result = await readPublicCard(slug);
  if (result.kind !== "ok") notFound();
  if (slug !== result.canonicalSlug) permanentRedirect(cardPagePath(result.canonicalSlug));
  await observeAnonymousHit(await headers());
  return <PublicCardPage card={result.card} commanderLinks />;
}
