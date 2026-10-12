import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "../lib/theme/parse-css";
import { DEFAULT_THEME } from "../lib/theme/themes";
import manifest from "./manifest";

const HERE = dirname(fileURLToPath(import.meta.url));
const bg = parseThemeBlocks(readFileSync(join(HERE, "globals.css"), "utf8")).get(DEFAULT_THEME)?.get("bg");
const m = manifest();

/** A PNG's width and height, the first two fields of its IHDR. */
function size(path: string): [number, number] {
  const bytes = readFileSync(join(HERE, "../../public", path));
  expect(bytes.subarray(1, 4).toString("ascii"), `${path} is not a PNG`).toBe("PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

describe("the web app manifest", () => {
  it("opens the app standalone, from Home", () => {
    expect(m).toMatchObject({ display: "standalone", start_url: "/", scope: "/" });
  });

  it("wears the default theme's ground, the one the icon is drawn on", () => {
    expect(bg).toBeDefined();
    expect(m.theme_color?.toLowerCase()).toBe(bg!.toLowerCase());
    expect(m.background_color?.toLowerCase()).toBe(bg!.toLowerCase());
    expect(readFileSync(join(HERE, "icon.svg"), "utf8")).toContain(`<rect width="64" height="64" fill="${m.background_color}"/>`);
  });

  it("names icons that exist at the sizes it claims, with a maskable one", () => {
    for (const icon of m.icons ?? []) {
      const [w, h] = size(icon.src);
      expect(`${w}x${h}`, icon.src).toBe(icon.sizes);
    }
    expect(m.icons?.some((i) => i.purpose === "maskable" && i.sizes === "512x512")).toBe(true);
    expect(m.icons?.some((i) => i.purpose === "any" && i.sizes === "192x192")).toBe(true);
  });
});
