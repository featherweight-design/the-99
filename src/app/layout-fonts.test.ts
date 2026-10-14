// @vitest-environment node
//
// The fonts are self-hosted, so the files are part of the repository and the
// declarations in `fonts.ts` point at real paths. A typo'd path fails the
// build, which is a slow way to learn it; these read the source and the
// directory and answer in milliseconds.
//
// They also pin the two things that are invisible when wrong:
//
//   `preload: false` on the six display faces. Next emits every @font-face
//   block unconditionally and only fetches a family when something renders it —
//   unless a <link rel="preload"> drags all of them down on every page. The page
//   looks identical either way; only the request count moves, which is why
//   `probe:font-parity` counts requests and why this test pins the flag.
//
//   The CSS variable names. A renamed variable leaves the custom property unset
//   and every rule using it silently falls back to a system face.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
// The declarations live in `fonts.ts`, shared by the root layout and `global-error.tsx`.
const layout = readFileSync(join(HERE, "fonts.ts"), "utf8");
const fontFiles = readdirSync(join(HERE, "fonts"));

/** Every `path:` `fonts.ts` hands to `next/font/local`. */
const declaredPaths = [...layout.matchAll(/path:\s*"\.\/fonts\/([^"]+)"/g)].map((m) => m[1]);

describe("self-hosted fonts", () => {
  it("declares eight families in nine next/font/local calls, and imports nothing from Google", () => {
    // The IMPORT, not the string: the comments above the declarations explain at
    // length why this moved off `next/font/google`, so a bare substring check
    // fails on its own rationale.
    expect(layout).not.toMatch(/^\s*import\b[^;]*["']next\/font\/google["']/m);
    expect(layout).toMatch(/^import localFont from "next\/font\/local";$/m);
    // Nine calls: Plex Sans's italic is a call of its own (so it can skip the preload), naming the
    // upright's family.
    expect([...layout.matchAll(/=\s*localFont\(\{/g)]).toHaveLength(9);
  });

  it("points every declaration at a file that exists", () => {
    expect(declaredPaths.length).toBeGreaterThan(0);
    for (const path of declaredPaths) {
      expect(fontFiles, `fonts.ts declares fonts/${path}`).toContain(path);
    }
  });

  it("ships no font file fonts.ts does not declare", () => {
    const woff2 = fontFiles.filter((f) => f.endsWith(".woff2"));
    for (const file of woff2) {
      expect(declaredPaths, `fonts/${file} is committed but never declared`).toContain(file);
    }
  });

  // Redistribution: an OFL or Apache face travels with its licence.
  it("ships a licence beside every family", () => {
    const families = new Set(
      fontFiles
        .filter((f) => f.endsWith(".woff2"))
        // `-italic` comes off too, or the italic face reads as a ninth family
        // with no licence of its own.
        .map((f) => f.replace(/-(italic-)?(variable|\d+)\.woff2$/, "")),
    );
    expect(families.size).toBe(8);
    for (const family of families) {
      expect(fontFiles, `${family} has no licence`).toContain(`${family}-LICENSE.txt`);
    }
  });

  // PER FAMILY, not a count. Six `preload: false` lines anywhere satisfies a
  // count even if one has moved off Cinzel and onto Plex Sans — which would
  // preload a display face on every page, the exact regression this guards.
  it("keeps preload off for each of the six display faces, and on for the two body faces", () => {
    const blockFor = (variable: string) => {
      const from = layout.indexOf(`variable: "${variable}"`);
      const start = layout.lastIndexOf("localFont({", from);
      return layout.slice(start, layout.indexOf("});", from));
    };
    for (const variable of [
      "--font-cinzel",
      "--font-chakra-petch",
      "--font-trirong",
      "--font-syncopate",
      "--font-cormorant-garamond",
      "--font-metamorphous",
    ]) {
      expect(blockFor(variable), `${variable} must not preload`).toContain("preload: false");
    }
    for (const variable of ["--font-plex-sans", "--font-plex-mono"]) {
      expect(blockFor(variable), `${variable} is a body face and preloads`).not.toContain(
        "preload: false",
      );
    }
  });

  // The italic is drawn on no first screen, so it is not preloaded; and it must name the upright's
  // family, or `font-style: italic` falls back to a synthesized oblique of the upright.
  it("keeps the Plex Sans italic out of the preload, in the upright's family", () => {
    const blockFor = (variable: string) => {
      const from = layout.indexOf(`variable: "${variable}"`);
      const start = layout.lastIndexOf("localFont({", from);
      return layout.slice(start, layout.indexOf("});", from));
    };
    const upright = blockFor("--font-plex-sans");
    const italic = blockFor("--font-plex-sans-italic");
    expect(upright).toContain("ibm-plex-sans-variable.woff2");
    expect(upright).not.toContain("italic");
    expect(italic).toContain("ibm-plex-sans-italic-variable.woff2");
    expect(italic).toContain("preload: false");
    const family = (block: string) => block.match(/prop: "font-family", value: "([^"]+)"/)?.[1];
    expect(family(italic)).toBeDefined();
    expect(family(italic)).toBe(family(upright));
    // The card modal warms the italic by this family's name, so a rename here must move there too.
    const provider = readFileSync(join(HERE, "../components/cards/card-detail-provider.tsx"), "utf8");
    expect(provider).toContain(`document.fonts.load("italic 400 1em ${family(italic)}")`);
  });

  it("keeps every CSS variable name the styles read", () => {
    for (const variable of [
      "--font-cinzel",
      "--font-chakra-petch",
      "--font-trirong",
      "--font-syncopate",
      "--font-cormorant-garamond",
      "--font-metamorphous",
      "--font-plex-sans",
      "--font-plex-mono",
    ]) {
      expect(layout, `${variable} is gone from fonts.ts`).toContain(`variable: "${variable}"`);
    }
  });

  // The variable families are one file for a weight RANGE; declaring their
  // weights separately renders the same and costs extra requests per page.
  // IN THE SAME DECLARATION. Asserting the file and the range as two separate
  // whole-file substrings passes with Cinzel's `600 900` swapped onto Cormorant
  // Garamond and back — both strings are still somewhere in the file.
  it("declares the three variable families as a range, each on its own file", () => {
    for (const [file, range] of [
      ["cinzel-variable.woff2", "600 900"],
      ["cormorant-garamond-variable.woff2", "600 700"],
      ["ibm-plex-sans-variable.woff2", "400 600"],
    ]) {
      const declaration = new RegExp(
        `path:\\s*"\\./fonts/${file.replace(/[.]/g, "\\.")}"\\s*,\\s*weight:\\s*"${range}"`,
      );
      expect(layout, `${file} is not declared with weight "${range}"`).toMatch(declaration);
    }
  });

  // The style axis, which an inventory built by scanning weights misses: this
  // family alone declared `style: ["normal", "italic"]` before self-hosting, and
  // without the italic FILE every italic renders as a synthesized oblique.
  it("declares a real italic face for IBM Plex Sans", () => {
    expect(layout).toMatch(
      /path:\s*"\.\/fonts\/ibm-plex-sans-italic-variable\.woff2"\s*,\s*weight:\s*"400 600"\s*,\s*style:\s*"italic"/,
    );
    expect(fontFiles).toContain("ibm-plex-sans-italic-variable.woff2");
  });

  // `next/font/google` derived the metric-matched fallback from the family's
  // category; `next/font/local` defaults to Arial for every face, so a serif
  // display face would swap in from sans metrics.
  it("gives the serif display faces a serif fallback", () => {
    for (const variable of ["--font-cinzel", "--font-trirong", "--font-cormorant-garamond"]) {
      const block = layout.slice(layout.indexOf(`variable: "${variable}"`));
      const declaration = block.slice(0, block.indexOf("});"));
      expect(declaration, `${variable} has no serif fallback`).toContain(
        'adjustFontFallback: "Times New Roman"',
      );
    }
  });
});
