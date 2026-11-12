import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STARTUP_IMAGES, STARTUP_SCREENS, startupMedia, startupPath, startupPixels } from "./startup-images";

// A PNG's size is the first two fields of its IHDR (bytes 16 to 24, big endian). The file is read from `public/`, so a
// table row without its picture, or a picture the generator drew at another size, fails here.
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(join(process.cwd(), "public", file));
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("iPhone startup images", () => {
  it.each(STARTUP_SCREENS.map((s) => [startupPath(s), s] as const))("%s is the screen's size in device pixels", (path, screen) => {
    expect(pngSize(path)).toEqual(startupPixels(screen));
  });

  it("names every screen once, so no two rows answer the same media query", () => {
    expect(new Set(STARTUP_SCREENS.map(startupMedia)).size).toBe(STARTUP_SCREENS.length);
    expect(new Set(STARTUP_SCREENS.map(startupPath)).size).toBe(STARTUP_SCREENS.length);
  });

  it("is portrait only, matching the exact device size and ratio iOS compares", () => {
    expect(STARTUP_IMAGES).toHaveLength(STARTUP_SCREENS.length);
    expect(STARTUP_IMAGES[0]).toEqual({
      url: "/startup/375x667@2x.png",
      media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    });
  });

  it("is wired into the root layout's metadata", () => {
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/appleWebApp:\s*\{\s*startupImage:\s*STARTUP_IMAGES\s*\}/);
  });
});
