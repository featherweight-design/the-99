import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The faces a link-preview image is set in (C2): the app's own files, never a font service. The image renderer (`next/og`)
 * reads TrueType, OpenType and WOFF but NOT WOFF2, which is all `src/app/fonts/` holds, so `./fonts/` keeps TrueType copies
 * made from those files with fontTools:
 *
 * - `ibm-plex-mono-400.ttf`, `ibm-plex-mono-600.ttf`: the shipped WOFF2s decompressed, nothing else changed.
 * - `cinzel-700.ttf`: the variable Cinzel pinned at weight 700 (the renderer cannot read a variable font).
 * - `og-sans-99-400.ttf`: the variable IBM Plex Sans pinned at 400 and RENAMED, because "Plex" is a Reserved Font Name and a
 *   pinned instance is a Modified Version under the OFL. The licences sit beside the files.
 *
 * Read once per server, from the deployment's files (`process.cwd()`, the form Next's file tracing follows).
 */
const DIR = join(process.cwd(), "src/lib/og/fonts");

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" };

let loaded: Promise<OgFont[]> | null = null;

async function face(file: string, name: string, weight: OgFont["weight"]): Promise<OgFont> {
  const buf = await readFile(join(DIR, file));
  return { name, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight, style: "normal" };
}

/** The display, sans and mono faces, by the names the image's styles use. */
export function ogFonts(): Promise<OgFont[]> {
  loaded ??= Promise.all([
    face("cinzel-700.ttf", "Display", 700),
    face("og-sans-99-400.ttf", "Sans", 400),
    face("ibm-plex-mono-400.ttf", "Mono", 400),
    face("ibm-plex-mono-600.ttf", "Mono", 600),
  ]).catch((e) => {
    loaded = null;
    throw e;
  });
  return loaded;
}
