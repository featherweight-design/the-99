// One image of every route this app draws a filter frame on, at both widths.
//
// NOT a probe. It asserts nothing, has no baseline, and nothing about it can be
// approved or go stale — it loads each page and writes a picture. That is
// deliberate: a probe is written by whoever wrote the code, so it asserts what
// that author already believed. `probe-decks-chassis.mjs` absorbed nine review
// findings and still only ever loaded `/decks`, which is exactly how the filter
// chassis shipped with two routes drawing the old colour control and
// `/collection`'s phone form hiding three of its five dimensions off-screen.
// Neither gap is visible in a diff: one is an absence, and the other is two
// individually-plausible halves.
//
// Add a row here when a feature claims a new surface. Then look at the sheet.
//
//   node scripts/contact-sheet.mjs
//   node scripts/contact-sheet.mjs --out /tmp/sheet     # default: .artifacts/
//
// Writes one PNG per route×width plus `contact-sheet.html`, which tiles them at
// a readable size for a PR body or a close-out walk. HTML rather than a montage
// binary so this needs no ImageMagick and no native dependency.
import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { requireEnv } from "./lib/env.mjs";
import { signIn as clerkSignIn } from "./lib/clerk-sign-in.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const outFlag = process.argv.indexOf("--out");
const OUT = outFlag === -1 ? ".artifacts" : process.argv[outFlag + 1];

/**
 * The route inventory. One row per surface the filter chassis claims — which is
 * the same list the plan carries, so the two cannot drift.
 *
 * `/decks` is the origin: every other row's phone form is supposed to be the
 * treatment it drew first.
 */
const ROUTES = [
  { name: "decks", path: "/decks" },
  { name: "commanders", path: "/commanders" },
  { name: "discover", path: "/discover" },
  { name: "collection", path: "/collection" },
  { name: "collection-sets", path: "/collection/sets" },
];

/** 390 is the phone the design draws; 1300 is past the chassis's 1000 switch. */
const WIDTHS = [
  { name: "390", width: 390, height: 900 },
  { name: "1300", width: 1300, height: 900 },
];

const page0 = await (async () => {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: WIDTHS[1] });
  const page = await context.newPage();
  await clerkSignIn(page, { base: BASE, email: EMAIL, password: PASSWORD });
  return { browser, context, page };
})();

await mkdir(OUT, { recursive: true });
const shots = [];

for (const width of WIDTHS) {
  await page0.page.setViewportSize({ width: width.width, height: width.height });
  for (const route of ROUTES) {
    const file = `${route.name}-${width.name}.png`;
    await page0.page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    // The frame streams behind a loading boundary on several of these routes,
    // so a screenshot taken on `networkidle` alone can catch the skeleton.
    await page0.page
      .waitForSelector("[data-chassis-row='controls']", { timeout: 10_000 })
      .catch(() => {});
    await page0.page.screenshot({ path: `${OUT}/${file}` });
    shots.push({ route: route.name, path: route.path, width: width.name, file });
    process.stdout.write(`${route.path} @ ${width.name}\n`);
  }
}

await page0.browser.close();

const rows = ROUTES.map((route) => {
  const cells = WIDTHS.map((w) => {
    const shot = shots.find((s) => s.route === route.name && s.width === w.name);
    return `<figure><figcaption>${route.path} · ${w.name}px</figcaption>
      <img src="${shot.file}" alt="${route.path} at ${w.name}px"></figure>`;
  }).join("");
  return `<section>${cells}</section>`;
}).join("\n");

await writeFile(
  `${OUT}/contact-sheet.html`,
  `<!doctype html><meta charset="utf-8"><title>Contact sheet</title>
<style>
  body { background:#111; color:#eee; font:13px system-ui; margin:20px; }
  section { display:flex; gap:16px; align-items:flex-start; margin-bottom:24px; }
  figure { margin:0; }
  figcaption { margin-bottom:6px; opacity:.75; }
  img { max-height:520px; border:1px solid #444; display:block; }
</style>
<h1>Filter chassis — every route, both widths</h1>
${rows}
`,
  "utf8",
);

process.stdout.write(`\nwrote ${shots.length} shots to ${OUT}/contact-sheet.html\n`);
