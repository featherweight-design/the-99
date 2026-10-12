import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "../lib/theme/parse-css";
import { DEFAULT_THEME } from "../lib/theme/themes";

/**
 * `favicon.ico` and `apple-icon.png` are raster copies of the same mark
 * `icon.svg` draws, produced once by a generator that is not in the repository.
 * Nothing regenerates them, so nothing would notice if the palette moved and
 * left these two URLs serving a retired one — or if somebody dropped a stock
 * icon back in. These read the committed bytes.
 *
 * Structure is parsed by hand rather than through a dependency: an ICO
 * directory is a 6-byte header and 16 bytes per entry, and a PNG's dimensions
 * are the first two fields of its IHDR. Neither is worth a package.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const tokens = parseThemeBlocks(readFileSync(join(HERE, "globals.css"), "utf8")).get(DEFAULT_THEME);

function token(name: string): [number, number, number] {
  const hex = tokens?.get(name);
  if (!hex) throw new Error(`globals.css no longer declares --${name} on the default theme`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

type Png = { width: number; height: number; pixel: (x: number, y: number) => [number, number, number] };

/**
 * Enough of a PNG reader to sample a pixel: 8-bit RGB or RGBA, no interlace,
 * which is what both files are. Every scanline carries a filter byte, and all
 * five filters are handled because which one an encoder picks per row is its
 * own business — assuming None would make this pass or fail on the encoder's
 * mood rather than on the colour.
 */
function readPng(bytes: Buffer): Png {
  // Every face this app ships is PNG-encoded. A BMP-encoded one is somebody
  // else's icon file — the stock Next.js favicon among them — so say that
  // rather than failing on a byte comparison nobody can read.
  expect(
    bytes.subarray(0, 8),
    "not a PNG: this icon was produced by something other than this app's generator",
  ).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      expect(body[8], "bit depth").toBe(8);
      expect(body[12], "interlace").toBe(0);
      channels = body[9] === 6 ? 4 : 3;
      expect([2, 6], "colour type").toContain(body[9]);
    } else if (type === "IDAT") idat.push(body);
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? out[y * stride + i - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      let add = 0;
      if (filter === 1) add = left;
      else if (filter === 2) add = up;
      else if (filter === 3) add = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const dl = Math.abs(p - left);
        const du = Math.abs(p - up);
        const dul = Math.abs(p - upLeft);
        add = dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
      }
      out[y * stride + i] = (line[i] + add) & 0xff;
    }
  }

  return {
    width,
    height,
    pixel: (x, y) => {
      const at = y * stride + x * channels;
      return [out[at], out[at + 1], out[at + 2]];
    },
  };
}

/** The faces an ICO holds, each one a PNG in this file. */
function readIco(bytes: Buffer): Map<number, Png> {
  expect(bytes.readUInt16LE(0), "reserved").toBe(0);
  expect(bytes.readUInt16LE(2), "type: 1 is an icon").toBe(1);
  const faces = new Map<number, Png>();
  for (let i = 0; i < bytes.readUInt16LE(4); i += 1) {
    const entry = 6 + 16 * i;
    // 0 in the byte means 256 — the format's own escape for a size that will
    // not fit in one byte. No face here is that large, but reading it as 0
    // would silently drop one.
    const size = bytes[entry] === 0 ? 256 : bytes[entry];
    const length = bytes.readUInt32LE(entry + 8);
    const at = bytes.readUInt32LE(entry + 12);
    faces.set(size, readPng(bytes.subarray(at, at + length)));
  }
  return faces;
}

const ico = readIco(readFileSync(join(HERE, "favicon.ico")));
const apple = readPng(readFileSync(join(HERE, "apple-icon.png")));
// The installed app's icons (`manifest.ts`), drawn from `icon.svg`; the maskable one at 80%.
const installed = new Map(
  ["icon-192.png", "icon-512.png", "maskable-512.png"].map((f) => [f, readPng(readFileSync(join(HERE, "../../public/icons", f)))]),
);

// Antialiasing means most pixels are a blend of two tokens, so the question
// each check asks is "is this pixel that token", within a tolerance, rather
// than "which token is it nearest". A blend of ground and bone passes close to
// the accent's brown on its way, which is why nearest-of-three would report
// accent in a face that has no crown in it at all.
const NEAR = 16;

function distance(rgb: readonly [number, number, number], name: string): number {
  const t = token(name);
  return Math.hypot(rgb[0] - t[0], rgb[1] - t[1], rgb[2] - t[2]);
}

function carries(face: Png, name: string): boolean {
  for (let y = 0; y < face.height; y += 1) {
    for (let x = 0; x < face.width; x += 1) {
      if (distance(face.pixel(x, y), name) <= NEAR) return true;
    }
  }
  return false;
}

describe("the raster icons", () => {
  it("ships the three faces a tab strip asks for", () => {
    expect([...ico.keys()].sort((a, b) => a - b)).toEqual([16, 32, 48]);
    for (const [size, face] of ico) {
      expect(face.width, `${size}px face width`).toBe(size);
      expect(face.height, `${size}px face height`).toBe(size);
    }
  });

  it("ships an apple-touch icon at the size iOS asks for", () => {
    expect([apple.width, apple.height]).toEqual([180, 180]);
  });

  // The corner is plate on every face — the mark is centred and nothing reaches
  // it. A stock icon dropped back in fails here first.
  it("stands the mark on the default theme's ground", () => {
    for (const [size, face] of ico) {
      expect(distance(face.pixel(0, 0), "bg"), `${size}px face corner`).toBeLessThanOrEqual(NEAR);
    }
    expect(distance(apple.pixel(0, 0), "bg"), "apple corner").toBeLessThanOrEqual(NEAR);
    for (const [file, face] of installed) {
      expect(distance(face.pixel(0, 0), "bg"), `${file} corner`).toBeLessThanOrEqual(NEAR);
    }
  });

  // The 48px face and the apple icon both carry the full lockup, so the crown's
  // accent and the numeral's bone both have to be in them. The 16px face is the
  // numeral alone and is checked for bone only.
  it("draws the crown in accent and the numeral in bone", () => {
    for (const [size, face] of [[32, ico.get(32)!], [48, ico.get(48)!], [180, apple], ...installed] as const) {
      expect(carries(face, "accent"), `${size}px face carries the crown`).toBe(true);
      expect(carries(face, "fg"), `${size}px face carries the numeral`).toBe(true);
    }
  });

  // A launcher crops a maskable icon to a circle, and only the central 80% (radius 0.4 of the
  // width) is promised to survive. The mark has to sit inside it; the plain 512 does not, which is
  // why the maskable one is its own drawing.
  it("keeps the maskable icon's mark inside the safe circle", () => {
    const reach = (face: Png) => {
      let far = 0;
      for (let y = 0; y < face.height; y += 1) {
        for (let x = 0; x < face.width; x += 1) {
          if (distance(face.pixel(x, y), "bg") > NEAR) {
            far = Math.max(far, Math.hypot(x + 0.5 - face.width / 2, y + 0.5 - face.height / 2) / face.width);
          }
        }
      }
      return far;
    };
    expect(reach(installed.get("maskable-512.png")!)).toBeLessThanOrEqual(0.4);
    // The check can fail: the full-size drawing reaches past the circle.
    expect(reach(installed.get("icon-512.png")!)).toBeGreaterThan(0.4);
  });

  // The smallest face drops the crown: at 16px three diamonds are three specks
  // and the numeral under them is a blot. Losing the accent there is the point
  // of drawing it differently, so it is asserted rather than left to chance.
  it("draws the 16px face as the numeral alone", () => {
    const small = ico.get(16)!;
    expect(carries(small, "fg"), "the numeral").toBe(true);
    expect(carries(small, "accent"), "no crown").toBe(false);
  });
});
