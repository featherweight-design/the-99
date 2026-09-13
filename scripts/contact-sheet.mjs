// The contact sheet: every route a feature touches, at both widths, in one image.
//
// NOT a probe. A probe is written by whoever wrote the feature and asserts what
// they believed; this asserts nothing ABOUT THE PIXELS. It loads each surface,
// photographs it, and lays the photographs out so a person can see in one glance
// that a route never got the feature, or that the phone is wrong while the desktop
// is right — the two failures a diff and a per-PR review structurally cannot show.
//
// It does report one thing mechanically, in its exit code: whether every cell was
// REACHED. A row whose steps time out produces no evidence either way, and a sheet
// with a hole in it that exits 0 would be the same quiet pass this artifact exists
// to prevent. Reaching a surface is not a judgement about how it looks.
//
// One script for the repository, not one per feature: the feature supplies its
// inventory as JSON, this walks it.
//
//   node scripts/contact-sheet.mjs docs/superpowers/inventories/<feature>.json
//
// A route that needs an id writes it as `${SOME_VAR}` and takes it from the
// environment, so no inventory carries one account's ids.
//
// Needs the dev server up and a signed-in session: PROBE_BASE selects the server.
// Writes PNGs plus `sheet.png` into the inventory's `out` directory.
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
// Optional, exactly as `audit-sweep.mjs` has it: a `+clerk_test` address takes the
// code path below and has no password to give, which is how the local dev instance
// is actually set up.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const inventoryPath = process.argv[2];
if (!inventoryPath) throw new Error("Pass the inventory JSON path.");
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
// Relative to the repository by default, so the command in a checked-in inventory
// runs the same way on anyone's machine. An absolute `out` still wins, for a run
// that wants to write somewhere specific.
const outDir = path.resolve(process.cwd(), inventory.out ?? `contact-sheets/${path.basename(inventoryPath, ".json")}`);
await mkdir(outDir, { recursive: true });

const WIDTHS = inventory.widths ?? [
  { label: "phone", width: 390, height: 844 },
  { label: "desktop", width: 1300, height: 900 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/**
 * A row's `steps` are plain Playwright verbs, so a surface that needs three clicks
 * to reach is still one row of the inventory rather than a new script.
 *
 * Give every `goto` a `wait` naming something the finished page has. `settle` is a
 * delay, not a readiness check: a slow route still renders its loading state for
 * the first second, and a sheet that photographs skeletons reports success while
 * showing nothing.
 */
async function run(page, steps) {
  for (const step of steps ?? []) {
    if (step.goto) {
      // `${VAR}` in a path comes from the environment, so an inventory can name a
      // route that needs an id without committing one account's id to the
      // repository — where it would 404 on anybody else's data.
      const url = step.goto.replace(/\$\{(\w+)\}/g, (_, name) => {
        const value = process.env[name];
        if (!value) throw new Error(`${step.goto} needs ${name} in the environment`);
        return value;
      });
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    }
    if (step.click) await page.locator(step.click).first().click({ timeout: 15_000 });
    if (step.clickRole) {
      await page.getByRole(step.clickRole, { name: new RegExp(step.name) }).first().click({ timeout: 15_000 });
    }
    // A field a surface only reaches its interesting state through typing — the
    // set panel narrows its list as you type, and an empty field shows every set.
    if (step.fill !== undefined) {
      await page.locator(step.fill).first().fill(step.text ?? "", { timeout: 15_000 });
    }
    if (step.wait) await page.waitForSelector(step.wait, { timeout: 15_000 });
    if (step.settle) await page.waitForTimeout(step.settle);
  }
}

const shots = [];
const browser = await chromium.launch();
try {
  await clerkSetup();
  for (const size of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await signIn(page);
    for (const row of inventory.rows) {
      // A surface that only EXISTS at one width says so, and the other width is
      // not a failed cell. `/collection`'s filter sheet is the case: below 1000px
      // the route draws a sheet, above it a row of popovers, and clicking
      // `Filter cards` at 1300 times out because there is no such control — which
      // is the routes behaving, not a gap. Without this the run reports a failure
      // and exits 1 on a feature that is entirely correct, and a red cell nobody
      // can act on is worse than no cell.
      if (Array.isArray(row.widths) && !row.widths.includes(size.label)) {
        console.log(`· ${row.id} · ${size.label} — not drawn at this width`);
        continue;
      }
      const file = path.join(outDir, `${row.id}-${size.label}.png`);
      let note = "";
      try {
        await run(page, row.steps);
        await page.screenshot({ path: file });
      } catch (error) {
        note = String(error).split("\n")[0].slice(0, 120);
        await page.screenshot({ path: file }).catch(() => {});
      }
      shots.push({ id: row.id, label: row.label, size: size.label, file, note });
      console.log(`${note ? "✗" : "✓"} ${row.id} · ${size.label}${note ? ` — ${note}` : ""}`);
    }
    await context.close();
  }

  // The sheet itself: a page of the photographs, screenshotted. No image library,
  // nothing to install, and the montage is a real file that can be attached.
  const sheetPage = await (await browser.newContext({
    viewport: { width: 1800, height: 1200 },
  })).newPage();
  // Inlined as data URIs rather than linked with `file://`: the sheet is built on
  // `about:blank`, which is a different origin, and every image came out blank.
  const cards = await Promise.all(shots.map(async (s) => {
    const data = await readFile(s.file).then((b) => b.toString("base64")).catch(() => null);
    const img = data
      ? `<img src="data:image/png;base64,${data}" />`
      : `<div class="missing">no screenshot</div>`;
    return `
    <figure>
      ${img}
      <figcaption>${s.label} · ${s.size}${s.note ? ` <b>— ${s.note}</b>` : ""}</figcaption>
    </figure>`;
  })).then((x) => x.join(""));
  await sheetPage.setContent(`
    <style>
      body { background: #14110E; color: #EDE6D8; font: 13px/1.4 ui-sans-serif, system-ui; margin: 0; padding: 20px; }
      h1 { font-size: 16px; margin: 0 0 14px; }
      .grid { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
      figure { margin: 0; width: 420px; }
      img { width: 100%; border: 1px solid #3A3229; display: block; }
      figcaption { padding-top: 6px; color: #A89B84; }
      .missing { height: 200px; display: grid; place-items: center; border: 1px dashed #6E6654; color: #6E6654; }
      b { color: #E8927C; }
    </style>
    <h1>${inventory.feature} — every route, both widths</h1>
    <div class="grid">${cards}</div>
  `);
  await sheetPage.waitForTimeout(600);
  const sheet = path.join(outDir, "sheet.png");
  await sheetPage.screenshot({ path: sheet, fullPage: true });
  console.log(`\nsheet: ${sheet}`);
  const failed = shots.filter((s) => s.note);
  if (failed.length) {
    console.log(
      `\n${failed.length} of ${shots.length} cells did not reach their surface.`
        + " The sheet is still written; those cells have no evidence in them.",
    );
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
