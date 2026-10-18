import { OgCardImage } from "../../../components/public/og-card-image";
import { catalogGeneration } from "../../../lib/cache/catalog-generation";
import { inlineImage, servePreview } from "../../../lib/og/serve";
import { publicCardImageKey, PUBLIC_CARD_REVALIDATE_S, readPublicCard } from "../../../lib/public/cached-card";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { parsePublicSlug } from "../../../lib/public/slug";
import { resolveSwitchEnv } from "../../../lib/switches/snapshot";

/**
 * The card page's link-preview image (C2, README call 8), Next's `opengraph-image` file convention: Next adds its
 * `og:image` (and the width, height and type below) to the page's tags itself.
 *
 * CACHED THE WAY THE PAGE'S READ IS: the PNG is stored in the data cache under the catalog generation, the deployment and
 * the card's id (`publicCardImageKey`), so a share preview renders once per card per catalog refresh, and a refresh or a new
 * build retires it with the card. The ROUTE itself is dynamic: a route-level cache (`revalidate`) would key on the path
 * alone, so it could not carry the generation, and it would hold the switch's answer past a flip. Each request costs the
 * switch read (an in-memory snapshot, 30s), the card read (`readPublicCard`, a data-cache hit), the generation read (a
 * data-cache entry, 60s) and then the image's own data-cache hit.
 *
 * Off, or for an address that does not resolve, a bare 404, never an image. Nothing here reads a request, a session or a
 * per-user table: the card comes through `readPublicCard` alone (`check:public-reads`).
 */
export const dynamic = "force-dynamic";
// Literals, as Next reads them: `OG_IMAGE_SIZE` is the same pair, which the renderer draws at.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) return new Response(null, { status: 404 });
  // The image's generation is read BEFORE the card: a refresh landing during the card read then stores newer data under an
  // older key (retired at once), never an older card's picture under the newer key.
  const generation = await catalogGeneration();
  const result = await readPublicCard(slug);
  const parsed = parsePublicSlug(slug);
  if (result.kind !== "ok" || !parsed) return new Response(null, { status: 404 });
  const { card } = result;
  return servePreview({
    key: publicCardImageKey(generation, parsed.hex),
    revalidate: PUBLIC_CARD_REVALIDATE_S,
    label: `card image ${parsed.hex}`,
    draw: async (withArt) => {
      if (!withArt || !card.imageUri) return <OgCardImage card={card} pictured={withArt && card.imageUri !== null} />;
      const [imageUri, artCropUri] = await Promise.all([inlineImage(card.imageUri), card.artCropUri ? inlineImage(card.artCropUri) : null]);
      return <OgCardImage card={{ ...card, imageUri, artCropUri }} />;
    },
  });
}
