// gen:startup-images: writes `public/startup/<w>x<h>@<ratio>x.png` for every screen in `src/lib/pwa/startup-images.ts`: the
// icon (`src/app/icon.svg`) at 128 points, centred on the manifest's ground. Pure file work: no network, no database, no
// `.env`. Run it after the table or the icon's art changes, and commit the PNGs; nothing regenerates them at build time.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { STARTUP_ICON_POINTS, STARTUP_SCREENS, startupPath, startupPixels } from "../src/lib/pwa/startup-images";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// `icon.svg` is drawn on the ground itself, so the picture is seamless; the ground is also the canvas colour.
const GROUND = "#14110E";
const svg = readFileSync(join(ROOT, "src/app/icon.svg"));

mkdirSync(join(ROOT, "public/startup"), { recursive: true });
for (const screen of STARTUP_SCREENS) {
  const { width, height } = startupPixels(screen);
  const side = STARTUP_ICON_POINTS * screen.ratio;
  // `density` scales the SVG's 64 px so the rasteriser draws it at the target size rather than resampling a small bitmap.
  const icon = await sharp(svg, { density: (72 * side) / 64 }).resize(side, side).png().toBuffer();
  const png = await sharp({ create: { width, height, channels: 3, background: GROUND } })
    .composite([{ input: icon, left: Math.round((width - side) / 2), top: Math.round((height - side) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(ROOT, "public", startupPath(screen)), png);
  console.log(`${startupPath(screen)} ${width}x${height} ${png.length} bytes`);
}
