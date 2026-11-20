// gen:email-images: writes the static PNGs the app's emails point at, into `public/email/`. No database and no `.env`. The mark
// and the plain hand are pure file work; the launch email's five images read the network ONCE, here (Scryfall's API for the
// fan's cards, the public production landing for the three captures), so the email itself never calls Scryfall. Run it after
// the icon, the landing or the fan changes, and commit the PNGs; nothing regenerates them at build time. `--launch-only` writes
// just the five launch images. `design/` is reference only (`art/` holds the drawn versions to compare against); nothing here
// reads or copies from it.
//
//   mark-112@2x.png: the 99 tile (`public/icons/icon-512.png`) at 224 px, its three diamonds recoloured from the icon's copper to
//   the emails' brass (#C9A24B), with the corners rounded in the PNG itself so a client that ignores `border-radius` still draws
//   a tile.
//   invite-hero-plain@2x.png: the invite email's PLAIN hand (560x540, transparent): the same `next/og` component the hand route draws,
//   with no sender's face, so the two never drift. Drawn here once and committed; the email points at it when the sender has no art.
//   launch-fan@2x.png: the launch email's hero (1040x560, transparent, shown 520x280): Giada, Jace, Y'shtola and Tam as full
//   cards (Scryfall `normal` images, fetched once per run) fanned at 12 and 24 degrees either side of The 99's card back reading
//   NOW OPEN, in the brass glow. Drawn by Playwright from HTML built here, set in the app's own Cinzel and IBM Plex Mono files.
//   feature-commanders@2x.png, feature-tune@2x.png, feature-written@2x.png, feature-credits@2x.png: the launch email's four
//   feature pictures (480 wide, shown 320), shot at 2x from the public landing (https://the-99.dev/, read only, phone width) and
//   cropped so none repeats the words beside it: the hero phone's two commander tiles (art, rank, fit), Suggested changes'
//   example and Tam's read without its link. The fourth, the value card with only the 15 and +1 rows, is DRAWN here in the
//   landing's style (`creditsHtml`), since its "+1 free credit every day" row is not on the shipped card.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import { chromium, type Page } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { HAND_SIZE, InviteHand } from "../src/components/email/invite-hand-image";
import { Icon } from "../src/components/landing/icons";
import { ogFonts } from "../src/lib/og/fonts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/email");
const BRASS = { r: 0xc9, g: 0xa2, b: 0x4b };
const SIZE = 224;
/** The tile's corner radius as a share of its side (the app icon's, read off the drawn reference: about 23%). */
const RADIUS = Math.round(SIZE * 0.23);
const launchOnly = process.argv.includes("--launch-only");

mkdirSync(OUT, { recursive: true });

function write(name: string, png: Buffer, width: number, height: number) {
  writeFileSync(join(OUT, name), png);
  console.log(`${name} ${width}x${height} ${png.length} bytes`);
}

async function markAndHand() {
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
  write("mark-112@2x.png", mark, SIZE, SIZE);

  const hand = await new ImageResponse(InviteHand({ face: null }), { ...HAND_SIZE, fonts: await ogFonts() }).arrayBuffer();
  write("invite-hero-plain@2x.png", Buffer.from(hand), HAND_SIZE.width, HAND_SIZE.height);
}

// ---------------------------------------------------------------------------------------------------------------------------
// The launch email's five images.

const UA = { "User-Agent": "the99-gen-email-images/1.0", Accept: "application/json" };
const LANDING = "https://the-99.dev/";

/** The fan's cards in paint order, each with its tilt and drop. Two are pinned to the printing the drawn reference shows:
 *  Giada's borderless Foundations Jumpstart print and Tam's borderless Aetherdrift print (the lightning art; Tam is "Tam, the
 *  Possibility", the Tam the landing draws). Jace and Y'shtola are Scryfall's default printing. */
const FAN: { name: string; print?: [set: string, number: string]; transform: string }[] = [
  { name: "Giada, Font of Hope", print: ["fdc", "4"], transform: "rotate(-24deg) translateY(14px)" },
  { name: "Jace, Multiverse Architect", transform: "rotate(-12deg) translateY(2px)" },
  { name: "Tam, the Possibility", print: ["fra", "317"], transform: "rotate(24deg) translateY(14px)" },
  { name: "Y'shtola, Night's Blessed", transform: "rotate(12deg) translateY(2px)" },
];

async function cardImage(name: string, print?: [string, string]): Promise<string> {
  const url = print
    ? `https://api.scryfall.com/cards/${print.map(encodeURIComponent).join("/")}`
    : `https://api.scryfall.com/cards/named?${new URLSearchParams({ exact: name })}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`Scryfall ${name}: ${res.status}`);
  const card = (await res.json()) as { name?: string; image_uris?: { normal?: string } };
  if (card.name !== name) throw new Error(`Scryfall: asked for ${name}, got ${card.name}`);
  const uri = card.image_uris?.normal;
  if (!uri) throw new Error(`Scryfall ${name}: no normal image`);
  const img = await fetch(uri, { headers: { "User-Agent": UA["User-Agent"], Accept: "image/*" } });
  if (!img.ok) throw new Error(`Scryfall image ${name}: ${img.status}`);
  console.log(`  fetched ${name}${print ? ` (${print.join(" ")})` : ""}`);
  return `data:image/jpeg;base64,${Buffer.from(await img.arrayBuffer()).toString("base64")}`;
}

const fontFace = (family: string, file: string, weight: string) =>
  `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(join(ROOT, "src/app/fonts", file)).toString("base64")}) format('woff2')}`;

async function fanHtml(): Promise<string> {
  const cards: string[] = [];
  // One at a time: Scryfall asks for a short gap between calls, and four sequential round trips give it.
  for (const c of FAN) cards.push(`<img class="c" src="${await cardImage(c.name, c.print)}" style="transform:${c.transform}">`);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFace("Cinzel", "cinzel-variable.woff2", "400 900")}
${fontFace("IBM Plex Mono", "ibm-plex-mono-500.woff2", "500")}
html,body{margin:0;background:transparent}
.st{position:relative;width:1040px;height:560px;overflow:hidden}
.glow{position:absolute;left:170px;top:-40px;width:700px;height:640px;background:radial-gradient(closest-side,rgba(201,162,75,.45),rgba(201,162,75,.12) 60%,rgba(201,162,75,0))}
.c{position:absolute;left:405px;top:96px;width:230px;height:321px;border-radius:12px;transform-origin:50% 160%;box-shadow:0 14px 30px rgba(0,0,0,.5)}
img.c{object-fit:cover}
.b{background:#14110E;padding:10px;box-sizing:border-box;box-shadow:0 18px 36px rgba(0,0,0,.55),inset 0 0 0 2px #3A3229}
.in{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;width:100%;height:100%;border-radius:8px;border:2px solid #4A4035;box-sizing:border-box;background:radial-gradient(circle at 50% 46%,rgba(201,162,75,.3),rgba(30,26,21,0) 72%),#1E1A15}
.n{display:flex;flex-direction:column;align-items:center;color:#EDE6D8;font:700 64px/1 'Cinzel',serif}
.cr{display:flex;align-items:center;gap:16px;margin-bottom:14px}.d{background:#C9A24B;transform:rotate(45deg)}
.wd{font:500 14px 'IBM Plex Mono',monospace;letter-spacing:.35em;color:#C9A24B;padding-left:.35em}
</style></head><body><div class="st"><div class="glow"></div>
${cards.join("\n")}
<div class="c b" style="transform:translateY(-18px)"><div class="in"><div class="n"><div class="cr"><div class="d" style="width:13px;height:13px"></div><div class="d" style="width:18px;height:18px"></div><div class="d" style="width:13px;height:13px"></div></div><div>99</div></div><div class="wd">NOW OPEN</div></div></div>
</div></body></html>`;
}

/** Each capture is drawn at 2x and then scaled to the email's 480 wide, its height the reference's (`art/feature-*@2x.png`). */
const FEATURE = { commanders: 475, tune: 211, written: 340, credits: 233 } as const;
const FEATURE_W = 480;

/** Every ancestor of the marked element made see-through and unclipped, so the capture carries only the element itself. */
async function isolate(page: Page) {
  await page.evaluate(() => {
    let e = document.querySelector("[data-gen-capture]")?.parentElement ?? null;
    while (e) {
      e.style.background = "transparent";
      e.style.overflow = "visible";
      e.style.boxShadow = "none";
      e = e.parentElement;
    }
    document.documentElement.style.background = "transparent";
  });
}

/** Scales a 2x drawing to 480 wide. A height within a few pixels of the reference's is cut or padded (transparent) at the
 *  bottom edge to meet it exactly; a bigger difference keeps the drawn height and says so, since cutting it would lose words
 *  and stretching it would distort them. */
async function fitAndWrite(raw: Buffer, name: string, height: number) {
  const scaled = await sharp(raw).resize({ width: FEATURE_W }).png().toBuffer({ resolveWithObject: true });
  const drawn = scaled.info.height;
  let out = sharp(scaled.data);
  let h = drawn;
  if (drawn > height && drawn - height <= 4) [out, h] = [out.extract({ left: 0, top: 0, width: FEATURE_W, height }), height];
  else if (drawn < height && height - drawn <= 4) [out, h] = [out.extend({ bottom: height - drawn, background: { r: 0, g: 0, b: 0, alpha: 0 } }), height];
  else if (drawn !== height) console.warn(`  ${name}: drawn ${FEATURE_W}x${drawn}, the reference is ${FEATURE_W}x${height}; kept as drawn`);
  write(name, await out.png({ compressionLevel: 9 }).toBuffer(), FEATURE_W, h);
}

/** Shoots the marked element (transparent outside it) and writes it through `fitAndWrite`. */
async function shoot(page: Page, name: string, height: number) {
  await isolate(page);
  const el = page.locator("[data-gen-capture]");
  await el.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  await fitAndWrite(await el.screenshot({ omitBackground: true, animations: "disabled" }), name, height);
  await page.evaluate(() => document.querySelector("[data-gen-capture]")?.removeAttribute("data-gen-capture"));
}

/**
 * The credits picture, DRAWN here rather than shot: the landing's value card in its dark-theme colours, sizes and faces (the
 * gift and sun tiles from the landing's own `Icon`), holding only the welcome row and a "+1 free credit every day" row, with
 * room around them (30/34 padding, 20 gap, 390 wide). The words are the launch email's, which the shipped card does not
 * carry (its daily row reads "1 free credit a day"), so a capture could not draw them.
 */
function creditsHtml(): string {
  const icon = (name: "gift" | "sun", size: number) => renderToStaticMarkup(createElement(Icon, { name, size }));
  const ACCENT = "rgb(207,135,69)";
  const ACCENT_LINE = "oklab(0.522 0.035 0.066)";
  const ACCENT_WASH = "oklab(0.685 0.058 0.105 / 0.12)";
  const FG = "rgb(237,230,216)";
  const MUTED = "rgb(165,156,137)";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFace("Plex Sans", "ibm-plex-sans-variable.woff2", "100 700")}
${fontFace("Plex Mono", "ibm-plex-mono-600.woff2", "600")}
html,body{margin:0;background:transparent}
#card{margin:2px;box-sizing:border-box;width:390px;display:flex;flex-direction:column;gap:20px;padding:30px 34px;border-radius:16px;
  border:1px solid ${ACCENT_LINE};background:radial-gradient(500px 220px at 0% 0%,${ACCENT_WASH},transparent 70%),rgb(33,29,24);
  font-family:'Plex Sans',sans-serif;color:${FG}}
.row{display:flex;align-items:center;gap:10px}
.row+.row{border-top:1px solid rgb(43,36,27);padding-top:14px}
.tile{display:flex;flex:none;align-items:center;justify-content:center;box-sizing:border-box;border-radius:12px}
.gift{width:46px;height:46px;border:1px solid ${ACCENT_LINE};background:${ACCENT_WASH};color:${ACCENT}}
.sun{width:38px;height:38px;border:1px solid rgb(58,50,41);background:rgb(27,23,18);color:${FG}}
b{font-family:'Plex Mono',monospace;font-weight:600;line-height:1}
.big{font-size:52px;letter-spacing:-0.02em;color:${ACCENT}}
.plus{font-size:30px;color:${FG}}
.say{font-weight:600;line-height:1.3}
small{display:block;margin-top:2px;font-size:12.5px;font-weight:400;color:${MUTED}}
</style></head><body><div id="card">
<div class="row"><span class="tile gift">${icon("gift", 24)}</span><b class="big">15</b><span class="say" style="font-size:16px">welcome credits<small>when you join, for 30 days</small></span></div>
<div class="row"><span class="tile sun">${icon("sun", 20)}</span><b class="plus">+1</b><span class="say" style="font-size:15px">free credit every day<small>for as long as you’re a member</small></span></div>
</div></body></html>`;
}

async function freshLanding(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 390, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
    userAgent: UA["User-Agent"],
  });
  await page.goto(LANDING, { waitUntil: "networkidle" });
  return page;
}

async function launchImages() {
  const browser = await chromium.launch();
  try {
    const fan = await browser.newPage({ viewport: { width: 1040, height: 560 } });
    await fan.setContent(await fanHtml(), { waitUntil: "load" });
    await fan.evaluate(() => document.fonts.ready);
    const fanPng = await sharp(await fan.screenshot({ omitBackground: true })).png({ compressionLevel: 9 }).toBuffer();
    write("launch-fan@2x.png", fanPng, 1040, 560);

    // The commander tiles: the hero phone's two rows, their reads, the tabs and the title hidden. The phone draws its screen at
    // `zoom`; it is set so the two tiles and the gap between them come to the reference's 240x237.5 (one tile 152 units of
    // art and border, the gap 10: 314 units, plus about 1.5px of borders that round up rather than zoom), and the frame widened
    // so a tile is 240 wide.
    const page = await freshLanding(browser);
    const ok = await page.evaluate(() => {
      const phone = document.querySelector<HTMLElement>("[data-testid=landing-phone]");
      const screen = phone?.firstElementChild as HTMLElement | null;
      if (!phone || !screen) return false;
      const rows = [...screen.children].filter((c) => c.tagName === "DIV" && c.querySelector("p")) as HTMLElement[];
      if (rows.length < 2) return false;
      const z = 236 / 314;
      for (const k of [...screen.children] as HTMLElement[]) if (!rows.includes(k)) k.style.display = "none";
      for (const r of rows) r.querySelector("p")!.style.display = "none";
      screen.style.zoom = String(z);
      screen.style.padding = "0";
      screen.style.width = `${240 / z}px`;
      phone.style.width = "auto";
      phone.style.height = "auto";
      phone.style.border = "0";
      phone.style.borderRadius = "0";
      phone.style.transform = "none";
      phone.style.background = "transparent";
      screen.setAttribute("data-gen-capture", "");
      return true;
    });
    if (!ok) throw new Error("landing: the hero phone's two commander rows were not found");
    await shoot(page, "feature-commanders@2x.png", FEATURE.commanders);

    // Suggested changes: its ⓘ opens the tip in the list's flow at phone width; the capture is the tip's example only.
    await page.getByRole("button", { name: "What is Suggested changes?" }).click();
    const tip = page.locator("[id]").filter({ hasText: "What you get" }).last();
    await tip.waitFor();
    const found = await page.evaluate(() => {
      const label = [...document.querySelectorAll("span")].find((s) => s.textContent?.trim().toLowerCase() === "what you get");
      const preview = label?.parentElement;
      if (!preview || !preview.textContent?.includes("Chaos Warp")) return false;
      preview.style.borderTop = "0";
      preview.setAttribute("data-gen-capture", "");
      return true;
    });
    if (!found) throw new Error("landing: Suggested changes' example was not found");
    await shoot(page, "feature-tune@2x.png", FEATURE.tune);

    // Tam's read: the Written for real card for Tam, the Possibility, its "Open its page" link hidden.
    const tam = await page.evaluate(() => {
      const card = [...document.querySelectorAll("[data-testid=landing-written] article")].find((a) => a.querySelector("h3")?.textContent?.startsWith("Tam")) as HTMLElement | undefined;
      if (!card) return false;
      card.querySelectorAll("a").forEach((a) => (a.style.display = "none"));
      card.setAttribute("data-gen-capture", "");
      return true;
    });
    if (!tam) throw new Error("landing: Tam's card in Written for real was not found");
    await shoot(page, "feature-written@2x.png", FEATURE.written);
    await page.close();

    // The value card, drawn (see `creditsHtml`), shot with 2px of room on every side as the reference is.
    const credits = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 2 });
    await credits.setContent(creditsHtml(), { waitUntil: "load" });
    await credits.evaluate(() => document.fonts.ready);
    const card = (await credits.locator("#card").boundingBox())!;
    const clip = { x: card.x - 2, y: card.y - 2, width: card.width + 4, height: card.height + 4 };
    await fitAndWrite(await credits.screenshot({ omitBackground: true, clip }), "feature-credits@2x.png", FEATURE.credits);
    await credits.close();
  } finally {
    await browser.close();
  }
}

if (!launchOnly) await markAndHand();
await launchImages();
