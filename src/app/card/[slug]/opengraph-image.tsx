import { unstable_cache } from "next/cache";
import { ImageResponse } from "next/og";

import { OgCardImage, type OgCardInput } from "../../../components/public/og-card-image";
import { catalogGeneration } from "../../../lib/cache/catalog-generation";
import { ogFonts } from "../../../lib/og/fonts";
import { publicCardImageKey, PUBLIC_CARD_REVALIDATE_S, readPublicCard } from "../../../lib/public/cached-card";
import { publicPagesEnabled } from "../../../lib/public/flag";
import { parsePublicSlug } from "../../../lib/public/slug";
import { SCRYFALL_HEADERS } from "../../../lib/scryfall/http";
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
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** How long a browser or an unfurler may keep the PNG. Short, because the URL does not change when the catalog does. */
const CACHE_CONTROL = "public, max-age=3600";

/** How long one of Scryfall's images may take before the preview is drawn without it. */
const ART_TIMEOUT_MS = 8000;

/**
 * One of the card's images as a data URL. Fetched HERE rather than by the renderer, because the renderer draws a box with
 * no image when a fetch fails and says nothing, and that picture would then be stored for a whole catalog generation.
 */
async function inline(url: string): Promise<string> {
  // Scryfall answers 400 to a request without its User-Agent and an explicit Accept (`SCRYFALL_HEADERS`).
  const res = await fetch(url, { headers: { ...SCRYFALL_HEADERS, Accept: "image/*" }, signal: AbortSignal.timeout(ART_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  const type = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

async function render(card: OgCardInput, pictured = card.imageUri !== null): Promise<string> {
  let drawn = card;
  if (pictured && card.imageUri) {
    const [imageUri, artCropUri] = await Promise.all([inline(card.imageUri), card.artCropUri ? inline(card.artCropUri) : null]);
    drawn = { ...card, imageUri, artCropUri };
  }
  const image = new ImageResponse(<OgCardImage card={drawn} pictured={pictured} />, { ...size, fonts: await ogFonts() });
  return Buffer.from(await image.arrayBuffer()).toString("base64");
}

function png(base64: string): Response {
  return new Response(Buffer.from(base64, "base64"), { headers: { "content-type": contentType, "cache-control": CACHE_CONTROL } });
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, env] = await Promise.all([params, resolveSwitchEnv(null)]);
  if (!publicPagesEnabled(env)) return new Response(null, { status: 404 });
  const result = await readPublicCard(slug);
  const parsed = parsePublicSlug(slug);
  if (result.kind !== "ok" || !parsed) return new Response(null, { status: 404 });
  const { card } = result;
  const stored = unstable_cache(() => render(card), publicCardImageKey(await catalogGeneration(), parsed.hex), {
    revalidate: PUBLIC_CARD_REVALIDATE_S,
  });
  try {
    return png(await stored());
  } catch (e) {
    // Scryfall's image host not answering is the likely failure: the no-image form is drawn and served, NOT stored, so the
    // next request tries the art again.
    console.warn(`[og] card image ${parsed.hex} drawn without its art:`, e instanceof Error ? e.message : e);
    return png(await render(card, false));
  }
}
