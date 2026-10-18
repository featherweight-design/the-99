import { unstable_cache } from "next/cache";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

import { SCRYFALL_HEADERS } from "../scryfall/http";
import { ogFonts } from "./fonts";

/**
 * How a public page's link-preview image (C2) is drawn, stored and served: the card's and the commander's
 * `opengraph-image.tsx` share it, so both are cached and fall back the same way.
 */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** How long a browser or an unfurler may keep the PNG. Short, because the URL does not change when the catalog does. */
const CACHE_CONTROL = "public, max-age=3600";

/** How long one of Scryfall's images may take before the preview is drawn without it. */
const ART_TIMEOUT_MS = 8000;

/**
 * One of Scryfall's images as a data URL. Fetched HERE rather than by the renderer, because the renderer draws a box with
 * no image when a fetch fails and says nothing, and that picture would then be stored for a whole catalog generation.
 */
export async function inlineImage(url: string): Promise<string> {
  // Scryfall answers 400 to a request without its User-Agent and an explicit Accept (`SCRYFALL_HEADERS`).
  const res = await fetch(url, { headers: { ...SCRYFALL_HEADERS, Accept: "image/*" }, signal: AbortSignal.timeout(ART_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  const type = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

async function drawPng(element: ReactElement): Promise<string> {
  const image = new ImageResponse(element, { ...OG_IMAGE_SIZE, fonts: await ogFonts() });
  return Buffer.from(await image.arrayBuffer()).toString("base64");
}

function png(base64: string, cacheControl: string = CACHE_CONTROL): Response {
  return new Response(Buffer.from(base64, "base64"), { headers: { "content-type": "image/png", "cache-control": cacheControl } });
}

/**
 * The preview under `key` in the data cache, drawn by `draw(true)` (which inlines the art with `inlineImage`) on a miss. When
 * that throws (Scryfall's image host not answering is the likely failure) `draw(false)`, the artless form, is drawn and
 * served but NOT stored, and sent `no-store` so no browser or shared cache holds it after Scryfall recovers: the next
 * request tries the art again.
 */
export async function servePreview({ key, revalidate, label, draw }: {
  key: string[];
  revalidate: number;
  /** Names the preview in the fallback's warning, e.g. `card image 6ad8011d3471`. */
  label: string;
  draw: (withArt: boolean) => Promise<ReactElement>;
}): Promise<Response> {
  const stored = unstable_cache(async () => drawPng(await draw(true)), key, { revalidate });
  try {
    return png(await stored());
  } catch (e) {
    console.warn(`[og] ${label} drawn without its art:`, e instanceof Error ? e.message : e);
    return png(await drawPng(await draw(false)), "no-store");
  }
}
