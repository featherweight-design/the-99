// gen:email-images: writes the static PNGs the app's emails point at, into `public/email/`. Pure file work: no network, no database,
// no `.env`. Run it after the icon changes, and commit the PNGs; nothing regenerates them at build time. `design/` is reference
// only (`art/` holds the drawn versions to compare against); nothing here reads or copies from it.
//
//   mark-112@2x.png: the 99 tile (`public/icons/icon-512.png`) at 224 px, its three diamonds recoloured from the icon's copper to
//   the emails' brass (#C9A24B), with the corners rounded in the PNG itself so a client that ignores `border-radius` still draws
//   a tile.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/email");
const BRASS = { r: 0xc9, g: 0xa2, b: 0x4b };
const SIZE = 224;
/** The tile's corner radius as a share of its side (the app icon's, read off the drawn reference: about 23%). */
const RADIUS = Math.round(SIZE * 0.23);

mkdirSync(OUT, { recursive: true });

const icon = await sharp(join(ROOT, "public/icons/icon-512.png")).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = icon.data;
// The copper diamonds are the only pixels with red well above blue; the cream "99" has them close, the ground has neither.
// A pixel's share of copper over the ground (its red minus blue, against the copper's) carries the anti-aliased edge.
const GROUND = { r: 0x14, g: 0x11, b: 0x0e };
const COPPER_SPREAD = 0xcf - 0x47;
for (let i = 0; i < px.length; i += 4) {
  const spread = px[i] - px[i + 2];
  if (spread <= 40) continue;
  const t = Math.min(1, spread / COPPER_SPREAD);
  px[i] = Math.round(GROUND.r + t * (BRASS.r - GROUND.r));
  px[i + 1] = Math.round(GROUND.g + t * (BRASS.g - GROUND.g));
  px[i + 2] = Math.round(GROUND.b + t * (BRASS.b - GROUND.b));
}
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`);
const mark = await sharp(px, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .composite([{ input: mask, blend: "dest-in" }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(OUT, "mark-112@2x.png"), mark);
console.log(`mark-112@2x.png ${SIZE}x${SIZE} ${mark.length} bytes`);
