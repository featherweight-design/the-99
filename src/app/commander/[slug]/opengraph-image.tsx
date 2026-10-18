import { OgCommanderImage } from "../../../components/public/og-commander-image";
import { catalogGeneration } from "../../../lib/cache/catalog-generation";
import { inlineImage, servePreview } from "../../../lib/og/serve";
import { publicCommanderImageKey, PUBLIC_COMMANDER_REVALIDATE_S, readPublicCommander } from "../../../lib/public/cached-commander";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { parsePublicSlug } from "../../../lib/public/slug";
import { resolveSwitchEnv } from "../../../lib/switches/snapshot";

/**
 * The commander page's link-preview image (C2, README call 8), the card's twin (`/card/[slug]/opengraph-image.tsx`):
 * stored in the data cache under the catalog generation, the deployment and the commander's id
 * (`publicCommanderImageKey`), drawn with its art crop inlined, and served artless and unstored when Scryfall does not
 * answer (`servePreview`). Dynamic for the same reasons: the switch and the generation are read per request.
 *
 * Off, or for an address that does not resolve (a card with no `commander_support` row included), a bare 404. Nothing here
 * reads a request, a session or a per-user table: the commander comes through `readPublicCommander` alone.
 */
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) return new Response(null, { status: 404 });
  // Read BEFORE the commander, as the card's image does: a refresh mid-read never files older data under the newer key.
  const generation = await catalogGeneration();
  const result = await readPublicCommander(slug);
  const parsed = parsePublicSlug(slug);
  if (result.kind !== "ok" || !parsed) return new Response(null, { status: 404 });
  const { commander } = result;
  return servePreview({
    key: publicCommanderImageKey(generation, parsed.hex),
    revalidate: PUBLIC_COMMANDER_REVALIDATE_S,
    label: `commander image ${parsed.hex}`,
    draw: async (withArt) => {
      if (!withArt || !commander.artCropUri) return <OgCommanderImage commander={commander} pictured={false} />;
      return <OgCommanderImage commander={{ ...commander, artCropUri: await inlineImage(commander.artCropUri) }} />;
    },
  });
}
