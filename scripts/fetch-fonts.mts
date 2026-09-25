// Download the exact font files `src/app/layout.tsx` declares, for self-hosting.
//
// WHY THIS EXISTS AT ALL: `next/font/google` fetches from Google at BUILD time,
// so a network blip fails the build. CI's Build step failed twice overnight
// doing exactly that and passed on a re-run. Self-hosting removes Google from
// the build path; this script is how the committed files stay reproducible
// rather than becoming twenty mystery binaries nobody can regenerate.
//
// It writes ONLY the weights and subsets the layout declares. Fetching a family's
// whole range would be easy and would quietly add megabytes nobody asked for, so
// the manifest below is the single source of truth and the script refuses to
// guess beyond it.
//
//   pnpm fetch:fonts
//
// Re-run it when a weight is added to `layout.tsx`, and commit what changes.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * Exactly what `src/app/layout.tsx` asks for, family by family.
 *
 * `dir` is the Google Fonts repository directory (`ofl/…` or `apache/…`), which
 * is where the licence text lives — the API serves the font bytes but never the
 * licence, and an OFL face is only redistributable WITH it.
 */
const FAMILIES = [
  // `range: true` means Google serves ONE variable file covering the whole span,
  // which is what `next/font/google` was fetching before this change. Declaring
  // four static weights instead looks identical on screen and costs three extra
  // requests per page — the parity probe caught exactly that (9 font requests
  // against Google's 6) and it is the reason this field exists.
  //
  // Which families have one is MEASURED, not assumed: requesting a range from
  // the API returns 400 for a static-only family. Chakra Petch, Trirong,
  // Syncopate and Plex Mono are static-only today.
  { css: "Cinzel", slug: "cinzel", dir: "ofl/cinzel", weights: [600, 900], range: true },
  { css: "Chakra Petch", slug: "chakra-petch", dir: "ofl/chakrapetch", weights: [500, 600, 700], range: false },
  { css: "Trirong", slug: "trirong", dir: "ofl/trirong", weights: [600, 700], range: false },
  // Apache, not OFL — `ofl/syncopate` does not exist, which is how the licence
  // family is discovered rather than assumed. Guessing `ofl/` for every face and
  // letting a 404 pass would have shipped fonts with no licence at all.
  { css: "Syncopate", slug: "syncopate", dir: "apache/syncopate", weights: [400, 700], range: false },
  { css: "Cormorant Garamond", slug: "cormorant-garamond", dir: "ofl/cormorantgaramond", weights: [600, 700], range: true },
  { css: "Metamorphous", slug: "metamorphous", dir: "ofl/metamorphous", weights: [400], range: false },
  { css: "IBM Plex Sans", slug: "ibm-plex-sans", dir: "ofl/ibmplexsans", weights: [400, 600], range: true },
  { css: "IBM Plex Mono", slug: "ibm-plex-mono", dir: "ofl/ibmplexmono", weights: [400, 500, 600], range: false },
] as const;

const OUT = fileURLToPath(new URL("../src/app/fonts/", import.meta.url));

// The API serves woff2 only to a UA it believes supports it. Without this it
// returns ttf, which is roughly twice the bytes for the same glyphs.
const WOFF2_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/**
 * The `latin` block from a Google Fonts v2 stylesheet.
 *
 * The response carries one `@font-face` per subset, each preceded by a comment
 * naming it. Taking the first block would silently pick `cyrillic` or
 * `latin-ext` depending on the family's ordering — the same glyphs would render
 * for English text, so nothing would look wrong while the wrong file shipped.
 */
function latinWoff2Url(css: string, weight: string): string {
  const blocks = css.split("/*").slice(1);
  for (const block of blocks) {
    const [label] = block.split("*/");
    if (label.trim() !== "latin") continue;
    const url = /src:\s*url\(([^)]+)\)\s*format\('woff2'\)/.exec(block)?.[1];
    if (url) return url;
  }
  throw new Error(`no latin woff2 block for weight ${weight}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let total = 0;
  const written: string[] = [];

  for (const family of FAMILIES) {
    // A variable family is ONE request for the whole span; a static one is a
    // file per weight. `spec` is the only difference.
    const specs = family.range
      ? [{ spec: `${family.weights[0]}..${family.weights[family.weights.length - 1]}`, name: `${family.slug}-variable.woff2` }]
      : family.weights.map((w) => ({ spec: String(w), name: `${family.slug}-${w}.woff2` }));

    for (const { spec, name } of specs) {
      const api = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.css)}:wght@${spec}&display=swap`;
      const cssRes = await fetch(api, { headers: { "User-Agent": WOFF2_UA } });
      if (!cssRes.ok) throw new Error(`${family.css} ${spec}: css ${cssRes.status}`);
      const url = latinWoff2Url(await cssRes.text(), spec);

      const fontRes = await fetch(url);
      if (!fontRes.ok) throw new Error(`${family.css} ${spec}: font ${fontRes.status}`);
      const bytes = Buffer.from(await fontRes.arrayBuffer());
      // A woff2 begins with `wOF2`. A 200 carrying an error page would otherwise
      // be written out as a font file and fail much later, at render.
      if (bytes.subarray(0, 4).toString("latin1") !== "wOF2") {
        throw new Error(`${family.css} ${spec}: not a woff2 (starts ${bytes.subarray(0, 4).toString("hex")})`);
      }
      await writeFile(new URL(name, `file://${OUT}`), bytes);
      written.push(name);
      total += bytes.length;
      console.log(`${name.padEnd(34)} ${(bytes.length / 1024).toFixed(1)} KB`);
    }

    // The licence, from the family's own directory in google/fonts. An OFL face
    // may only be redistributed with it, and self-hosting is redistribution.
    const licenceName = family.dir.startsWith("ofl/") ? "OFL.txt" : "LICENSE.txt";
    const licRes = await fetch(
      `https://raw.githubusercontent.com/google/fonts/main/${family.dir}/${licenceName}`,
    );
    if (!licRes.ok) throw new Error(`${family.css}: licence ${licRes.status} from ${family.dir}`);
    const licence = await licRes.text();
    if (!/SIL OPEN FONT LICENSE|Apache License/i.test(licence)) {
      throw new Error(`${family.css}: fetched licence does not read as OFL or Apache`);
    }
    await writeFile(new URL(`${family.slug}-LICENSE.txt`, `file://${OUT}`), licence);
    written.push(`${family.slug}-LICENSE.txt`);
  }

  console.log(`\n${written.length} files, ${(total / 1024 / 1024).toFixed(2)} MB of font data`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
