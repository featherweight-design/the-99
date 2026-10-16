// A clip for Chromium's fake camera (`--use-file-for-fake-video-capture`): one still scene, written as an MJPEG file,
// which is JPEG frames laid end to end. The scanner opens its viewfinder on whatever this shows, so a contact sheet
// can photograph the outline with a card anywhere in the picture, or with none, without a person holding one up.
//
// A scene is `{ w, h }` of an empty playmat, or `{ w, h, card, share, cx, cy, angle }`: the named card (Scryfall's
// image) covering `share` of the picture, centred at (`cx`, `cy`) as shares of its width and height, turned `angle` degrees.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const UA = { "User-Agent": "the-99-contact-sheet/1.0", Accept: "application/json" };

async function cardImage(name) {
  const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`, { headers: UA });
  const card = await res.json();
  const uri = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  if (!uri) throw new Error(`fake camera: Scryfall has no image for ${name}`);
  const bytes = Buffer.from(await (await fetch(uri, { headers: UA })).arrayBuffer());
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

/** Writes the clip for `scene` into `dir` and returns its path. */
export async function writeFakeCamera(scene, dir, id) {
  const img = scene.card ? await cardImage(scene.card) : null;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: scene.w, height: scene.h } });
    await page.setContent(`<body style="margin:0;background:#2c3a2f"><canvas id=c width=${scene.w} height=${scene.h}></canvas></body>`);
    await page.evaluate(async ({ s, img }) => {
      const g = document.getElementById("c").getContext("2d");
      g.fillStyle = "#2c3a2f";
      g.fillRect(0, 0, s.w, s.h);
      if (!img) return;
      const im = new Image();
      im.src = img;
      await im.decode();
      const ratio = im.width / im.height;
      const ch = Math.sqrt((s.share * s.w * s.h) / ratio);
      g.translate(s.cx * s.w, s.cy * s.h);
      g.rotate(((s.angle ?? 0) * Math.PI) / 180);
      g.drawImage(im, (-ch * ratio) / 2, -ch / 2, ch * ratio, ch);
    }, { s: scene, img });
    const jpeg = await page.screenshot({ type: "jpeg", quality: 92 });
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${id}.mjpeg`);
    await writeFile(file, Buffer.concat(Array.from({ length: 30 }, () => jpeg)));
    return file;
  } finally {
    await browser.close();
  }
}

/** Chromium's flags for a camera that plays `file`, with the permission asked for granted. */
export const fakeCameraArgs = (file) => [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-video-capture=${file}`,
];
